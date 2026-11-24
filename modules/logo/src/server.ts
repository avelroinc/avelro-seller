// Independent provider package. Credentials and networking are supplied by the host.
export type ModuleHost={configuration():Promise<LogoConfig>;request(url:string,init?:RequestInit):Promise<Response>};
type LogoConfig={wsUsername:string;wsPassword:string;firmCode:string};
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



// Logo's e-Fatura is delivered through their "eLogo Özel Entegratörlük" service
// (a partner-only portal at efatura.elogo.com.tr with no public API docs), so
// this adapter's endpoint/field names are an UNVERIFIED best guess at the shape
// such an integrator API would take. Do not use in production without getting
// the real API contract from Logo/eLogo after signing up for entegratörlük.
const BASE="https://efatura.elogo.com.tr/Services/Integration";

async function createLogoInvoice(config:LogoConfig,input:CreateInvoiceInput):Promise<CreateInvoiceResult>{
 const response=await fetch(`${BASE}/SendInvoice`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({wsUserName:config.wsUsername,wsPassword:config.wsPassword,firmCode:config.firmCode,buyer:{taxIdType:input.buyer.taxIdType,taxId:input.buyer.taxId,taxOffice:input.buyer.taxOffice||undefined,name:input.buyer.legalName,address:input.buyer.address,city:input.buyer.city,email:input.buyer.email},lines:input.lines.map(line=>({name:line.name,quantity:line.quantity,unitPrice:line.unitPriceMicros/1e6,vatRate:line.vatRate??20})),note:input.note||undefined}),signal:AbortSignal.timeout(25000)});
 const result=await response.json() as {success?:boolean;invoiceId?:string;invoiceNumber?:string;pdfUrl?:string;errorMessage?:string};
 if(!response.ok||!result.success||!result.invoiceId)throw new EinvoiceError(result.errorMessage||"Logo/eLogo faturası oluşturulamadı.");
 return {providerInvoiceId:result.invoiceId,invoiceNumber:result.invoiceNumber,pdfUrl:result.pdfUrl};
}

// İade faturası: UBL-TR'de fatura tipi IADE ve asıl faturaya BillingReference (numara, tarih). eLogo entegratör sözleşmesi olmadan
// doğrulanamadı (satış faturası gibi); ilk iadede eLogo portalında kontrol edin.
async function createLogoReturnInvoice(config:LogoConfig,input:CreateReturnInvoiceInput):Promise<CreateReturnInvoiceResult>{
 const response=await fetch(`${BASE}/SendInvoice`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({wsUserName:config.wsUsername,wsPassword:config.wsPassword,firmCode:config.firmCode,invoiceTypeCode:"IADE",billingReference:{invoiceNumber:input.original.invoiceNumber||input.original.providerInvoiceId,issueDate:input.original.issueDate||undefined},buyer:{taxIdType:input.buyer.taxIdType,taxId:input.buyer.taxId,taxOffice:input.buyer.taxOffice||undefined,name:input.buyer.legalName,address:input.buyer.address,city:input.buyer.city,email:input.buyer.email},lines:input.lines.map(line=>({name:line.name,quantity:line.quantity,unitPrice:line.unitPriceMicros/1e6,vatRate:line.vatRate??20})),note:input.note||undefined}),signal:AbortSignal.timeout(25000)});
 const result=await response.json() as {success?:boolean;invoiceId?:string;invoiceNumber?:string;pdfUrl?:string;errorMessage?:string};
 if(!response.ok||!result.success||!result.invoiceId)throw new EinvoiceError(result.errorMessage||"Logo/eLogo iade faturası oluşturulamadı.");
 return {providerReturnId:result.invoiceId,documentNumber:result.invoiceNumber,pdfUrl:result.pdfUrl};
}

return {createInvoice: async (input:CreateInvoiceInput) => createLogoInvoice(await host.configuration(),input),createReturnInvoice: async (input:CreateReturnInvoiceInput) => createLogoReturnInvoice(await host.configuration(),input)};
}
