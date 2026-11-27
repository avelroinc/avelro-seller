// Independent provider package. Credentials and networking are supplied by the host.
export type ModuleHost={configuration():Promise<UyumsoftConfig>;request(url:string,init?:RequestInit):Promise<Response>};
type UyumsoftConfig={username:string;password:string;vknTckn:string};
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



// Best-effort implementation of Uyumsoft's SOAP e-Fatura web service. The
// envelope shape, method name and field names below are our best recollection
// of their documented WSDL-based integration, NOT confirmed against a live
// account — verify against Uyumsoft's current integrator documentation (and
// get the exact WSDL for your account) before production use.
const ENDPOINT="https://efatura.uyumsoft.com.tr/Services/Integration/SendInvoice";

function xmlEscape(value:string){return value.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}

async function createUyumsoftInvoice(config:UyumsoftConfig,input:CreateInvoiceInput):Promise<CreateInvoiceResult>{
 const lines=input.lines.map(line=>`<InvoiceLine><ItemName>${xmlEscape(line.name)}</ItemName><Quantity>${line.quantity}</Quantity><UnitPrice>${(line.unitPriceMicros/1e6).toFixed(2)}</UnitPrice><VatRate>${line.vatRate??20}</VatRate></InvoiceLine>`).join("");
 const envelope=`<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
 <soap:Header>
  <AuthHeader><Username>${xmlEscape(config.username)}</Username><Password>${xmlEscape(config.password)}</Password><VknTckn>${xmlEscape(config.vknTckn)}</VknTckn></AuthHeader>
 </soap:Header>
 <soap:Body>
  <SendInvoice>
   <Buyer><TaxIdType>${input.buyer.taxIdType}</TaxIdType><TaxId>${xmlEscape(input.buyer.taxId)}</TaxId><TaxOffice>${xmlEscape(input.buyer.taxOffice||"")}</TaxOffice><Name>${xmlEscape(input.buyer.legalName)}</Name><Address>${xmlEscape(input.buyer.address)}</Address><City>${xmlEscape(input.buyer.city)}</City><Email>${xmlEscape(input.buyer.email)}</Email></Buyer>
   <InvoiceLines>${lines}</InvoiceLines>
   <Note>${xmlEscape(input.note||"")}</Note>
  </SendInvoice>
 </soap:Body>
</soap:Envelope>`;
 const response=await fetch(ENDPOINT,{method:"POST",headers:{"content-type":"text/xml; charset=utf-8","soapaction":"SendInvoice"},body:envelope,signal:AbortSignal.timeout(25000)});
 const text=await response.text();
 if(!response.ok)throw new EinvoiceError(`Uyumsoft faturası oluşturulamadı (HTTP ${response.status}).`);
 const fault=text.match(/<faultstring>([^<]*)<\/faultstring>/i);
 if(fault)throw new EinvoiceError(fault[1]||"Uyumsoft faturası reddedildi.");
 const invoiceId=text.match(/<InvoiceId>([^<]*)<\/InvoiceId>/i)?.[1];
 const invoiceNumber=text.match(/<InvoiceNumber>([^<]*)<\/InvoiceNumber>/i)?.[1];
 if(!invoiceId)throw new EinvoiceError("Uyumsoft yanıtında fatura numarası bulunamadı.");
 return {providerInvoiceId:invoiceId,invoiceNumber};
}

