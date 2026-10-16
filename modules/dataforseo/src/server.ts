// DataForSEO Entegrasyonu: Google Ads (Anahtar Kelime Planlayıcı) verisiyle kelimelerin aylık arama sayısı, ilgili kelime önerileri ve
// hesap bakiyesi. Bağımsız sağlayıcı paketidir: giriş bilgileri ve ağ erişimi sistem tarafından verilir; modül veritabanına ve başka
// adrese erişemez. Hatalar fırlatılmaz, {error,status} olarak döner (sistem kullanıcıya anlaşılır mesaj gösterebilsin). Her başarılı
// yanıtta isteğin ücreti (cost, USD) döner.
export type ModuleHost={configuration():Promise<Config>;request(url:string,init?:RequestInit):Promise<{ok:boolean;status:number;json():Promise<unknown>;text():Promise<string>}>};
type Config={login:string;password:string};
type Failure={error:string;status:number};
type VolumeInput={keywords:string[];locationCode?:number;languageCode?:string};
type IdeasInput={keyword:string;locationCode?:number;languageCode?:string;limit?:number};
type Envelope={status_code?:number;status_message?:string;cost?:number;tasks?:{status_code?:number;status_message?:string;cost?:number;result?:unknown[]|null}[]};
type Row={keyword?:string;search_volume?:number|null;competition?:string|null;cpc?:number|null};

const API="https://api.dataforseo.com/v3";
// Basic yetkilendirme: giriş ve şifre UTF-8 olarak base64'e çevrilir (Türkçe karakter de olabilir).
function basic(config:Config){const bytes=new TextEncoder().encode(`${config.login}:${config.password}`);let text="";for(const b of bytes)text+=String.fromCharCode(b);return `Basic ${btoa(text)}`}
// Google Ads yalnızca harf, rakam ve boşluk kabul eder; tek bir geçersiz kelime bütün isteği reddettirir. Kesme işareti atılır
// ("instagram'da" → "instagramda"), diğer işaretler boşluk olur; 80 karakteri ya da 10 kelimeyi aşanlar alınmaz.
export function cleanKeyword(value:string){return value.replace(/İ/g,"i").toLowerCase().replace(/['’`]/g,"").replace(/[^\p{L}\p{N}\s]/gu," ").replace(/\s+/g," ").trim()}
const valid=(k:string)=>k.length>=2&&k.length<=80&&k.split(" ").length<=10;
const place=(input:{locationCode?:number;languageCode?:string})=>({location_code:Number(input.locationCode)||2792,language_code:typeof input.languageCode==="string"&&/^[a-z]{2}$/.test(input.languageCode)?input.languageCode:"tr"});
const item=(x:Row)=>({keyword:String(x.keyword),volume:typeof x.search_volume==="number"?x.search_volume:null,competition:typeof x.competition==="string"?x.competition:null,cpc:typeof x.cpc==="number"?x.cpc:null});

export default function createModule(host:ModuleHost){
 async function call(path:string,body?:unknown):Promise<{result:unknown[];cost:number}|Failure>{
  const config=await host.configuration();
  const response=await host.request(`${API}/${path}`,{method:body?"POST":"GET",headers:{authorization:basic(config),"content-type":"application/json"},body:body?JSON.stringify(body):undefined}).catch(()=>null);
  if(!response)return {error:"DataForSEO'ya ulaşılamadı ya da yanıt zamanında gelmedi.",status:0};
  if(response.status===401)return {error:"DataForSEO API girişi ya da şifresi yanlış. Bilgileri app.dataforseo.com › API Access'ten kopyalayın.",status:401};
  const data=await response.json().catch(()=>({})) as Envelope;
  const task=data.tasks?.[0],code=task?.status_code||data.status_code||0,message=String(task?.status_message||data.status_message||"").slice(0,160);
  if(response.ok&&code===20000)return {result:Array.isArray(task?.result)?task!.result!:[],cost:Number(task?.cost??data.cost)||0};
  if(code===40100||code===40101)return {error:"DataForSEO API girişi ya da şifresi yanlış.",status:401};
  if(code===40200||code===40210)return {error:"DataForSEO hesabında yeterli bakiye yok. app.dataforseo.com'dan bakiye yükleyin.",status:402};
  if(code===40202||response.status===429)return {error:"DataForSEO istek sınırına ulaşıldı. Biraz sonra tekrar deneyin.",status:429};
  return {error:`DataForSEO isteği tamamlanamadı${message?`: ${message}`:"."}`,status:response.status||502};
 }

 // Arama hacmi: en çok 1000 kelime. Varsayılan Türkiye (2792) ve Türkçe.
 async function searchVolume(input:VolumeInput){
  const keywords=[...new Set((Array.isArray(input?.keywords)?input.keywords:[]).filter((k):k is string=>typeof k==="string").map(cleanKeyword).filter(valid))].slice(0,1000);
  if(!keywords.length)return {error:"Kelime listesi boş.",status:400};
  const r=await call("keywords_data/google_ads/search_volume/live",[{keywords,...place(input)}]);
  if("error" in r)return r;
  return {items:(r.result as Row[]).filter(x=>x&&typeof x.keyword==="string").map(item),cost:r.cost};
 }

 // İlgili kelimeler: Google Ads'in bir kelime için önerdiği aramalar, aylık arama sayısıyla (çoktan aza; en çok 200).
 async function keywordIdeas(input:IdeasInput){
  const keyword=cleanKeyword(typeof input?.keyword==="string"?input.keyword:"");
  if(!valid(keyword))return {error:"Kelime geçersiz.",status:400};
  const r=await call("keywords_data/google_ads/keywords_for_keywords/live",[{keywords:[keyword],...place(input),sort_by:"search_volume"}]);
  if("error" in r)return r;
  const items=(r.result as Row[]).filter(x=>x&&typeof x.keyword==="string").map(item).sort((a,b)=>(b.volume??-1)-(a.volume??-1)).slice(0,Math.max(1,Math.min(200,Number(input.limit)||100)));
  return {items,cost:r.cost};
 }

 // Hesap: bağlantı denemesi ve kalan bakiye (USD).
 async function account(){
  const r=await call("appendix/user_data");
  if("error" in r)return r;
  const money=(r.result[0] as {money?:{balance?:number}}|undefined)?.money;
  return {balance:typeof money?.balance==="number"?money.balance:null};
 }

 return {searchVolume,keywordIdeas,account};
}
