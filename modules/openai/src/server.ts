// ChatGPT Entegrasyonu: OpenAI API'ye (api.openai.com) yazı (chat completions), internette araştırma (responses + web arama aracı),
// görsel (images) ve model listesi istekleri. Bağımsız sağlayıcı paketidir: API anahtarı ve ağ erişimi sistem tarafından verilir; modül
// veritabanına ve başka adrese erişemez. İsteğin gövdesini sistem hazırlar (model, mesajlar, sınırlar); modül yalnızca anahtarla gönderir.
// Hatalar fırlatılmaz, {error,status,code} olarak döner (sistem anlaşılır mesaj ve bakiye uyarısı gösterebilsin).
export type ModuleHost={configuration():Promise<{apiKey:string}>;request(url:string,init?:RequestInit):Promise<{ok:boolean;status:number;json():Promise<unknown>;text():Promise<string>}>};
type Result={status:number;data:unknown}|{error:string;status:number;code:string};
type BodyInput={body?:Record<string,unknown>};

const API="https://api.openai.com/v1";
const redact=(value:string)=>value.replace(/sk-[A-Za-z0-9_-]+/g,"sk-…").slice(0,300);

export default function createModule(host:ModuleHost){
 async function call(path:string,body?:Record<string,unknown>):Promise<Result>{
  const {apiKey}=await host.configuration();
  const response=await host.request(`${API}${path}`,{method:body?"POST":"GET",headers:{authorization:`Bearer ${apiKey}`,"content-type":"application/json"},body:body?JSON.stringify(body):undefined}).catch(()=>null);
  if(!response)return {error:"OpenAI'a ulaşılamadı ya da yanıt zamanında gelmedi.",status:0,code:"network"};
  const data=await response.json().catch(()=>({})) as {error?:{message?:string;code?:string;type?:string}};
  if(response.ok)return {status:response.status,data};
  return {error:redact(String(data.error?.message||"")),status:response.status,code:String(data.error?.code||data.error?.type||"")};
 }
 const body=(input:BodyInput)=>input&&typeof input.body==="object"&&input.body?input.body:null;
 // Yazı: chat completions gövdesi olduğu gibi gönderilir.
 async function complete(input:BodyInput){const b=body(input);return b?call("/chat/completions",b):{error:"Yazı isteği geçersiz.",status:400,code:"invalid"}}
 // İnternette araştırma: responses gövdesi (web arama aracıyla).
 async function search(input:BodyInput){const b=body(input);return b?call("/responses",b):{error:"Araştırma isteği geçersiz.",status:400,code:"invalid"}}
 // Görsel: images/generations gövdesi; yanıt base64 görsel içerir.
 async function image(input:BodyInput){const b=body(input);return b?call("/images/generations",b):{error:"Görsel isteği geçersiz.",status:400,code:"invalid"}}
 // Hesabın erişebildiği modeller.
 async function models(){return call("/models")}
 return {complete,search,image,models};
}
