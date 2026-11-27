// Independent provider package. Credentials and networking are supplied by the host.
// Paraşüt API v4 (devhub.parasut.com/api-dokumantasyonu, OpenAPI 4.1.0):
//  · Yetki: OAuth2 Authorization Code + PKCE (id.parasut.com). Anahtarı sistem alır ve yeniler; modüle geçerli erişim anahtarı
//    (accessToken) gelir. Eski kurulumlarda (bağlanmamış, kullanıcı adı / parola kayıtlı) eski parola akışı denenir.
//  · Fatura: müşteri (contacts; vergi numarasıyla aranır, yoksa açılır) → satış faturası (sales_invoices; external_reference_key ile
//    aynı sipariş için ikinci fatura açılmaz, 422'de var olan fatura kullanılır) → e-belge: alıcı e-fatura mükellefiyse e-Fatura
//    (e_invoice_inbox_checks ile posta kutusu bulunur; e_invoices, senaryo TEMEL), değilse e-Arşiv (e_archives, internet satışı bilgisiyle).
//    E-belge işi (trackable_jobs) sonuçlanana kadar beklenir; hata verirse hata iletisi döner.
//  · İade: gider tarafında "İade" türlü kayıt (purchase_bills, item_type refund).
export type ModuleHost={configuration():Promise<ParasutConfig>;request(url:string,init?:RequestInit):Promise<Response>};
type ParasutConfig={clientId:string;clientSecret:string;companyId:string;accessToken?:string;username?:string;password?:string};
export default function createModule(host:ModuleHost){
const fetch=(url:string,init?:RequestInit)=>host.request(url,init);

type BillingParty={
 taxIdType:"INDIVIDUAL"|"CORPORATE";
 taxId:string;
 taxOffice?:string|null;
 legalName:string;
 email:string;
 address:string;
 city:string;
};

type InvoiceLine={name:string;quantity:number;unitPriceMicros:number;vatRate?:number};

type CreateInvoiceInput={
 buyer:BillingParty;
 lines:InvoiceLine[];
 note?:string;
 reference?:string;
 sale?:{url?:string;method?:string|null;date?:string};
};

type CreateInvoiceResult={providerInvoiceId:string;invoiceNumber?:string;pdfUrl?:string};
// İade faturası (satıştan iade): asıl faturaya bağlanan, iade edilen tutar kadar belge.
type CreateReturnInvoiceInput=CreateInvoiceInput&{original:{providerInvoiceId:string;invoiceNumber?:string|null;issueDate?:string|null};reason?:string};
type CreateReturnInvoiceResult={providerReturnId:string;documentNumber?:string;pdfUrl?:string};

class EinvoiceError extends Error{}

const BASE="https://api.parasut.com/v4";
const CONSUMER="11111111111";
type Doc={id?:string;type?:string;attributes?:Record<string,unknown>;relationships?:Record<string,{data?:{id?:string;type?:string}|null}>};
type Body={data?:Doc|Doc[];included?:Doc[];errors?:{title?:string;detail?:string}[];meta?:Record<string,unknown>;error_description?:string};
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
const today=()=>new Date().toISOString().slice(0,10);
const errorOf=(body:Body,fallback:string)=>body.errors?.map(e=>e.detail||e.title).filter(Boolean).join(" ")||fallback;
const one=(body:Body)=>Array.isArray(body.data)?body.data[0]:body.data;

async function accessToken(config:ParasutConfig){
 if(config.accessToken)return config.accessToken;
 // Eski kurulum (Paraşüt'e Bağlan yapılmamış): parola akışı.
 if(!config.username||!config.password)throw new EinvoiceError("Paraşüt bağlı değil. Modüller › Paraşüt'te Paraşüt'e Bağlan'a basın.");
 const response=await fetch("https://api.parasut.com/oauth/token",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({grant_type:"password",client_id:config.clientId,client_secret:config.clientSecret,username:config.username,password:config.password,redirect_uri:"urn:ietf:wg:oauth:2.0:oob"}),signal:AbortSignal.timeout(15000)});
 const result=await response.json().catch(()=>({})) as {access_token?:string;error_description?:string};
 if(!response.ok||!result.access_token)throw new EinvoiceError(result.error_description||"Paraşüt oturumu açılamadı. Modüller › Paraşüt'te Paraşüt'e Bağlan'a basın.");
 return result.access_token;
}

