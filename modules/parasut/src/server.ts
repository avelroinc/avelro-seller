// Independent provider package. Credentials and networking are supplied by the host.
export type ModuleHost={configuration():Promise<ParasutConfig>;request(url:string,init?:RequestInit):Promise<Response>};
type ParasutConfig={clientId:string;clientSecret:string;username:string;password:string;companyId:string};
export default function createModule(host:ModuleHost){
const fetch=(url:string,init?:RequestInit)=>host.request(url,init);
type EinvoiceProvider="PARASUT"|"BIZIMHESAP"|"LOGO"|"UYUMSOFT";
const EINVOICE_PROVIDERS:EinvoiceProvider[]=["PARASUT","BIZIMHESAP","LOGO","UYUMSOFT"];

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
};

type CreateInvoiceResult={providerInvoiceId:string;invoiceNumber?:string;pdfUrl?:string};

class EinvoiceError extends Error{}

interface EinvoiceAdapter<Config>{
 createInvoice(config:Config,input:CreateInvoiceInput):Promise<CreateInvoiceResult>;
}

function missingBillingFields(buyer:Partial<BillingParty>|null|undefined){
 if(!buyer)return true;
 if(!buyer.taxId||!buyer.legalName||!buyer.address||!buyer.city)return true;
 if(buyer.taxIdType==="CORPORATE"&&!buyer.taxOffice)return true;
 return false;
}


// Best-effort implementation of Paraşüt's v4 JSON:API. Verify field names and
// the e_invoices/e_archives conversion step against current Paraşüt API docs
// (apidocs.parasut.com) with real sandbox credentials before production use.
const BASE="https://api.parasut.com/v4";

async function getAccessToken(config:ParasutConfig){
 const response=await fetch("https://api.parasut.com/oauth/token",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({grant_type:"password",client_id:config.clientId,client_secret:config.clientSecret,username:config.username,password:config.password}),signal:AbortSignal.timeout(15000)});
 const result=await response.json() as {access_token?:string;error_description?:string};
 if(!response.ok||!result.access_token)throw new EinvoiceError(result.error_description||"Paraşüt oturumu açılamadı.");
 return result.access_token;
}

async function findOrCreateContact(config:ParasutConfig,token:string,buyer:CreateInvoiceInput["buyer"]){
 const headers={"content-type":"application/json","authorization":`Bearer ${token}`};
 const search=await fetch(`${BASE}/${config.companyId}/contacts?filter[tax_number]=${encodeURIComponent(buyer.taxId)}`,{headers,signal:AbortSignal.timeout(15000)});
 const found=await search.json() as {data?:{id:string}[]};
 if(found.data?.[0]?.id)return found.data[0].id;
 const created=await fetch(`${BASE}/${config.companyId}/contacts`,{method:"POST",headers,body:JSON.stringify({data:{type:"contacts",attributes:{name:buyer.legalName,email:buyer.email,tax_number:buyer.taxId,tax_office:buyer.taxOffice||undefined,address:buyer.address,city:buyer.city,contact_type:buyer.taxIdType==="CORPORATE"?"company":"person",account_type:"customer"}}}),signal:AbortSignal.timeout(15000)});
 const createdBody=await created.json() as {data?:{id:string};errors?:{detail?:string}[]};
 if(!created.ok||!createdBody.data?.id)throw new EinvoiceError(createdBody.errors?.[0]?.detail||"Paraşüt müşteri kaydı oluşturulamadı.");
 return createdBody.data.id;
}

async function createParasutInvoice(config:ParasutConfig,input:CreateInvoiceInput):Promise<CreateInvoiceResult>{
 const token=await getAccessToken(config),headers={"content-type":"application/json","authorization":`Bearer ${token}`};
 const contactId=await findOrCreateContact(config,token,input.buyer);
 const invoiceRes=await fetch(`${BASE}/${config.companyId}/sales_invoices?include=details`,{method:"POST",headers,body:JSON.stringify({data:{type:"sales_invoices",attributes:{item_type:"invoice",description:input.note||"Sipariş faturası",issue_date:new Date().toISOString().slice(0,10),currency:"TRL"},relationships:{contact:{data:{id:contactId,type:"contacts"}},details:{data:input.lines.map(line=>({type:"sales_invoice_details",attributes:{quantity:line.quantity,unit_price:line.unitPriceMicros/1e6,vat_rate:line.vatRate??20,description:line.name}}))}}}}),signal:AbortSignal.timeout(20000)});
 const invoiceBody=await invoiceRes.json() as {data?:{id:string;attributes?:{invoice_no?:string}};errors?:{detail?:string}[]};
 if(!invoiceRes.ok||!invoiceBody.data?.id)throw new EinvoiceError(invoiceBody.errors?.[0]?.detail||"Paraşüt faturası oluşturulamadı.");
 const invoiceId=invoiceBody.data.id;
 const eInvoiceRes=await fetch(`${BASE}/${config.companyId}/sales_invoices/${invoiceId}/e_invoices`,{method:"POST",headers,body:JSON.stringify({data:{type:"e_invoices"}}),signal:AbortSignal.timeout(20000)});
 if(!eInvoiceRes.ok){
  // Contact isn't an e-fatura mükellefi (or the account isn't set up for it) — fall back to e-arşiv.
  await fetch(`${BASE}/${config.companyId}/sales_invoices/${invoiceId}/e_archives`,{method:"POST",headers,body:JSON.stringify({data:{type:"e_archives"}}),signal:AbortSignal.timeout(20000)}).catch(()=>{});
 }
 return {providerInvoiceId:invoiceId,invoiceNumber:invoiceBody.data.attributes?.invoice_no};
}

return {createInvoice: async (input:CreateInvoiceInput) => createParasutInvoice(await host.configuration(),input)};
}
