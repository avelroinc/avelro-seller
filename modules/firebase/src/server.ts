// Independent provider package. Credentials and networking are supplied by the host.
export type ModuleHost={configuration():Promise<FirebaseConfig>;request(url:string,init?:RequestInit):Promise<Response>};
// Firebase Telefon Doğrulama (Firebase Authentication › Sign-in method › Phone). SMS'i Firebase gönderir:
// 1) recaptchaParams: sitenin reCAPTCHA anahtarı (tarayıcı bununla robot denetimi yapar; site alan adı Firebase'de Authorized domains'e eklenmelidir).
// 2) sendCode: numara + reCAPTCHA yanıtıyla kod gönderilir, sessionInfo döner.
// 3) verifyCode: sessionInfo + koddan doğrulanan numara döner (sunucu Firebase'e sorar; tarayıcıya güvenilmez).
type FirebaseConfig={webApiKey:string};
export default function createModule(host:ModuleHost){
const fetch=(url:string,init?:RequestInit)=>host.request(url,init);
class FirebaseError extends Error{}
const MESSAGES:Record<string,string>={INVALID_PHONE_NUMBER:"Telefon numarası geçersiz.",TOO_MANY_ATTEMPTS_TRY_LATER:"Çok fazla deneme yapıldı; biraz sonra tekrar deneyin.",QUOTA_EXCEEDED:"Firebase SMS kotası doldu.",INVALID_CODE:"Doğrulama kodu hatalı.",INVALID_SESSION_INFO:"Doğrulama oturumu geçersiz; yeni kod isteyin.",SESSION_EXPIRED:"Kodun süresi doldu; yeni kod isteyin.",CAPTCHA_CHECK_FAILED:"Robot doğrulaması başarısız; sayfayı yenileyip tekrar deneyin.",INVALID_RECAPTCHA_TOKEN:"Robot doğrulaması başarısız; sayfayı yenileyip tekrar deneyin.",OPERATION_NOT_ALLOWED:"Firebase bu işleme izin vermedi (Phone girişi, SMS bölge politikası ya da anahtarın projesi).",API_KEY_INVALID:"Firebase Web API anahtarı geçersiz.",UNAUTHORIZED_DOMAIN:"Site alan adı Firebase Authorized domains listesinde yok."};
async function call<T>(method:string,body?:unknown):Promise<T>{
 const {webApiKey}=await host.configuration(),url=`https://identitytoolkit.googleapis.com/v1/${method}?key=${encodeURIComponent(webApiKey.trim())}`;
 const response=await fetch(url,body===undefined?{signal:AbortSignal.timeout(15000)}:{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)}),
  data=await response.json().catch(()=>null) as (T&{error?:{message?:string}})|null;
 // Firebase hatası "KOD : ayrıntı" biçimindedir; Türkçe karşılığın yanında ayrıntı da gösterilir (ör. SMS bölgesi izinli değil).
 if(!response.ok||!data){const text=String(data?.error?.message||""),code=text.split(/[ :]/)[0],detail=text.slice(code.length).replace(/^[\s:]+/,"").trim();
  const region=/region/i.test(detail)?"SMS bölge politikası bu numaranın ülkesine izin vermiyor (Authentication › Settings › SMS region policy).":"";
  throw new FirebaseError(`Firebase: ${region||MESSAGES[code]||text||"İstek tamamlanamadı."}${!region&&MESSAGES[code]&&detail?` (${detail})`:""}`)}
 return data;
}
return {
 recaptchaParams:async()=>({siteKey:(await call<{recaptchaSiteKey?:string}>("recaptchaParams")).recaptchaSiteKey||""}),
 sendCode:async(input:{phoneNumber:string;recaptchaToken:string})=>({sessionInfo:(await call<{sessionInfo?:string}>("accounts:sendVerificationCode",{phoneNumber:input.phoneNumber,recaptchaToken:input.recaptchaToken})).sessionInfo||""}),
 verifyCode:async(input:{sessionInfo:string;code:string})=>({phoneNumber:(await call<{phoneNumber?:string}>("accounts:signInWithPhoneNumber",{sessionInfo:input.sessionInfo,code:input.code})).phoneNumber||""}),
};
}
