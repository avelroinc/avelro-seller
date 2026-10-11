// Independent provider package. Credentials and networking are supplied by the host.
export type ModuleHost={configuration():Promise<PaytrConfig>;request(url:string,init?:RequestInit):Promise<Response>};
type PaytrConfig={merchantId:string;merchantKey:string;merchantSalt:string};
export default function createModule(host:ModuleHost){
const fetch=(url:string,init?:RequestInit)=>host.request(url,init);
const encoder=new TextEncoder();

async function hmacKey(secret:string){return crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"])}

async function hmacSha256Base64(secret:string,message:string){
 const signature=await crypto.subtle.sign("HMAC",await hmacKey(secret),encoder.encode(message));
 return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

async function hmacSha256Hex(secret:string,message:string){
 const signature=await crypto.subtle.sign("HMAC",await hmacKey(secret),encoder.encode(message));
 return [...new Uint8Array(signature)].map(byte=>byte.toString(16).padStart(2,"0")).join("");
}

// Constant-time-ish comparison to avoid short-circuiting on the first differing byte.
function timingSafeEqual(a:string,b:string){
 if(a.length!==b.length)return false;
 let diff=0;
 for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
 return diff===0;
}


class PaytrError extends Error{}

// PayTR amounts are integer kuruş (TL * 100); our amounts are stored as micros (TL * 1,000,000).
const microsToKurus=(amountMicros:number)=>Math.round(amountMicros/10000);

async function createPaytrToken(config:PaytrConfig,testMode:boolean,input:{merchantOid:string;email:string;amountMicros:number;currency?:"TRY"|"USD"|"EUR";userIp:string;okUrl:string;failUrl:string;userName:string;basketLabel:string}){
 const paymentAmount=microsToKurus(input.amountMicros),
  userBasket=btoa(unescape(encodeURIComponent(JSON.stringify([[input.basketLabel,(paymentAmount/100).toFixed(2),1]])))),
  noInstallment="0",maxInstallment="0",currency=({TRY:"TL",USD:"USD",EUR:"EUR"} as const)[input.currency||"TRY"]||"TL",
  testModeValue=testMode?"1":"0";
 const hashStr=`${config.merchantId}${input.userIp}${input.merchantOid}${input.email}${paymentAmount}${userBasket}${noInstallment}${maxInstallment}${currency}${testModeValue}`;
 const paytrToken=await hmacSha256Base64(config.merchantKey,hashStr+config.merchantSalt);
 const body=new URLSearchParams({merchant_id:config.merchantId,user_ip:input.userIp,merchant_oid:input.merchantOid,email:input.email,payment_amount:String(paymentAmount),payment_type:"card",installment_count:"0",currency,test_mode:testModeValue,non_3d:"0",merchant_ok_url:input.okUrl,merchant_fail_url:input.failUrl,user_name:input.userName,user_address:"Belirtilmedi",user_phone:"0000000000",user_basket:userBasket,debug_on:"0",no_installment:noInstallment,max_installment:maxInstallment,lang:"tr",timeout_limit:"30",paytr_token:paytrToken});
 const response=await fetch("https://www.paytr.com/odeme/api/get-token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body,signal:AbortSignal.timeout(15000)});
 const result=await response.json() as {status?:string;token?:string;reason?:string};
 if(result.status!=="success"||!result.token)throw new PaytrError(result.reason||"PayTR ödeme başlatılamadı.");
 return {token:result.token,iframeUrl:`https://www.paytr.com/odeme/guvenli/${result.token}`};
}

async function verifyPaytrCallback(config:PaytrConfig,fields:Record<string,string>){
 const {merchant_oid:merchantOid,status,total_amount:totalAmount,hash}=fields;
 if(!merchantOid||!status||!totalAmount||!hash)return null;
 const hashStr=`${merchantOid}${config.merchantSalt}${status}${totalAmount}`,
  expected=await hmacSha256Base64(config.merchantKey,hashStr);
 if(!timingSafeEqual(expected,hash))return null;
 return {merchantOid,success:status==="success",totalAmountKurus:Number(totalAmount)};
}

return {createPayment: async (input:Parameters<typeof createPaytrToken>[2]&{testMode:boolean}) => createPaytrToken(await host.configuration(),input.testMode,input),
verifyCallback: async (fields:Record<string,string>) => verifyPaytrCallback(await host.configuration(),fields)};
}
