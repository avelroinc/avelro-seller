// Independent provider package. Credentials and networking are supplied by the host.
// Bizim Hesap B2B API (Bizim Hesap "Entegrasyon API Dökümanı"): fatura POST https://uygulama.bizimhesap.com/api/b2b/addinvoice (JSON, başlık
// gerekmez; firmId gövdede), iptal POST /api/b2b/cancelinvoice ({firmId,guid}). Cevap {error,guid,url,eInvoiceNo}: error doluysa hata, guid faturanın
// Bizim Hesap kimliği, url PDF bağlantısı. Gönderilen müşteri ve ürün Bizim Hesap'ta yoksa kendiliğinden oluşturulur.
export type ModuleHost={configuration():Promise<BizimHesapConfig>;request(url:string,init?:RequestInit):Promise<Response>};
// companyId: Bizim Hesap'ın verdiği firma kimliği (FirmId). apiKey: isteğe bağlı token (yalnızca liste servisleri için; fatura kesmede
// kullanılmaz). Eski kurulumlarda FirmId "API Anahtarı" alanına girilmiş olabilir: kimlik biçimindeki değer FirmId sayılır.
type BizimHesapConfig={apiKey?:string;companyId?:string;firmId?:string};
export default function createModule(host:ModuleHost){
const fetch=(url:string,init?:RequestInit)=>host.request(url,init);

type BillingParty={taxIdType:"INDIVIDUAL"|"CORPORATE";taxId:string;taxOffice?:string|null;legalName:string;email:string;address:string;city:string};
type InvoiceLine={name:string;quantity:number;unitPriceMicros:number;vatRate?:number};
type CreateInvoiceInput={buyer:BillingParty;lines:InvoiceLine[];note?:string};
type CreateInvoiceResult={providerInvoiceId:string;invoiceNumber?:string;pdfUrl?:string};
type CreateReturnInvoiceInput=CreateInvoiceInput&{original:{providerInvoiceId:string;invoiceNumber?:string|null;issueDate?:string|null};reason?:string};
type CreateReturnInvoiceResult={providerReturnId:string;documentNumber?:string;pdfUrl?:string};
class EinvoiceError extends Error{}

// bizimhesap.com/api isteklerini uygulama.bizimhesap.com'a yönlendirir (308); modül ağında yönlendirme izlenmediğinden doğrudan bu adres.
const BASE="https://uygulama.bizimhesap.com/api/b2b";
const looksId=(v?:string)=>Boolean(v&&/^[0-9A-Za-z-]{16,}$/.test(v.trim()));
function firmIdOf(config:BizimHesapConfig){
 const options=[config.firmId,config.companyId,config.apiKey].map(v=>(v||"").trim()).filter(Boolean);
 const id=options.find(v=>looksId(v))||options[0];
 if(!id)throw new EinvoiceError("Bizim Hesap Firma ID (FirmId) girilmemiş. Modüller › E-Fatura › BizimHesap ayarlarından girin.");
 return id;
}
// Tutarlar 2 ondalıklı metin (ör. "1200.00"); tarih Türkiye saatiyle ISO (ör. 2026-11-25T14:20:00+03:00).
const money=(v:number)=>(Math.round(v*100)/100).toFixed(2);
const trNow=()=>new Date(Date.now()+3*3600e3).toISOString().slice(0,19)+"+03:00";
// Satırda ürün kimliği gönderilmez: Bizim Hesap kimliği ürün kodu olarak açıklamanın başına yazıyordu ("sosyal-medya-hizmeti Sosyal
// Medya Hizmeti"); boş kimlikte faturada yalnızca hizmet adı görünür. slug yalnızca müşteri kimliği yedeğinde kullanılır.
const slug=(v:string)=>v.toLocaleLowerCase("tr-TR").replace(/ı/g,"i").replace(/ğ/g,"g").replace(/ü/g,"u").replace(/ş/g,"s").replace(/ö/g,"o").replace(/ç/g,"c").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,60)||"hizmet";
// Müşteri kimliği: e-posta (kişiye özel; nihai tüketici numarası 11111111111 herkes için aynı olduğundan kimlik olarak kullanılmaz).
const customerKey=(b:BillingParty)=>(b.email||"").trim().toLowerCase()||(b.taxIdType==="CORPORATE"?b.taxId:"")||slug(b.legalName);