// İade faturası: UBL-TR'de fatura tipi IADE ve asıl faturaya BillingReference (numara, tarih). Uyumsoft WSDL'i canlı hesapta
// doğrulanmadı (satış faturası gibi); ilk iadede Uyumsoft portalında kontrol edin.
async function createUyumsoftReturnInvoice(config:UyumsoftConfig,input:CreateReturnInvoiceInput):Promise<CreateReturnInvoiceResult>{
 const lines=input.lines.map(line=>`<InvoiceLine><ItemName>${xmlEscape(line.name)}</ItemName><Quantity>${line.quantity}</Quantity><UnitPrice>${(line.unitPriceMicros/1e6).toFixed(2)}</UnitPrice><VatRate>${line.vatRate??20}</VatRate></InvoiceLine>`).join("");
 const envelope=`<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
 <soap:Header>
  <AuthHeader><Username>${xmlEscape(config.username)}</Username><Password>${xmlEscape(config.password)}</Password><VknTckn>${xmlEscape(config.vknTckn)}</VknTckn></AuthHeader>
 </soap:Header>
 <soap:Body>
  <SendInvoice>
   <InvoiceTypeCode>IADE</InvoiceTypeCode>
   <BillingReference><InvoiceNumber>${xmlEscape(input.original.invoiceNumber||input.original.providerInvoiceId)}</InvoiceNumber><IssueDate>${xmlEscape(input.original.issueDate||"")}</IssueDate></BillingReference>
   <Buyer><TaxIdType>${input.buyer.taxIdType}</TaxIdType><TaxId>${xmlEscape(input.buyer.taxId)}</TaxId><TaxOffice>${xmlEscape(input.buyer.taxOffice||"")}</TaxOffice><Name>${xmlEscape(input.buyer.legalName)}</Name><Address>${xmlEscape(input.buyer.address)}</Address><City>${xmlEscape(input.buyer.city)}</City><Email>${xmlEscape(input.buyer.email)}</Email></Buyer>
   <InvoiceLines>${lines}</InvoiceLines>
   <Note>${xmlEscape(input.note||"")}</Note>
  </SendInvoice>
 </soap:Body>
</soap:Envelope>`;
 const response=await fetch(ENDPOINT,{method:"POST",headers:{"content-type":"text/xml; charset=utf-8","soapaction":"SendInvoice"},body:envelope,signal:AbortSignal.timeout(25000)});
 const text=await response.text();
 if(!response.ok)throw new EinvoiceError(`Uyumsoft iade faturası oluşturulamadı (HTTP ${response.status}).`);
 const fault=text.match(/<faultstring>([^<]*)<\/faultstring>/i);
 if(fault)throw new EinvoiceError(fault[1]||"Uyumsoft iade faturası reddedildi.");
 const invoiceId=text.match(/<InvoiceId>([^<]*)<\/InvoiceId>/i)?.[1];
 const invoiceNumber=text.match(/<InvoiceNumber>([^<]*)<\/InvoiceNumber>/i)?.[1];
 if(!invoiceId)throw new EinvoiceError("Uyumsoft yanıtında iade faturası numarası bulunamadı.");
 return {providerReturnId:invoiceId,documentNumber:invoiceNumber};
}

// Bağlantı denemesi: kimlik başlığıyla TestConnection çağrılır; kullanıcı, şifre ya da VKN yanlışsa Uyumsoft hata (fault) döner.
async function test(){
 const config=await host.configuration();
 const envelope=`<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
 <soap:Header><AuthHeader><Username>${xmlEscape(config.username)}</Username><Password>${xmlEscape(config.password)}</Password><VknTckn>${xmlEscape(config.vknTckn)}</VknTckn></AuthHeader></soap:Header>
 <soap:Body><TestConnection/></soap:Body>
</soap:Envelope>`;
 const response=await fetch(ENDPOINT.replace(/\/SendInvoice$/,"/TestConnection"),{method:"POST",headers:{"content-type":"text/xml; charset=utf-8","soapaction":"TestConnection"},body:envelope,signal:AbortSignal.timeout(25000)});
 const text=await response.text(),fault=text.match(/<faultstring>([^<]*)<\/faultstring>/i);
 if(fault)throw new EinvoiceError(fault[1]||"Uyumsoft bağlantıyı reddetti.");
 if(!response.ok)throw new EinvoiceError(`Uyumsoft yanıt vermedi (HTTP ${response.status}).`);
 return {ok:true,message:"Bağlantı çalışıyor."};
}

return {test,createInvoice: async (input:CreateInvoiceInput) => createUyumsoftInvoice(await host.configuration(),input),createReturnInvoice: async (input:CreateReturnInvoiceInput) => createUyumsoftReturnInvoice(await host.configuration(),input)};
}