// JSON:API istemcisi (application/vnd.api+json). 401: anahtar geçersiz; 429: istek sınırı.
function client(config:ParasutConfig,token:string){
 const headers={"content-type":"application/vnd.api+json",accept:"application/vnd.api+json",authorization:`Bearer ${token}`};
 return async(method:"GET"|"POST",path:string,data?:unknown,timeout=20000)=>{
  const response=await fetch(`${BASE}/${encodeURIComponent(config.companyId)}${path}`,{method,headers,...(data===undefined?{}:{body:JSON.stringify(data)}),signal:AbortSignal.timeout(timeout)});
  const body=await response.json().catch(()=>({})) as Body;
  if(response.status===401)throw new EinvoiceError("Paraşüt oturumu reddedildi. Modüller › Paraşüt'te Paraşüt'e Bağlan'a yeniden basın.");
  if(response.status===429)throw new EinvoiceError("Paraşüt istek sınırı doldu. Biraz sonra yeniden deneyin.");
  return {ok:response.ok,status:response.status,body};
 };
}
type Api=ReturnType<typeof client>;

// Müşteri: vergi numarasıyla aranır (nihai tüketicide e-posta da eşleşmeli; herkes aynı numarayı taşır), yoksa açılır.
async function findOrCreateContact(api:Api,buyer:BillingParty,accountType:"customer"|"supplier"="customer"){
 const filter=new URLSearchParams({"filter[tax_number]":buyer.taxId,"page[size]":"1"});
 if(buyer.taxId===CONSUMER){if(buyer.email)filter.set("filter[email]",buyer.email);else filter.set("filter[name]",buyer.legalName)}
 const search=await api("GET",`/contacts?${filter.toString()}`,undefined,15000);
 const found=one(search.body);
 if(search.ok&&found?.id)return found.id;
 const created=await api("POST","/contacts",{data:{type:"contacts",attributes:{name:buyer.legalName,email:buyer.email||undefined,contact_type:buyer.taxIdType==="CORPORATE"?"company":"person",account_type:accountType,tax_number:buyer.taxId,tax_office:buyer.taxOffice||undefined,address:buyer.address||undefined,city:buyer.city||undefined,country:"Türkiye",is_abroad:false}}},15000);
 const contact=one(created.body);
 if(!created.ok||!contact?.id)throw new EinvoiceError(errorOf(created.body,"Paraşüt müşteri kaydı oluşturulamadı."));
 return contact.id;
}

// Sistemdeki kaydın kimliğinden sabit UUID (external_reference_key UUID biçiminde olmalı): aynı kayıt hep aynı anahtarı üretir.
async function referenceKey(reference:string){
 const hex=[...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(`avelro:${reference}`)))].map(b=>b.toString(16).padStart(2,"0")).join("");
 return `${hex.slice(0,8)}-${hex.slice(8,12)}-5${hex.slice(13,16)}-${(8|parseInt(hex[16],16)&3).toString(16)}${hex.slice(17,20)}-${hex.slice(20,32)}`;
}

// E-Arşiv internet satışı: ödeme yöntemi Paraşüt'ün kodlarıyla.
const PLATFORM:Record<string,string>={STRIPE:"Stripe",SHOPIER:"Shopier",CRYPTOMUS:"Cryptomus",HELEKET:"Heleket"};
function internetSale(sale:CreateInvoiceInput["sale"]){
 if(!sale?.url)return undefined;
 const method=(sale.method||"").toUpperCase();
 const type=method==="BANK_TRANSFER"?"EFT/HAVALE":method==="STRIPE"||!method?"KREDIKARTI/BANKAKARTI":"ODEMEARACISI";
 return {url:sale.url,payment_type:type,...(PLATFORM[method]?{payment_platform:PLATFORM[method]}:{}),payment_date:sale.date||today()};
}

