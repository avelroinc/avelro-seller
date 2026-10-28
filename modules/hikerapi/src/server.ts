// HikerAPI Entegrasyonu: Instagram profil verisini (son gönderilerle birlikte) HikerAPI'den (api.hikerapi.com) okur.
// Bağımsız sağlayıcı paketidir: API anahtarı ve ağ erişimi sistem tarafından verilir; modül veritabanına ve başka adrese erişemez.
// Hatalar fırlatılmaz; {status,data} ya da {error,status} olarak döner (önbellek ve anlaşılır mesajlar sistemdedir).
export type ModuleHost={configuration():Promise<{apiKey:string}>;request(url:string,init?:RequestInit):Promise<{ok:boolean;status:number;json():Promise<unknown>;text():Promise<string>}>};
type Result={status:number;data:unknown}|{error:string;status:number};

const API="https://api.hikerapi.com";

export default function createModule(host:ModuleHost){
 // Kullanıcı adına göre profil (Instagram web_profile_info biçiminde).
 async function user(input:{username?:string}):Promise<Result>{
  const username=typeof input?.username==="string"?input.username.trim():"";
  if(!/^[A-Za-z0-9._]{1,30}$/.test(username))return {error:"Kullanıcı adı geçersiz.",status:400};
  const {apiKey}=await host.configuration();
  const response=await host.request(`${API}/a2/user?username=${encodeURIComponent(username)}`,{method:"GET",headers:{"x-access-key":apiKey,accept:"application/json"}}).catch(()=>null);
  if(!response)return {error:"HikerAPI'ye ulaşılamadı.",status:0};
  const data=await response.json().catch(()=>null);
  return response.ok?{status:response.status,data}:{error:`HikerAPI yanıtı ${response.status}.`,status:response.status};
 }
 return {user};
}
