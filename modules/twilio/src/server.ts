// Independent provider package. Credentials and networking are supplied by the host.
export type ModuleHost={configuration():Promise<TwilioConfig>;request(url:string,init?:RequestInit):Promise<Response>};
type TwilioConfig={accountSid:string;authToken:string;fromNumber:string};
export default function createModule(host:ModuleHost){
const fetch=(url:string,init?:RequestInit)=>host.request(url,init);
class SmsError extends Error{}
async function sendViaTwilio(config:TwilioConfig,to:string,message:string){
 const auth=btoa(`${config.accountSid}:${config.authToken}`),
  body=new URLSearchParams({To:to,From:config.fromNumber,Body:message}),
  response=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(config.accountSid)}/Messages.json`,{method:"POST",headers:{authorization:`Basic ${auth}`,"content-type":"application/x-www-form-urlencoded"},body,signal:AbortSignal.timeout(15000)}),
  data=await response.json().catch(()=>null) as {message?:string;sid?:string}|null;
 if(!response.ok)throw new SmsError(data?.message||"Twilio SMS gönderilemedi.");
}

// Toplu SMS (panel > Toplu Mesaj): yönetici tarafından yazılan metni tek alıcıya gönderir. Metin ve numara ana uygulamada doğrulanır; burada yalnızca boş/aşırı uzun girdi reddedilir.
async function sendText(input:{to:string;text:string}){
 if(typeof input?.to!=="string"||!input.to.trim()||typeof input.text!=="string"||!input.text.trim()||input.text.length>1000)throw new SmsError("Geçersiz SMS isteği.");
 return sendViaTwilio(await host.configuration(),input.to.trim(),input.text);
}

return {sendOtp: async (input:{to:string;code:string}) => sendViaTwilio(await host.configuration(),input.to,`Doğrulama kodunuz: ${input.code}. Bu kodu kimseyle paylaşmayın.`),sendSms: sendText};
}