// Alıcının e-fatura posta kutusu (mükellef değilse boş: e-Arşiv kesilir).
async function inboxOf(api:Api,taxId:string){
 if(!taxId||taxId===CONSUMER)return null;
 const r=await api("GET",`/e_invoice_inbox_checks?${new URLSearchParams({tax_number:taxId,issue_date:today()}).toString()}`,undefined,15000);
 if(!r.ok)return null;
 const list=Array.isArray(r.body.data)?r.body.data:r.body.data?[r.body.data]:[];
 const address=list.map(x=>x.attributes?.e_invoice_address).find(a=>typeof a==="string"&&a);
 return typeof address==="string"?address:null;
}

// E-belge işi sonuçlanana kadar (en çok dört kez) bakılır; sürüyorsa fatura kesilmiş sayılır (Paraşüt işi kendisi tamamlar).
async function waitJob(api:Api,body:Body){
 const job=one(body);if(!job?.id)return;
 let status=String(job.attributes?.status||"running"),errors=job.attributes?.errors;
 for(const ms of [1500,2500,4000,6000]){
  if(status!=="running"&&status!=="pending")break;
  await sleep(ms);
  const r=await api("GET",`/trackable_jobs/${encodeURIComponent(job.id)}`,undefined,15000);
  const next=one(r.body);if(!r.ok||!next)break;
  status=String(next.attributes?.status||status);errors=next.attributes?.errors;
 }
 if(status==="error")throw new EinvoiceError(`Paraşüt e-belgeyi oluşturamadı: ${Array.isArray(errors)&&errors.length?errors.map(String).join(" "):"bilinmeyen hata"}`);
}

async function createParasutInvoice(config:ParasutConfig,input:CreateInvoiceInput):Promise<CreateInvoiceResult>{
 const api=client(config,await accessToken(config));
 const contactId=await findOrCreateContact(api,input.buyer),date=today();
 const attributes={item_type:"invoice",description:(input.note||"Sipariş Faturası").slice(0,255),issue_date:date,due_date:date,currency:"TRL",billing_address:input.buyer.address||undefined,tax_office:input.buyer.taxOffice||undefined,tax_number:input.buyer.taxId,city:input.buyer.city||undefined};
 const details=input.lines.map(line=>({type:"sales_invoice_details",attributes:{quantity:line.quantity,unit_price:line.unitPriceMicros/1e6,vat_rate:line.vatRate??20,description:line.name}}));
 const relationships:Record<string,unknown>={contact:{data:{id:contactId,type:"contacts"}},details:{data:details}};
 if(input.reference)relationships.external_reference_key={data:{type:"external_reference_keys",attributes:{key:await referenceKey(input.reference)}}};
 const created=await api("POST","/sales_invoices",{data:{type:"sales_invoices",attributes,relationships}});
 let invoice=one(created.body),invoiceId=invoice?.id;
 // Aynı kayıt için fatura önceden açılmış (yeniden deneme): var olan fatura kullanılır.
 const existing=created.body.meta?.sales_invoice_id;
 if(!created.ok&&created.status===422&&existing)invoiceId=String(existing);
 else if(!created.ok||!invoiceId)throw new EinvoiceError(errorOf(created.body,"Paraşüt faturası oluşturulamadı."));
 let edoc:Doc|undefined;
 if(!invoice||invoice.id!==invoiceId){const r=await api("GET",`/sales_invoices/${encodeURIComponent(invoiceId)}?include=active_e_document`);invoice=one(r.body);edoc=r.body.included?.find(x=>x.type==="e_invoices"||x.type==="e_archives")}
 if(!edoc){
  const to=await inboxOf(api,input.buyer.taxId);
  const sale=internetSale(input.sale);
  const request=to?{data:{type:"e_invoices",attributes:{scenario:"basic",to},relationships:{invoice:{data:{type:"sales_invoices",id:invoiceId}}}}}
   :{data:{type:"e_archives",attributes:sale?{internet_sale:sale}:{},relationships:{sales_invoice:{data:{type:"sales_invoices",id:invoiceId}}}}};
  const r=await api("POST",to?"/e_invoices":"/e_archives",request,30000);
  if(!r.ok)throw new EinvoiceError(errorOf(r.body,`Paraşüt ${to?"e-Fatura":"e-Arşiv"} belgesi oluşturulamadı.`));
  await waitJob(api,r.body);
  const after=await api("GET",`/sales_invoices/${encodeURIComponent(invoiceId)}?include=active_e_document`);
  if(after.ok){invoice=one(after.body)||invoice;edoc=after.body.included?.find(x=>x.type==="e_invoices"||x.type==="e_archives")}
 }
 const number=edoc?.attributes?.invoice_number||invoice?.attributes?.invoice_no;
 return {providerInvoiceId:invoiceId,...(typeof number==="string"&&number?{invoiceNumber:number}:{})};
}

