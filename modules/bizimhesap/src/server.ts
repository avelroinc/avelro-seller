// Independent provider package. Credentials and networking are supplied by the host.
export type ModuleHost={configuration():Promise<BizimHesapConfig>;request(url:string,init?:RequestInit):Promise<Response>};
type BizimHesapConfig={apiKey:string;companyId:string};
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
};

type CreateInvoiceResult={providerInvoiceId:string;invoiceNumber?:string;pdfUrl?:string};
// İade faturası (satıştan iade): asıl faturaya bağlanan, iade edilen tutar kadar belge.
type CreateReturnInvoiceInput=CreateInvoiceInput&{original:{providerInvoiceId:string;invoiceNumber?:string|null;issueDate?:string|null};reason?:string};
type CreateReturnInvoiceResult={providerReturnId:string;documentNumber?:string;pdfUrl?:string};


class EinvoiceError extends Error{}



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

// İade faturası: satış faturasıyla aynı uç, fatura türü İADE ve asıl faturaya referansla. Bizim Hesap API'si canlı hesapta doğrulanmadı
// (satış faturası gibi); ilk iadede Bizim Hesap'ta kaydı kontrol edin.
async function createBizimHesapReturnInvoice(config:BizimHesapConfig,input:CreateReturnInvoiceInput):Promise<CreateReturnInvoiceResult>{
 const response=await fetch(`${BASE}/AddSalesInvoice`,{method:"POST",headers:{"content-type":"application/json","x-api-key":config.apiKey},body:JSON.stringify({companyId:config.companyId,invoiceType:"IADE",returnOf:{invoiceId:input.original.providerInvoiceId,invoiceNumber:input.original.invoiceNumber||undefined,issueDate:input.original.issueDate||undefined},customer:{name:input.buyer.legalName,taxNumber:input.buyer.taxId,taxOffice:input.buyer.taxOffice||undefined,address:input.buyer.address,city:input.buyer.city,email:input.buyer.email,isCompany:input.buyer.taxIdType==="CORPORATE"},description:input.note||"İade faturası",items:input.lines.map(line=>({name:line.name,quantity:line.quantity,unitPrice:line.unitPriceMicros/1e6,vatRate:line.vatRate??20}))}),signal:AbortSignal.timeout(20000)});
 const result=await response.json() as {success?:boolean;invoiceId?:string;invoiceNumber?:string;pdfUrl?:string;message?:string};
 if(!response.ok||!result.success||!result.invoiceId)throw new EinvoiceError(result.message||"Bizim Hesap iade faturası oluşturulamadı.");
 return {providerReturnId:result.invoiceId,documentNumber:result.invoiceNumber,pdfUrl:result.pdfUrl};
}

return {createInvoice: async (input:CreateInvoiceInput) => createBizimHesapInvoice(await host.configuration(),input),createReturnInvoice: async (input:CreateReturnInvoiceInput) => createBizimHesapReturnInvoice(await host.configuration(),input)};
}
