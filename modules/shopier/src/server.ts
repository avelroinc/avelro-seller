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
const PRODUCT_IMAGE="https://raw.githubusercontent.com/avelroinc/avelro-seller/main/modules/shopier/assets/odeme.png";
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
 // Shopier requires one public product image. A fixed PNG kept with this package is used (assets/odeme.png, served from the public
 // repository) so the product never shows a broken image, whatever the site's own address, firewall or image format.
 const image=PRODUCT_IMAGE;
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
// lines is the single-use product titled with this reference. Webhook bodies may be the order itself or wrapped ({ data }, { order },
// { data: { order } }), so the order id and the reference are looked up in all of them.
// Pull mode (empty payload, reference given): the host asks while the customer waits or the admin opens the order, so a payment is
// still settled when a webhook never arrives. Recent orders are listed and the one carrying the reference is checked.
const isPaid=(order:Order|null|undefined)=>String(order?.paymentStatus||"").toLowerCase()==="paid";
const carries=(order:Order|null|undefined,ref:string)=>(order?.lineItems||[]).some(line=>String(line?.title||"").toLowerCase().includes(ref));
function findOrder(value:unknown,depth=0):Order|null{
 if(!value||typeof value!=="object"||depth>3)return null;
 const v=value as Record<string,unknown>;
 if(Array.isArray(v.lineItems)&&typeof v.id==="string")return v as Order;
 for(const key of ["order","data","payload","resource"])if(v[key]&&typeof v[key]==="object"){const found=findOrder(v[key],depth+1);if(found)return found}
 return null;
}
async function pull(config:ShopierConfig,ref:string){
 for(const query of ["?limit=50&sort=dateDesc","?limit=50",""]){
  const list=await call<Order[]>(config,"GET",`/orders${query}`);
  if(!list.ok||!Array.isArray(list.data))continue;
  const hit=list.data.find(order=>carries(order,ref));
  if(!hit)return {merchantOid:ref,status:"pending" as Status};
  // The list entry is enough when it already says paid; otherwise the order is read on its own (fresher status).
  if(isPaid(hit))return {merchantOid:ref,status:"paid" as Status};
  if(typeof hit.id==="string"&&/^[A-Za-z0-9_-]{1,80}$/.test(hit.id)){const one=await call<Order>(config,"GET",`/orders/${encodeURIComponent(hit.id)}`);if(one.ok&&one.data&&carries(one.data,ref))return {merchantOid:ref,status:(isPaid(one.data)?"paid":"pending") as Status}}
  return {merchantOid:ref,status:"pending" as Status};
 }
 return null;
}
async function verifyWebhook(config:ShopierConfig,input:{payload?:string;reference?:string}){
 const payload=typeof input?.payload==="string"?input.payload:"";
 if(!payload){const ref=String(input?.reference||"").toLowerCase();return REFERENCE.test(ref)&&ref.match(REFERENCE)?.[0]===ref?pull(config,ref):null}
 let data:unknown;
 try{data=JSON.parse(payload)}catch{return null}
 const hint=findOrder(data);
 const merchantOid=(payload.match(REFERENCE)?.[0]||"").toLowerCase();
 if(!merchantOid)return {merchantOid:"",status:"ignored" as Status};
 const orderId=typeof hint?.id==="string"?hint.id.trim():"";
 if(!/^[A-Za-z0-9_-]{1,80}$/.test(orderId))return pull(config,merchantOid);
 const order=await call<Order>(config,"GET",`/orders/${encodeURIComponent(orderId)}`);
 if(!order.ok||!order.data||!carries(order.data,merchantOid))return pull(config,merchantOid);
 return {merchantOid,status:(isPaid(order.data)?"paid":"pending") as Status};
}

return {createPayment: async (input:PaymentInput) => createPayment(await host.configuration(),input),
verifyCallback: async (input:{payload?:string;reference?:string}) => verifyWebhook(await host.configuration(),input)};
}
