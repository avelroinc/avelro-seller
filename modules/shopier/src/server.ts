// Independent provider package. Credentials and networking are supplied by the host.
// Shopier REST API (https://api.shopier.com/v1, Personal Access Token): every payment is a single-use hidden product carrying the
// order reference in its title. The customer pays on that product's Shopier page; Shopier's "order.created" webhook is re-checked
// against the API before the host settles anything, so a forged or replayed webhook can never mark an order paid.
export type ModuleHost={configuration():Promise<ShopierConfig>;request(url:string,init?:RequestInit):Promise<Response>};
type ShopierConfig={accessToken:string};
type Status="paid"|"failed"|"pending"|"ignored";
type PaymentInput={merchantOid:string;email:string;amountMicros:number;currency?:string;productName:string;successUrl:string;cancelUrl:string;returnUrl:string;callbackUrl:string};
type Order={id?:string;paymentStatus?:string;lineItems?:{productId?:string;title?:string}[]};

export default function createModule(host:ModuleHost){
const API="https://api.shopier.com/v1";
// Order reference written by the host: kind prefix + 32 hex characters (lib/payments/merchant-oid.ts).
const REFERENCE=/(?:sdep|sord|sgrp)[0-9a-f]{32}/i;

async function call<T>(config:ShopierConfig,method:"GET"|"POST",path:string,body?:unknown):Promise<{ok:boolean;status:number;data:T|null}>{
 const response=await host.request(`${API}${path}`,{method,headers:{authorization:`Bearer ${config.accessToken}`,accept:"application/json",...(body?{"content-type":"application/json"}:{})},body:body?JSON.stringify(body):undefined});
 let data:unknown=null;try{data=await response.json()}catch{data=null}
 // Responses are either the object itself or wrapped in { data }.
 const unwrapped=data&&typeof data==="object"&&!Array.isArray(data)&&"data" in data?(data as {data:unknown}).data:data;
 return {ok:response.ok,status:response.status,data:unwrapped as T|null};
}
const apiError=(data:unknown,fallback:string)=>{const d=data as {message?:unknown;error?:unknown}|null;const m=typeof d?.message==="string"?d.message:typeof d?.error==="string"?d.error:"";return new Error(m?`${fallback} (${m})`:fallback)};

// Shopier sends paid orders to one webhook per store. It is registered on the first payment (the host passes its callback address)
// and only when missing: duplicate registrations for the same event are known to time out on Shopier's side.
async function ensureWebhook(config:ShopierConfig,callbackUrl:string){
 const list=await call<{url?:string;event?:string}[]>(config,"GET","/webhooks");
 if(list.ok&&Array.isArray(list.data)&&list.data.some(hook=>hook?.url===callbackUrl&&hook?.event==="order.created"))return;
 const created=await call(config,"POST","/webhooks",{url:callbackUrl,event:"order.created"});
 if(!created.ok&&list.ok)throw apiError(created.data,"Shopier bildirim adresi kaydedilemedi.");
}

async function createPayment(config:ShopierConfig,input:PaymentInput){
 const price=(input.amountMicros/1000000).toFixed(2);
 if(!(Number(price)>0))throw new Error("Geçersiz tutar.");
 if(!REFERENCE.test(input.merchantOid))throw new Error("Geçersiz sipariş referansı.");
 await ensureWebhook(config,input.callbackUrl);
 // Shopier requires one public product image; the store's sharing image is used.
 // (The sandbox has no URL global, so the site address is cut from the return address.)
 const origin=String(input.returnUrl||"").match(/^https:\/\/[^/?#]+/)?.[0];
 if(!origin)throw new Error("Geçersiz site adresi.");
 const image=`${origin}/images/store-social-hero.webp`;
 const title=`${input.productName.replace(/\s+/g," ").trim().slice(0,80)||"Sipariş Ödemesi"} · ${input.merchantOid}`;
 const product=await call<{id?:string;url?:string}>(config,"POST","/products",{
  title,
  description:`Sipariş kodu: ${input.merchantOid}\nBu ürün yalnızca bu siparişin ödemesi içindir; ödeme tamamlanınca sipariş sitede kendiliğinden onaylanır.`,
  type:"digital",
  media:[{type:"image",url:image,placement:1}],
  priceData:{currency:input.currency||"TRY",price},
  stockQuantity:1,
  shippingPayer:"sellerPays",
  customListing:true,
 });
 const url=product.data?.url;
 if(!product.ok||typeof url!=="string"||!/^https:\/\//.test(url))throw apiError(product.data,"Shopier ödeme sayfası oluşturulamadı.");
 return {redirectUrl:url};
}

// The webhook body is only a hint: the order is read back from the API with the store's own token, and it counts only if one of its
// lines is the single-use product titled with this reference.
async function verifyWebhook(config:ShopierConfig,input:{payload:string}){
 const payload=input?.payload;
 if(typeof payload!=="string"||!payload)return null;
 let data:Order&{order?:Order};
 try{data=JSON.parse(payload)}catch{return null}
 const hint=data?.order&&typeof data.order==="object"?data.order:data;
 const orderId=typeof hint?.id==="string"?hint.id.trim():"";
 const merchantOid=(hint?.lineItems||[]).map(line=>String(line?.title||"").match(REFERENCE)?.[0]).find(Boolean)?.toLowerCase()||"";
 if(!merchantOid)return {merchantOid:"",status:"ignored" as Status};
 if(!/^[A-Za-z0-9_-]{1,80}$/.test(orderId))return null;
 const order=await call<Order>(config,"GET",`/orders/${encodeURIComponent(orderId)}`);
 if(!order.ok||!order.data)return null;
 const ours=(order.data.lineItems||[]).some(line=>String(line?.title||"").toLowerCase().includes(merchantOid));
 if(!ours)return null;
 const status:Status=String(order.data.paymentStatus||"").toLowerCase()==="paid"?"paid":"pending";
 return {merchantOid,status};
}

return {createPayment: async (input:PaymentInput) => createPayment(await host.configuration(),input),
verifyCallback: async (input:{payload:string}) => verifyWebhook(await host.configuration(),input)};
}
