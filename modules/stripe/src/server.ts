// Independent provider package. Credentials and networking are supplied by the host.
export type ModuleHost={configuration():Promise<StripeConfig>;request(url:string,init?:RequestInit):Promise<Response>};
type StripeConfig={secretKey:string;webhookSecret:string};
type Status="paid"|"failed"|"pending"|"ignored";
export default function createModule(host:ModuleHost){
const encoder=new TextEncoder();

async function hmacSha256Hex(secret:string,message:string){
 const key=await crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const signature=await crypto.subtle.sign("HMAC",key,encoder.encode(message));
 return [...new Uint8Array(signature)].map(byte=>byte.toString(16).padStart(2,"0")).join("");
}

// Constant-time-ish comparison to avoid short-circuiting on the first differing byte.
function timingSafeEqual(a:string,b:string){
 if(a.length!==b.length)return false;
 let diff=0;
 for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
 return diff===0;
}

// Stripe amounts are integer kuruş (TL * 100); our amounts are stored as micros (TL * 1,000,000).
const microsToKurus=(amountMicros:number)=>Math.round(amountMicros/10000);

async function createCheckoutSession(config:StripeConfig,input:{merchantOid:string;email:string;amountMicros:number;currency?:"TRY"|"USD"|"EUR";successUrl:string;cancelUrl:string;productName:string}){
 const amount=microsToKurus(input.amountMicros);
 if(!Number.isInteger(amount)||amount<1)throw new Error("Geçersiz tutar.");
 const body=new URLSearchParams({
  mode:"payment",success_url:input.successUrl,cancel_url:input.cancelUrl,client_reference_id:input.merchantOid,customer_email:input.email,
  "line_items[0][quantity]":"1","line_items[0][price_data][currency]":(input.currency||"TRY").toLowerCase(),"line_items[0][price_data][unit_amount]":String(amount),"line_items[0][price_data][product_data][name]":input.productName,
  "metadata[merchant_oid]":input.merchantOid,"payment_intent_data[metadata][merchant_oid]":input.merchantOid,
 });
 const response=await host.request("https://api.stripe.com/v1/checkout/sessions",{method:"POST",headers:{authorization:`Bearer ${config.secretKey}`,"content-type":"application/x-www-form-urlencoded"},body});
 const result=await response.json() as {url?:string;error?:{message?:string}};
 if(!response.ok||!result.url)throw new Error(result.error?.message||"Stripe ödeme başlatılamadı.");
 return {redirectUrl:result.url};
}

// Verifies the Stripe-Signature header (t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<raw body>">) and maps the event to a settlement status.
async function verifyStripeCallback(config:StripeConfig,input:{payload:string;signature:string}){
 const {payload,signature}=input||{} as {payload:string;signature:string};
 if(typeof payload!=="string"||typeof signature!=="string"||!payload||!signature)return null;
 let timestamp="";const candidates:string[]=[];
 for(const part of signature.split(",")){
  const index=part.indexOf("=");if(index<1)continue;
  const key=part.slice(0,index).trim(),value=part.slice(index+1).trim();
  if(key==="t")timestamp=value;else if(key==="v1")candidates.push(value);
 }
 if(!/^\d{1,12}$/.test(timestamp)||!candidates.length)return null;
 // Stripe recommends rejecting events older than five minutes so a captured request cannot be replayed later.
 if(Math.abs(Date.now()/1000-Number(timestamp))>300)return null;
 const expected=await hmacSha256Hex(config.webhookSecret,`${timestamp}.${payload}`);
 if(!candidates.some(candidate=>timingSafeEqual(candidate,expected)))return null;
 let event:{type?:string;data?:{object?:{client_reference_id?:string;metadata?:{merchant_oid?:string};payment_status?:string}}};
 try{event=JSON.parse(payload)}catch{return null}
 const object=event.data?.object,merchantOid=String(object?.client_reference_id||object?.metadata?.merchant_oid||"");
 let status:Status="ignored";
 if(merchantOid){
  if(event.type==="checkout.session.completed")status=object?.payment_status==="paid"?"paid":"pending";
  else if(event.type==="checkout.session.async_payment_succeeded")status="paid";
  else if(event.type==="checkout.session.async_payment_failed"||event.type==="checkout.session.expired")status="failed";
 }
 return {merchantOid,status};
}

return {createPayment: async (input:Parameters<typeof createCheckoutSession>[1]) => createCheckoutSession(await host.configuration(),input),
verifyCallback: async (input:{payload:string;signature:string}) => verifyStripeCallback(await host.configuration(),input)};
}
