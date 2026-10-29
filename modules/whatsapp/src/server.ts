// Independent provider package. Credentials and networking are supplied by the host.
export type ModuleHost={configuration():Promise<{phoneNumberId:string;accessToken:string;toPhoneNumber:string}>;request(url:string,init?:RequestInit):Promise<Response>};
export default function createModule(host:ModuleHost){
const fetch=(url:string,init?:RequestInit)=>host.request(url,init);
class WhatsappError extends Error{}

// Uses Meta's WhatsApp Cloud API. Free-form text messages only deliver
// within the 24h customer-service window (i.e. the recipient must have
// messaged the business number recently). Outside that window a
// pre-approved message template is required: sendMessage accepts the
// template name and language and writes the text into its single body
// variable ({{1}}).
async function post(config:{phoneNumberId:string;accessToken:string},payload:Record<string,unknown>){
 const response=await fetch(`https://graph.facebook.com/v21.0/${config.phoneNumberId}/messages`,{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${config.accessToken}`},body:JSON.stringify({messaging_product:"whatsapp",...payload}),signal:AbortSignal.timeout(10000)});
 const result=await response.json() as {error?:{message?:string}};
 if(!response.ok)throw new WhatsappError(result.error?.message||"WhatsApp mesajı gönderilemedi.");
}

// Yöneticiye bildirim: ayarlardaki bildirim numarasına düz metin.
async function sendNotification(input:{text:string}){const config=await host.configuration();await post(config,{to:config.toPhoneNumber,type:"text",text:{body:input.text}})}
// Müşteriye mesaj: verilen numaraya; onaylı şablon adı verildiyse şablonla (metin tek satır olur), verilmediyse düz metin.
async function sendMessage(input:{to:string;text:string;template?:string;language?:string}){
 const to=String(input?.to||"").replace(/\D/g,"");if(!/^\d{10,15}$/.test(to))throw new WhatsappError("Telefon numarası geçersiz.");
 const body=String(input?.text||"").trim().slice(0,1000);if(!body)throw new WhatsappError("Mesaj boş.");
 const config=await host.configuration(),template=String(input?.template||"").trim();
 if(template){
  if(!/^[a-z0-9_]{1,512}$/.test(template))throw new WhatsappError("Şablon adı geçersiz.");
  await post(config,{to,type:"template",template:{name:template,language:{code:String(input?.language||"tr")},components:[{type:"body",parameters:[{type:"text",text:body.replace(/\s+/g," ")}]}]}});return;
 }
 await post(config,{to,type:"text",text:{body}});
}

return {sendNotification,sendMessage};
}
