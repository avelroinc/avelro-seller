// Independent provider package. Credentials and networking are supplied by the host.
export type ModuleHost={configuration():Promise<BizimHesapConfig>;request(url:string,init?:RequestInit):Promise<Response>};
type BizimHesapConfig={apiKey:string;companyId:string};
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


// Best-effort implementation of Bizim Hesap's REST API. The exact endpoint path
// and field names below are our best recollection, NOT confirmed against a live
// account — verify against bizimhesap.com's current API reference before
// production use.
const BASE="https://bizimhesap.com/api/b2b";

async function createBizimHesapInvoice(config:BizimHesapConfig,input:CreateInvoiceInput):Promise<CreateInvoiceResult>{
 const response=await fetch(`${BASE}/AddSalesInvoice`,{method:"POST",headers:{"content-type":"application/json","x-api-key":config.apiKey},body:JSON.stringify({companyId:config.companyId,customer:{name:input.buyer.legalName,taxNumber:input.buyer.taxId,taxOffice:input.buyer.taxOffice||undefined,address:input.buyer.address,city:input.buyer.city,email:input.buyer.email,isCompany:input.buyer.taxIdType==="CORPORATE"},description:input.note||"Sipariş faturası",items:input.lines.map(line=>({name:line.name,quantity:line.quantity,unitPrice:line.unitPriceMicros/1e6,vatRate:line.vatRate??20}))}),signal:AbortSignal.timeout(20000)});
 const result=await response.json() as {success?:boolean;invoiceId?:string;invoiceNumber?:string;pdfUrl?:string;message?:string};
 if(!response.ok||!result.success||!result.invoiceId)throw new EinvoiceError(result.message||"Bizim Hesap faturası oluşturulamadı.");
 return {providerInvoiceId:result.invoiceId,invoiceNumber:result.invoiceNumber,pdfUrl:result.pdfUrl};
}

return {createInvoice: async (input:CreateInvoiceInput) => createBizimHesapInvoice(await host.configuration(),input)};
}
