// Independent provider package. Credentials and networking are supplied by the host.
export type ModuleHost={configuration():Promise<NetgsmConfig>;request(url:string,init?:RequestInit):Promise<Response>};
type NetgsmConfig={usercode:string;password:string;header:string};
export default function createModule(host:ModuleHost){
const fetch=(url:string,init?:RequestInit)=>host.request(url,init);
class SmsError extends Error{}
async function sendViaNetgsm(config:NetgsmConfig,to:string,message:string){
 const auth=btoa(`${config.usercode}:${config.password}`),
  response=await fetch("https://api.netgsm.com.tr/sms/rest/v2/send",{method:"POST",headers:{authorization:`Basic ${auth}`,"content-type":"application/json"},body:JSON.stringify({msgheader:config.header,encoding:"TR",messages:[{msg:message,no:to}]}),signal:AbortSignal.timeout(15000)}),
  data=await response.json().catch(()=>null) as {code?:string;description?:string}|null;
 if(!response.ok||!data||data.code!=="00")throw new SmsError(data?.description||"Netgsm SMS gönderilemedi.");
}

// Toplu SMS (panel > Toplu Mesaj): yönetici tarafından yazılan metni tek alıcıya gönderir. Metin ve numara ana uygulamada doğrulanır; burada yalnızca boş/aşırı uzun girdi reddedilir.
async function sendText(input:{to:string;text:string}){
 if(typeof input?.to!=="string"||!input.to.trim()||typeof input.text!=="string"||!input.text.trim()||input.text.length>1000)throw new SmsError("Geçersiz SMS isteği.");
 return sendViaNetgsm(await host.configuration(),input.to.trim(),input.text);
}

return {sendOtp: async (input:{to:string;code:string}) => sendViaNetgsm(await host.configuration(),input.to,`Doğrulama kodunuz: ${input.code}. Bu kodu kimseyle paylaşmayın.`),sendSms: sendText};
}
