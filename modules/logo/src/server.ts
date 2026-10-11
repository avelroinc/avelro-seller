// Independent provider package. Credentials and networking are supplied by the host.
export type ModuleHost={configuration():Promise<LogoConfig>;request(url:string,init?:RequestInit):Promise<Response>};
type LogoConfig={wsUsername:string;wsPassword:string;firmCode:string};
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

return {createInvoice: async (input:CreateInvoiceInput) => createLogoInvoice(await host.configuration(),input)};
}
