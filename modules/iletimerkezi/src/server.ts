// Independent provider package. Credentials and networking are supplied by the host.
export type ModuleHost={configuration():Promise<IletiMerkeziConfig>;request(url:string,init?:RequestInit):Promise<Response>};
type IletiMerkeziConfig={username:string;password:string;sender:string};
export default function createModule(host:ModuleHost){
const fetch=(url:string,init?:RequestInit)=>host.request(url,init);
class SmsError extends Error{}
// Numara: sistem +905XXXXXXXXX biçiminde verir; sağlayıcının istediği biçime çevrilir.
const digits=(to:string)=>to.replace(/[^\d]/g,"");
const otpText=(code:string)=>`Dogrulama kodunuz: ${code}. Bu kodu kimseyle paylasmayin.`;
async function sendViaIletiMerkezi(config:IletiMerkeziConfig,to:string,message:string){
 const number=digits(to).replace(/^90(?=5\d{9}$)/,"");
 const response=await fetch("https://api.iletimerkezi.com/v1/send-sms/json",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({request:{authentication:{username:config.username.trim(),password:config.password},order:{sender:config.sender.trim(),message:{text:message,receipents:{number:[number]}}}}}),signal:AbortSignal.timeout(15000)}),
  data=await response.json().catch(()=>null) as {response?:{status?:{code?:string|number;message?:string}}}|null,
  code=String(data?.response?.status?.code??"");
 if(!response.ok||code!=="200")throw new SmsError(`İleti Merkezi: ${data?.response?.status?.message||"SMS gönderilemedi."}${code?` (Kod ${code})`:""}`);
}

// Bildirim ve toplu SMS: metin ve numara ana uygulamada doğrulanır; burada yalnızca boş / aşırı uzun girdi reddedilir.
async function sendText(input:{to:string;text:string}){
 if(typeof input?.to!=="string"||!input.to.trim()||typeof input.text!=="string"||!input.text.trim()||input.text.length>1000)throw new SmsError("Geçersiz SMS isteği.");
 return sendViaIletiMerkezi(await host.configuration(),input.to.trim(),input.text);
}
// Bağlantı denemesi: ayarlar doğruysa verilen numaraya kısa bir deneme SMS'i gider.
async function test(input:{to:string}){return sendViaIletiMerkezi(await host.configuration(),String(input?.to||"").trim(),"Avelro SMS baglanti denemesi basarili.")}

return {sendOtp:async(input:{to:string;code:string})=>sendViaIletiMerkezi(await host.configuration(),input.to,otpText(input.code)),sendSms:sendText,test};
}
