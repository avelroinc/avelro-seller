// Independent provider package. Credentials and networking are supplied by the host.
export type ModuleHost={configuration():Promise<NetgsmConfig>;request(url:string,init?:RequestInit):Promise<Response>};
type NetgsmConfig={usercode:string;password:string;header:string};
export default function createModule(host:ModuleHost){
const fetch=(url:string,init?:RequestInit)=>host.request(url,init);
class SmsError extends Error{}
// Numara: sistem +905XXXXXXXXX biçiminde verir; sağlayıcının istediği biçime çevrilir.
const digits=(to:string)=>to.replace(/[^\d]/g,"");
const otpText=(code:string)=>`Dogrulama kodunuz: ${code}. Bu kodu kimseyle paylasmayin.`;
// Netgsm hata kodları (REST v2): 20 metin / karakter, 30 kullanıcı adı / şifre / API izni, 40 gönderici başlığı, 50–51 IYS, 70 eksik parametre, 80 limit.
const NETGSM:Record<string,string>={"20":"Mesaj metni hatalı ya da çok uzun.","30":"Kullanıcı kodu / şifre hatalı ya da hesapta API erişim izni yok.","40":"Gönderici başlığı (mesaj başlığı) sistemde tanımlı değil.","50":"İYS kontrollü gönderim hatası.","51":"İYS marka bilgisi bulunamadı.","70":"Eksik ya da hatalı parametre.","80":"Gönderim sınırı aşıldı.","85":"Aynı numaraya kısa sürede çok fazla gönderim."};
async function sendViaNetgsm(config:NetgsmConfig,to:string,message:string){
 const number=digits(to).replace(/^90(?=5\d{9}$)/,"");
 const response=await fetch("https://api.netgsm.com.tr/sms/rest/v2/send",{method:"POST",headers:{authorization:`Basic ${btoa(`${config.usercode.trim()}:${config.password}`)}`,"content-type":"application/json"},body:JSON.stringify({msgheader:config.header.trim(),encoding:"TR",messages:[{msg:message,no:number}]}),signal:AbortSignal.timeout(15000)}),
  data=await response.json().catch(()=>null) as {code?:string;description?:string}|null;
 if(!response.ok||!data||data.code!=="00")throw new SmsError(`Netgsm: ${(data?.code&&NETGSM[data.code])||data?.description||"SMS gönderilemedi."}${data?.code?` (Kod ${data.code})`:""}`);
}

// Bildirim ve toplu SMS: metin ve numara ana uygulamada doğrulanır; burada yalnızca boş / aşırı uzun girdi reddedilir.
async function sendText(input:{to:string;text:string}){
 if(typeof input?.to!=="string"||!input.to.trim()||typeof input.text!=="string"||!input.text.trim()||input.text.length>1000)throw new SmsError("Geçersiz SMS isteği.");
 return sendViaNetgsm(await host.configuration(),input.to.trim(),input.text);
}
// Bağlantı denemesi: ayarlar doğruysa verilen numaraya kısa bir deneme SMS'i gider.
async function test(input:{to:string}){return sendViaNetgsm(await host.configuration(),String(input?.to||"").trim(),"Avelro SMS baglanti denemesi basarili.")}

return {sendOtp:async(input:{to:string;code:string})=>sendViaNetgsm(await host.configuration(),input.to,otpText(input.code)),sendSms:sendText,test};
}