function body(firmId:string,input:CreateInvoiceInput){
 const details=input.lines.map(line=>{const rate=line.vatRate??20,qty=line.quantity||1,unit=line.unitPriceMicros/1e6,gross=unit*qty,tax=gross*rate/100;
  return {productId:"",productName:line.name,note:"",barcode:"",taxRate:money(rate),quantity:qty,unitPrice:money(unit),grossPrice:money(gross),discount:"0.00",net:money(gross),tax:money(tax),total:money(gross+tax)}});
 const sum=(k:"net"|"tax"|"total")=>details.reduce((s,d)=>s+Number(d[k]),0),now=trNow(),b=input.buyer;
 return {firmId,invoiceType:3,note:input.note||"",dates:{invoiceDate:now,dueDate:now,deliveryDate:now},
  customer:{customerId:customerKey(b),title:b.legalName,taxOffice:b.taxIdType==="CORPORATE"?(b.taxOffice||""):"",taxNo:b.taxId,email:b.email||"",phone:"",address:[b.address,b.city].filter(Boolean).join(" ")},
  amounts:{currency:"TL",gross:money(sum("net")),discount:"0.00",net:money(sum("net")),tax:money(sum("tax")),total:money(sum("total"))},details};
}
async function post(path:string,payload:unknown){
 const response=await fetch(`${BASE}/${path}`,{method:"POST",headers:{"content-type":"application/json",accept:"application/json"},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)});
 const text=await response.text();let data:{error?:string;guid?:string;url?:string;eInvoiceNo?:string;status?:string|number}={};
 try{data=JSON.parse(text)}catch{if(!response.ok)throw new EinvoiceError(`Bizim Hesap yanıt vermedi (HTTP ${response.status}).`)}
 if(data.error)throw new EinvoiceError(`Bizim Hesap: ${data.error}`);
 if(!response.ok)throw new EinvoiceError(`Bizim Hesap isteği başarısız (HTTP ${response.status}).`);
 return data;
}

async function createBizimHesapInvoice(config:BizimHesapConfig,input:CreateInvoiceInput):Promise<CreateInvoiceResult>{
 const data=await post("addinvoice",body(firmIdOf(config),input));
 if(!data.guid)throw new EinvoiceError("Bizim Hesap faturayı kaydetmedi (fatura kimliği dönmedi).");
 return {providerInvoiceId:data.guid,invoiceNumber:data.eInvoiceNo||undefined,pdfUrl:data.url||undefined};
}

// İade: Bizim Hesap API'sinde satıştan iade belgesi yok (yalnızca satış 3 / alış 5 ve iptal). İade edilen tutar faturanın tamamıysa
// asıl fatura iptal edilir (cancelinvoice); kısmi iadede belge kesilemez, iade Bizim Hesap panelinden yapılmalıdır.
async function createBizimHesapReturnInvoice(config:BizimHesapConfig,input:CreateReturnInvoiceInput&{full?:boolean}):Promise<CreateReturnInvoiceResult>{
 if(!input.full)throw new EinvoiceError("Bizim Hesap API'sinde kısmi iade belgesi yok; kısmi iadeyi Bizim Hesap panelinden kesin. Siparişin tamamı iade edilince asıl fatura kendiliğinden iptal edilir.");
 await post("cancelinvoice",{firmId:firmIdOf(config),guid:input.original.providerInvoiceId});
 return {providerReturnId:`iptal:${input.original.providerInvoiceId}`,documentNumber:"Fatura İptal Edildi"};
}

// Bağlantı denemesi: firmanın depo listesi okunur (Firma ID token başlığında); kimlik yanlışsa Bizim Hesap hata döner.
async function test(){
 const config=await host.configuration(),firmId=firmIdOf(config);
 const response=await fetch(`${BASE}/warehouses`,{method:"GET",headers:{accept:"application/json",token:firmId},signal:AbortSignal.timeout(20000)});
 const text=await response.text();let data:{error?:string}|null=null;try{data=JSON.parse(text)}catch{}
 if(data?.error)throw new EinvoiceError(`Bizim Hesap: ${data.error}`);
 if(!response.ok)throw new EinvoiceError(response.status===401||response.status===403?"Bizim Hesap Firma ID'yi kabul etmedi.":`Bizim Hesap yanıt vermedi (HTTP ${response.status}).`);
 return {ok:true,message:"Bağlantı çalışıyor."};
}

return {test,createInvoice: async (input:CreateInvoiceInput) => createBizimHesapInvoice(await host.configuration(),input),createReturnInvoice: async (input:CreateReturnInvoiceInput&{full?:boolean}) => createBizimHesapReturnInvoice(await host.configuration(),input)};
}
