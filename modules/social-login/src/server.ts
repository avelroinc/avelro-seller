// Sosyal Giriş Entegrasyonu: müşterinin Google ya da Facebook'tan döndüğü yetkilendirme kodunu sunucudan sunucuya erişim anahtarıyla
// değiştirir ve profili (kimlik, e-posta, ad) okur. Yönlendirme adresi, state ve PKCE doğrulaması sistemdedir; uygulama bilgileri
// (istemci kimliği ve gizli anahtar) işlem sırasında sistem tarafından verilir. Modül veritabanına ve başka adrese erişemez.
// Hatalar fırlatılmaz; {profile} ya da {error,status} olarak döner.
export type ModuleHost={configuration():Promise<{clientId:string;clientSecret:string}>;request(url:string,init?:RequestInit):Promise<{ok:boolean;status:number;json():Promise<unknown>;text():Promise<string>}>};
type Profile={subject:string;email:string;emailVerified:boolean;name:string};
type Result={profile:Profile}|{error:string;status:number};

const FACEBOOK_GRAPH="https://graph.facebook.com/v19.0";
const failed=(status:number):Result=>({error:"Sağlayıcı girişi doğrulayamadı.",status});

async function hmacHex(secret:string,value:string){
 const encoder=new TextEncoder(),key=await crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 return Array.from(new Uint8Array(await crypto.subtle.sign("HMAC",key,encoder.encode(value))),b=>b.toString(16).padStart(2,"0")).join("");
}

export default function createModule(host:ModuleHost){
 async function read(url:string,init?:RequestInit){
  const response=await host.request(url,init).catch(()=>null);
  const data=response?await response.json().catch(()=>null) as Record<string,unknown>|null:null;
  return response?.ok&&data?{data}:{status:response?.status||0};
 }
 async function profile(input:{provider?:string;code?:string;redirectUri?:string;verifier?:string}):Promise<Result>{
  const code=String(input?.code||""),redirectUri=String(input?.redirectUri||""),verifier=String(input?.verifier||"");
  if(!code||!redirectUri||!verifier)return {error:"Giriş isteği geçersiz.",status:400};
  const {clientId,clientSecret}=await host.configuration();
  if(input.provider==="GOOGLE"){
   const token=await read("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,code,grant_type:"authorization_code",redirect_uri:redirectUri,code_verifier:verifier}).toString()});
   const accessToken=String(token.data?.access_token||"");if(!accessToken)return failed(token.status||502);
   const info=await read("https://openidconnect.googleapis.com/v1/userinfo",{method:"GET",headers:{authorization:`Bearer ${accessToken}`}});
   if(!info.data)return failed(info.status);
   return {profile:{subject:String(info.data.sub||""),email:String(info.data.email||"").toLowerCase(),emailVerified:info.data.email_verified===true||info.data.email_verified==="true",name:String(info.data.name||"").slice(0,60)}};
  }
  if(input.provider!=="FACEBOOK")return {error:"Sağlayıcı geçersiz.",status:400};
  const token=await read(`${FACEBOOK_GRAPH}/oauth/access_token?${new URLSearchParams({client_id:clientId,client_secret:clientSecret,redirect_uri:redirectUri,code,code_verifier:verifier})}`,{method:"GET"});
  const accessToken=String(token.data?.access_token||"");if(!accessToken)return failed(token.status||502);
  const me=await read(`${FACEBOOK_GRAPH}/me?${new URLSearchParams({fields:"id,name,email",access_token:accessToken,appsecret_proof:await hmacHex(clientSecret,accessToken)})}`,{method:"GET"});
  if(!me.data)return failed(me.status);
  // Facebook yalnızca hesapta onaylanmış e-postayı döndürür.
  return {profile:{subject:String(me.data.id||""),email:String(me.data.email||"").toLowerCase(),emailVerified:Boolean(me.data.email),name:String(me.data.name||"").slice(0,60)}};
 }
 return {profile};
}