// Satıştan iade: Paraşüt'te müşteriden gelen iade, gider tarafında "İade" türlü kayıt olarak tutulur (purchase_bills, item_type "refund";
// PurchaseBillDetailedForm: item_type, issue_date, due_date, currency, net_total, total_vat zorunlu). Müşteri tedarikçi olarak bağlanır;
// açıklamada asıl faturanın numarası yazar.
async function createParasutReturnInvoice(config:ParasutConfig,input:CreateReturnInvoiceInput):Promise<CreateReturnInvoiceResult>{
 const api=client(config,await accessToken(config));
 const contactId=await findOrCreateContact(api,input.buyer),date=today();
 const round=(n:number)=>Math.round(n*100)/100;
 const net=round(input.lines.reduce((s,l)=>s+l.quantity*l.unitPriceMicros/1e6,0)),vat=round(input.lines.reduce((s,l)=>s+l.quantity*l.unitPriceMicros/1e6*(l.vatRate??20)/100,0));
 const r=await api("POST","/purchase_bills",{data:{type:"purchase_bills",attributes:{item_type:"refund",description:(input.note||`${input.original.invoiceNumber||input.original.providerInvoiceId} numaralı faturanın iadesi`).slice(0,255),issue_date:date,due_date:date,currency:"TRL",net_total:net,total_vat:vat,...(input.original.invoiceNumber?{invoice_no:`IADE-${input.original.invoiceNumber}`}:{})},relationships:{supplier:{data:{id:contactId,type:"contacts"}},details:{data:input.lines.map(line=>({type:"purchase_bill_details",attributes:{quantity:line.quantity,unit_price:line.unitPriceMicros/1e6,vat_rate:line.vatRate??20,description:line.name}}))}}}});
 const bill=one(r.body);
 if(!r.ok||!bill?.id)throw new EinvoiceError(errorOf(r.body,"Paraşüt iade kaydı oluşturulamadı."));
 const number=bill.attributes?.invoice_no;
 return {providerReturnId:bill.id,...(typeof number==="string"&&number?{documentNumber:number}:{})};
}

// Bağlantı denemesi: erişim anahtarıyla firmanın kişi listesi okunur (firma numarası bu hesaba ait mi).
async function test(){
 const config=await host.configuration(),api=client(config,await accessToken(config));
 const r=await api("GET","/contacts?page[size]=1",undefined,15000);
 if(r.status===403||r.status===404)throw new EinvoiceError("Paraşüt oturumu açıldı ama Firma No bu hesaba ait değil.");
 if(!r.ok)throw new EinvoiceError(errorOf(r.body,`Paraşüt yanıt vermedi (HTTP ${r.status}).`));
 return {ok:true,message:"Bağlantı Çalışıyor."};
}

return {test,createInvoice: async (input:CreateInvoiceInput) => createParasutInvoice(await host.configuration(),input),createReturnInvoice: async (input:CreateReturnInvoiceInput) => createParasutReturnInvoice(await host.configuration(),input)};
}
