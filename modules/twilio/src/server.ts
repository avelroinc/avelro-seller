// Independent provider package. Credentials and networking are supplied by the host.
export type ModuleHost={configuration():Promise<TwilioConfig>;request(url:string,init?:RequestInit):Promise<Response>};
// fromNumber: gönderen numara (+1…), Alfanümerik Gönderici Kimliği (ör. AVELRO) ya da Messaging Service SID (MG…).
type TwilioConfig={accountSid:string;authToken:string;fromNumber:string};
export default function createModule(host:ModuleHost){
const fetch=(url:string,init?:RequestInit)=>host.request(url,init);
class SmsError extends Error{}
// Numara: sistem +905XXXXXXXXX biçiminde verir; sağlayıcının istediği biçime çevrilir.
const digits=(to:string)=>to.replace(/[^\d]/g,"");
const otpText=(code:string)=>`Dogrulama kodunuz: ${code}. Bu kodu kimseyle paylasmayin.`;
async function sendViaTwilio(config:TwilioConfig,to:string,message:string){
 const sid=config.accountSid.trim(),from=config.fromNumber.trim().replace(/\s+/g,""),number=`+${digits(to)}`;
 if(!/^AC[0-9a-f]{32}$/i.test(sid))throw new SmsError("Twilio Account SID geçersiz (AC ile başlayan 34 karakter olmalı).");
 if(number.length<8)throw new SmsError("Telefon numarası geçersiz.");
 const body=new URLSearchParams({To:number,Body:message,...(/^MG[0-9a-f]{32}$/i.test(from)?{MessagingServiceSid:from}:{From:from.startsWith("+")||/^[A-Za-z]/.test(from)?from:`+${digits(from)}`})});
 const response=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,{method:"POST",headers:{authorization:`Basic ${btoa(`${sid}:${config.authToken.trim()}`)}`,"content-type":"application/x-www-form-urlencoded"},body,signal:AbortSignal.timeout(15000)}),
  data=await response.json().catch(()=>null) as {message?:string;code?:number;sid?:string}|null;
 if(response.status===401)throw new SmsError("Twilio kimlik doğrulaması başarısız: Account SID ya da Auth Token hatalı.");
 if(!response.ok)throw new SmsError(`Twilio: ${data?.message||"SMS gönderilemedi."}${data?.code?` (Hata ${data.code})`:""}`);
}

// Bildirim ve toplu SMS: metin ve numara ana uygulamada doğrulanır; burada yalnızca boş / aşırı uzun girdi reddedilir.
async function sendText(input:{to:string;text:string}){
 if(typeof input?.to!=="string"||!input.to.trim()||typeof input.text!=="string"||!input.text.trim()||input.text.length>1000)throw new SmsError("Geçersiz SMS isteği.");
 return sendViaTwilio(await host.configuration(),input.to.trim(),input.text);
}
// Bağlantı denemesi: ayarlar doğruysa verilen numaraya kısa bir deneme SMS'i gider.
async function test(input:{to:string}){return sendViaTwilio(await host.configuration(),String(input?.to||"").trim(),"Avelro SMS baglanti denemesi basarili.")}

return {sendOtp:async(input:{to:string;code:string})=>sendViaTwilio(await host.configuration(),input.to,otpText(input.code)),sendSms:sendText,test};
}
