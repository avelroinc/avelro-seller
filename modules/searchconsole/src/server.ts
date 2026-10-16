// Google Search Console Entegrasyonu: sitenin Google aramalarındaki performansı (sorgu, sayfa, gösterim, tıklama, ortalama sıra).
// Bağımsız sağlayıcı paketidir: hizmet hesabı anahtarı ve ağ erişimi sistem tarafından verilir; modül veritabanına ve başka adrese
// erişemez. Google'a hizmet hesabıyla (JWT, salt okunur izin) bağlanır; hesap Search Console'da siteye kullanıcı olarak eklenmiş olmalı.
// Hatalar fırlatılmaz, {error,status} olarak döner (sistem kullanıcıya anlaşılır mesaj gösterebilsin).
export type ModuleHost={configuration():Promise<Config>;request(url:string,init?:RequestInit):Promise<{ok:boolean;status:number;json():Promise<unknown>;text():Promise<string>}>};
type Config={serviceAccount:string};
type Failure={error:string;status:number};
type QueryInput={siteUrl:string;startDate:string;endDate:string;dimensions?:string[];rowLimit?:number};

const TOKEN="https://oauth2.googleapis.com/token",API="https://searchconsole.googleapis.com/webmasters/v3";
const SCOPE="https://www.googleapis.com/auth/webmasters.readonly";
const b64url=(bytes:Uint8Array)=>{let s="";for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")};
const text64=(value:string)=>b64url(new TextEncoder().encode(value));

function account(raw:string):{email:string;key:string}|null{
 try{const j=JSON.parse(raw) as {client_email?:unknown;private_key?:unknown};return typeof j.client_email==="string"&&typeof j.private_key==="string"&&j.private_key.includes("PRIVATE KEY")?{email:j.client_email,key:j.private_key}:null}catch{return null}
}
// Hizmet hesabının imzalı isteğiyle (RS256) bir saatlik erişim anahtarı alınır.
async function accessToken(host:ModuleHost,config:Config):Promise<{token:string}|Failure>{
 const a=account(config.serviceAccount);if(!a)return {error:"Hizmet hesabı anahtarı geçersiz. Google Cloud'dan indirilen JSON dosyasının tamamını yapıştırın.",status:400};
 const der=atob(a.key.replace(/-----[^-]+-----/g,"").replace(/\s+/g,"")),bytes=new Uint8Array(der.length);for(let i=0;i<der.length;i++)bytes[i]=der.charCodeAt(i);
 let key:CryptoKey;try{key=await crypto.subtle.importKey("pkcs8",bytes,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["sign"])}catch{return {error:"Hizmet hesabının özel anahtarı okunamadı. JSON dosyasını değiştirmeden yapıştırın.",status:400}}
 const now=Math.floor(Date.now()/1000),body=`${text64(JSON.stringify({alg:"RS256",typ:"JWT"}))}.${text64(JSON.stringify({iss:a.email,scope:SCOPE,aud:TOKEN,iat:now,exp:now+3600}))}`;
 const signature=new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5",key,new TextEncoder().encode(body)));
 const response=await host.request(TOKEN,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion:`${body}.${b64url(signature)}`}).toString()}).catch(()=>null);
 if(!response)return {error:"Google'a ulaşılamadı ya da yanıt zamanında gelmedi.",status:0};
 const data=await response.json().catch(()=>({})) as {access_token?:string;error_description?:string};
 if(!response.ok||!data.access_token)return {error:`Google hizmet hesabını kabul etmedi${data.error_description?`: ${String(data.error_description).slice(0,120)}`:"."} Hesap silinmiş ya da anahtarı iptal edilmiş olabilir.`,status:401};
 return {token:data.access_token};
}

export default function createModule(host:ModuleHost){
 async function call(path:string,body?:unknown):Promise<{data:Record<string,unknown>}|Failure>{
  const t=await accessToken(host,await host.configuration());if("error" in t)return t;
  const response=await host.request(`${API}/${path}`,{method:body?"POST":"GET",headers:{authorization:`Bearer ${t.token}`,"content-type":"application/json"},body:body?JSON.stringify(body):undefined}).catch(()=>null);
  if(!response)return {error:"Search Console'a ulaşılamadı ya da yanıt zamanında gelmedi.",status:0};
  const data=await response.json().catch(()=>({})) as Record<string,unknown>&{error?:{message?:string}};
  if(response.ok)return {data};
  if(response.status===403)return {error:"Hizmet hesabının bu siteye erişimi yok. Hesabın e-posta adresini Search Console › Ayarlar › Kullanıcılar ve İzinler'den ekleyin.",status:403};
  if(response.status===429)return {error:"Search Console istek sınırına ulaşıldı. Biraz sonra tekrar deneyin.",status:429};
  const raw=String(data.error?.message||"").slice(0,160);
  return {error:`Search Console isteği tamamlanamadı${raw?`: ${raw}`:"."}`,status:response.status};
 }

 // Hizmet hesabının erişebildiği mülkler (ör. "sc-domain:ornek.com", "https://ornek.com/") ve hesabın e-posta adresi.
 async function sites(){
  const r=await call("sites");if("error" in r)return r;
  const list=((r.data.siteEntry||[]) as {siteUrl?:string;permissionLevel?:string}[]).filter(s=>typeof s.siteUrl==="string"&&s.permissionLevel!=="siteUnverifiedUser").map(s=>s.siteUrl as string);
  return {sites:list,email:account((await host.configuration()).serviceAccount)?.email||""};
 }

 // Arama performansı: tarih aralığında seçilen boyutlara göre (query, page, date, country, device) satırlar; en çok 25.000 satır.
 async function query(input:QueryInput){
  const date=/^\d{4}-\d{2}-\d{2}$/,dims=["query","page","date","country","device"];
  if(typeof input?.siteUrl!=="string"||!input.siteUrl||!date.test(input.startDate)||!date.test(input.endDate))return {error:"Sorgu geçersiz.",status:400};
  const dimensions=(Array.isArray(input.dimensions)?input.dimensions:["query"]).filter(d=>dims.includes(d)).slice(0,3);
  const r=await call(`sites/${encodeURIComponent(input.siteUrl)}/searchAnalytics/query`,{startDate:input.startDate,endDate:input.endDate,dimensions,rowLimit:Math.max(1,Math.min(25000,Number(input.rowLimit)||1000)),dataState:"final"});
  if("error" in r)return r;
  const rows=((r.data.rows||[]) as {keys?:string[];clicks?:number;impressions?:number;ctr?:number;position?:number}[]).map(x=>({keys:Array.isArray(x.keys)?x.keys.map(String):[],clicks:Number(x.clicks)||0,impressions:Number(x.impressions)||0,ctr:Number(x.ctr)||0,position:Number(x.position)||0}));
  return {rows};
 }

 return {sites,query};
}
