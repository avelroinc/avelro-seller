// Independent provider package. Credentials and networking are supplied by the host.
export type ModuleHost={configuration():Promise<HeleketConfig>;request(url:string,init?:RequestInit):Promise<Response>};
type HeleketConfig={merchantId:string;paymentKey:string};
type Status="paid"|"failed"|"pending"|"ignored";
export default function createModule(host:ModuleHost){
const encoder=new TextEncoder();

// The API signs every request and webhook with md5(base64(body) + payment key); Web Crypto has no MD5, so it is implemented here (RFC 1321).
function md5Hex(bytes:Uint8Array){
 const shifts=[7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
 const constants=Array.from({length:64},(_,i)=>Math.floor(Math.abs(Math.sin(i+1))*4294967296)>>>0);
 const padded=new Uint8Array((((bytes.length+8)>>>6)+1)<<6);
 padded.set(bytes);padded[bytes.length]=0x80;
 const view=new DataView(padded.buffer);
 view.setUint32(padded.length-8,(bytes.length<<3)>>>0,true);view.setUint32(padded.length-4,Math.floor(bytes.length/536870912),true);
 let a0=0x67452301,b0=0xefcdab89|0,c0=0x98badcfe|0,d0=0x10325476;
 for(let offset=0;offset<padded.length;offset+=64){
  let a=a0,b=b0,c=c0,d=d0;
  for(let i=0;i<64;i++){
   let f:number,g:number;
   if(i<16){f=(b&c)|(~b&d);g=i}
   else if(i<32){f=(d&b)|(~d&c);g=(5*i+1)%16}
   else if(i<48){f=b^c^d;g=(3*i+5)%16}
   else{f=c^(b|~d);g=(7*i)%16}
   const mixed=(a+f+constants[i]+view.getUint32(offset+g*4,true))|0;
   a=d;d=c;c=b;b=(b+((mixed<<shifts[i])|(mixed>>>(32-shifts[i]))))|0;
  }
  a0=(a0+a)|0;b0=(b0+b)|0;c0=(c0+c)|0;d0=(d0+d)|0;
 }
 const out=new DataView(new ArrayBuffer(16));
 [a0,b0,c0,d0].forEach((value,index)=>out.setUint32(index*4,value>>>0,true));
 return [...new Uint8Array(out.buffer)].map(byte=>byte.toString(16).padStart(2,"0")).join("");
}

function toBase64(text:string){
 let binary="";
 for(const byte of encoder.encode(text))binary+=String.fromCharCode(byte);
 return btoa(binary);
}
const sign=(body:string,paymentKey:string)=>md5Hex(encoder.encode(toBase64(body)+paymentKey));

// Constant-time-ish comparison to avoid short-circuiting on the first differing byte.
function timingSafeEqual(a:string,b:string){
 if(a.length!==b.length)return false;
 let diff=0;
 for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
 return diff===0;
}

async function createInvoice(config:HeleketConfig,input:{merchantOid:string;amountMicros:number;currency?:string;callbackUrl:string;returnUrl:string;successUrl:string}){
 const amount=(input.amountMicros/1000000).toFixed(2);
 if(!(Number(amount)>0))throw new Error("Geçersiz tutar.");
 const body=JSON.stringify({amount,currency:input.currency||"TRY",order_id:input.merchantOid,url_callback:input.callbackUrl,url_return:input.returnUrl,url_success:input.successUrl,lifetime:3600,is_payment_multiple:false});
 const response=await host.request("https://api.heleket.com/v1/payment",{method:"POST",headers:{"content-type":"application/json",merchant:config.merchantId,sign:sign(body,config.paymentKey)},body});
 const result=await response.json() as {state?:number;message?:string;result?:{url?:string}};
 if(!response.ok||result.state!==0||!result.result?.url)throw new Error(result.message||"Heleket ödeme başlatılamadı.");
 return {redirectUrl:result.result.url};
}

// The webhook body carries its own "sign". PHP signs json_encode(<body without sign>), which escapes "/" unless told otherwise, so
// every plausible encoding of the unsigned body is tried; matching any of them still requires knowing the payment key.
async function verifyWebhook(config:HeleketConfig,input:{payload:string}){
 const payload=input?.payload;
 if(typeof payload!=="string"||!payload)return null;
 let data:Record<string,unknown>;
 try{data=JSON.parse(payload)}catch{return null}
 if(!data||typeof data!=="object"||Array.isArray(data))return null;
 const provided=String(data.sign||"").toLowerCase();
 if(!/^[0-9a-f]{32}$/.test(provided))return null;
 const rest={...data};delete rest.sign;
 const compact=JSON.stringify(rest),unsignedRaw=payload.replace(/"sign"\s*:\s*"[^"]*"\s*,?/,"").replace(/,\s*}\s*$/,"}");
 const candidates=[compact,compact.replace(/\//g,"\\/"),unsignedRaw];
 if(!candidates.some(candidate=>timingSafeEqual(sign(candidate,config.paymentKey),provided)))return null;
 const merchantOid=String(data.order_id||""),state=String(data.status||"");
 let status:Status="ignored";
 if(merchantOid&&(data.type===undefined||data.type==="payment")){
  if(state==="paid"||state==="paid_over")status="paid";
  else if(state==="fail"||state==="cancel"||state==="system_fail")status="failed";
  else status="pending";
 }
 return {merchantOid,status};
}

return {createPayment: async (input:Parameters<typeof createInvoice>[1]) => createInvoice(await host.configuration(),input),
verifyCallback: async (input:{payload:string}) => verifyWebhook(await host.configuration(),input)};
}
