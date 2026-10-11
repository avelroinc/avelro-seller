// Independent provider package. Credentials and networking are supplied by the host.
export type ModuleHost={configuration():Promise<{phoneNumberId:string;accessToken:string;toPhoneNumber:string}>;request(url:string,init?:RequestInit):Promise<Response>};
export default function createModule(host:ModuleHost){
const fetch=(url:string,init?:RequestInit)=>host.request(url,init);
class WhatsappError extends Error{}

// Uses Meta's WhatsApp Cloud API. Free-form text messages only deliver
// within the 24h customer-service window (i.e. the recipient must have
// messaged the business number recently) — sending outside that window
// requires a pre-approved message template, which is out of scope here.
async function sendWhatsappMessage(config:{phoneNumberId:string;accessToken:string;toPhoneNumber:string},text:string){
 const response=await fetch(`https://graph.facebook.com/v21.0/${config.phoneNumberId}/messages`,{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${config.accessToken}`},body:JSON.stringify({messaging_product:"whatsapp",to:config.toPhoneNumber,type:"text",text:{body:text}}),signal:AbortSignal.timeout(10000)});
 const result=await response.json() as {error?:{message?:string}};
 if(!response.ok)throw new WhatsappError(result.error?.message||"WhatsApp mesajı gönderilemedi.");
}

return {sendNotification: async (input:{text:string}) => sendWhatsappMessage(await host.configuration(),input.text)};
}
