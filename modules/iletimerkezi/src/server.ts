// Independent provider package. Credentials and networking are supplied by the host.
export type ModuleHost={configuration():Promise<IletiMerkeziConfig>;request(url:string,init?:RequestInit):Promise<Response>};
type IletiMerkeziConfig={username:string;password:string;sender:string};
export default function createModule(host:ModuleHost){
const fetch=(url:string,init?:RequestInit)=>host.request(url,init);
class SmsError extends Error{}
async function sendViaIletiMerkezi(config:IletiMerkeziConfig,to:string,message:string){
 const response=await fetch("https://api.iletimerkezi.com/v1/send-sms/json",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({request:{authentication:{username:config.username,password:config.password},order:{sender:config.sender,message:{text:message,receipents:{number:[to]}}}}}),signal:AbortSignal.timeout(15000)}),
  data=await response.json().catch(()=>null) as {response?:{status?:{code?:string;message?:string}}}|null,
  code=data?.response?.status?.code;
 if(!response.ok||code!=="200")throw new SmsError(data?.response?.status?.message||"İleti Merkezi SMS gönderilemedi.");
}

// Toplu SMS (panel > Toplu Mesaj): yönetici tarafından yazılan metni tek alıcıya gönderir. Metin ve numara ana uygulamada doğrulanır; burada yalnızca boş/aşırı uzun girdi reddedilir.
async function sendText(input:{to:string;text:string}){
 if(typeof input?.to!=="string"||!input.to.trim()||typeof input.text!=="string"||!input.text.trim()||input.text.length>1000)throw new SmsError("Geçersiz SMS isteği.");
 return sendViaIletiMerkezi(await host.configuration(),input.to.trim(),input.text);
}

return {sendOtp: async (input:{to:string;code:string}) => sendViaIletiMerkezi(await host.configuration(),input.to,`Doğrulama kodunuz: ${input.code}. Bu kodu kimseyle paylaşmayın.`),sendSms: sendText};
}
