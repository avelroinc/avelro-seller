// Independent provider package. Credentials and networking are supplied by the host.
export type ModuleHost={configuration():Promise<FirebaseEmailConfig>;request(url:string,init?:RequestInit):Promise<Response>};
type FirebaseEmailConfig={webApiKey:string};
export default function createModule(host:ModuleHost){
const fetch=(url:string,init?:RequestInit)=>host.request(url,init);

class FirebaseEmailError extends Error{}

// Firebase has no generic "send this exact text to this address" email API - the closest
// fit for a login OTP is its own Email Link (passwordless) sign-in flow: we ask Firebase to
// email the user a sign-in link, and once they click it, we exchange the oobCode embedded in
// that link for confirmation the click really came from that inbox. The email's subject/body
// is Firebase's own template (limited customization in the Firebase console), not ours - the
// user accepted this tradeoff over building a custom code-based email sender.
async function sendFirebaseEmailSignInLink(config:FirebaseEmailConfig,email:string,continueUrl:string){
 const response=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(config.webApiKey)}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({requestType:"EMAIL_SIGNIN",email,continueUrl,canHandleCodeInApp:true}),signal:AbortSignal.timeout(15000)}),
  data=await response.json().catch(()=>null) as {error?:{message?:string}}|null;
 if(!response.ok)throw new FirebaseEmailError(data?.error?.message||"Doğrulama e-postası gönderilemedi.");
}

async function verifyFirebaseEmailSignInLink(config:FirebaseEmailConfig,email:string,oobCode:string){
 const response=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithEmailLink?key=${encodeURIComponent(config.webApiKey)}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,oobCode}),signal:AbortSignal.timeout(15000)}),
  data=await response.json().catch(()=>null) as {error?:{message?:string};email?:string}|null;
 if(!response.ok||!data||data.email?.toLowerCase()!==email.toLowerCase())return false;
 return true;
}

return {sendLink: async (input:{email:string;continueUrl:string}) => sendFirebaseEmailSignInLink(await host.configuration(),input.email,input.continueUrl),
verifyLink: async (input:{email:string;oobCode:string}) => verifyFirebaseEmailSignInLink(await host.configuration(),input.email,input.oobCode)};
}
