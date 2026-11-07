// Independent provider package. Credentials and networking are supplied by the host.
// Shopier REST API (https://api.shopier.com/v1, Personal Access Token): every payment is a single-use hidden product carrying the
// order reference in its title. The customer pays on that product's Shopier page; Shopier's "order.created" webhook is re-checked
// against the API before the host settles anything, so a forged or replayed webhook can never mark an order paid.
export type ModuleHost={configuration():Promise<ShopierConfig>;request(url:string,init?:RequestInit):Promise<Response>};
type ShopierConfig={accessToken:string};
type Status="paid"|"failed"|"pending"|"ignored";
type PaymentInput={merchantOid:string;email:string;amountMicros:number;currency?:string;productName:string;successUrl:string;cancelUrl:string;returnUrl:string;callbackUrl:string};
type Line={productId?:string;product_id?:string;title?:string};
type Order={id?:string;paymentStatus?:string;payment_status?:string;payment?:{status?:string};lineItems?:Line[];line_items?:Line[]};
type Result={merchantOid:string;status:Status;note:string};
type ProductLike={id?:string|number;productId?:string|number;product_id?:string|number;product?:{id?:string|number};url?:string;title?:string};
const ID=/^[A-Za-z0-9_-]{1,80}$/;
// Ürün kimliği: yanıtın id / productId / product_id / product.id alanı; hiçbiri yoksa ödeme adresinin son parçası (ör. /123456).
function productIdOf(p:ProductLike|null|undefined,url=""){
 for(const v of [p?.id,p?.productId,p?.product_id,p?.product?.id]){const s=v===undefined||v===null?"":String(v);if(ID.test(s))return s}
 const tail=String(url).split(/[?#]/)[0].split("/").filter(Boolean).pop()||"";return /^[0-9]{3,}$/.test(tail)?tail:"";
}

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
 const product=await call<ProductLike>(config,"POST","/products",{
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
 // The product id is kept by the host: the webhook and the status check find the order by it (as the Shopier SDKs do).
 return {redirectUrl:url,productId:productIdOf(product.data,url)};
}

// The webhook body is only a hint: the order is read back from the API with the store's own token and counts only when one of its
// lines is the single-use product of this payment, matched by product id (kept by the host since 1.0.3) or by the reference in the
// line title. Webhook bodies may be the order itself or wrapped ({ data }, { order }), so the order id is looked up in all of them.
// Pull mode (empty payload): the host asks while the customer waits or the admin opens the order, so a payment is still settled when
// a webhook never arrives. Orders of the product are listed (falling back to recent orders). Every answer carries a short note that
// the host shows on the admin order page, so a payment that is not confirmed can be explained.
const lines=(order:Order|null|undefined)=>[...(order?.lineItems||[]),...(order?.line_items||[])];
const paymentState=(order:Order|null|undefined)=>String(order?.paymentStatus??order?.payment_status??order?.payment?.status??"").toLowerCase();
const isPaid=(order:Order|null|undefined)=>["paid","success","succeeded","completed"].includes(paymentState(order));
const lineProduct=(line:Line&{product?:{id?:string|number}})=>String(line?.productId??line?.product_id??line?.product?.id??"");
const matches=(order:Order|null|undefined,ref:string,productId:string)=>lines(order).some(line=>(productId&&lineProduct(line)===productId)||String(line?.title||"").toLowerCase().includes(ref));
// Eşleşme yoksa kayda yazılan örnek: son siparişlerin kimliği, ödeme durumu ve satırlardaki ürün kimliği / adı (kişisel bilgi yok).
const sample=(list:Order[])=>list.slice(0,3).map(o=>`#${o.id??"?"} ${paymentState(o)||"-"} [${lines(o).slice(0,2).map(l=>`${lineProduct(l)||"kimliksiz"} ${String(l?.title||"").slice(0,40)}`).join("; ")}]`).join(" · ");
// Ürün kimliği bilinmiyorsa (eski ödeme) ürünler arasında başlığında referans geçen ürün aranır.
async function productForReference(config:ShopierConfig,ref:string){
 for(const query of ["?limit=50&sort=dateDesc","?limit=50"]){const list=await call<ProductLike[]>(config,"GET",`/products${query}`);if(!list.ok||!Array.isArray(list.data))continue;const hit=list.data.find(p=>String(p?.title||"").toLowerCase().includes(ref));return hit?productIdOf(hit,String(hit.url||"")):""}
 return "";
}
function findOrder(value:unknown,depth=0):Order|null{
 if(!value||typeof value!=="object"||depth>3)return null;
 const v=value as Record<string,unknown>;
 if((Array.isArray(v.lineItems)||Array.isArray(v.line_items))&&(typeof v.id==="string"||typeof v.id==="number"))return {...v,id:String(v.id)} as Order;
 for(const key of ["order","data","payload","resource"])if(v[key]&&typeof v[key]==="object"){const found=findOrder(v[key],depth+1);if(found)return found}
 return null;
}
const answer=(merchantOid:string,order:Order,via:string):Result=>isPaid(order)?{merchantOid,status:"paid",note:`Shopier siparişi ${order.id||""} ödendi (${via}).`}:{merchantOid,status:"pending",note:`Shopier siparişi ${order.id||""} bulundu, ödeme durumu: ${paymentState(order)||"bilinmiyor"} (${via}).`};
async function readOrder(config:ShopierConfig,id:string){if(!/^[A-Za-z0-9_-]{1,80}$/.test(id))return null;const r=await call<Order>(config,"GET",`/orders/${encodeURIComponent(id)}`);return r.ok&&r.data&&typeof r.data==="object"?{...r.data,id:String(r.data.id??id)}:null}
async function pull(config:ShopierConfig,ref:string,known:string):Promise<Result>{
 const productId=known||await productForReference(config,ref).catch(()=>"");
 const queries=[...(productId?[`?productId=${encodeURIComponent(productId)}`]:[]),"?limit=50&sort=dateDesc","?limit=50",""];
 let lastError="";
 for(const query of queries){
  const list=await call<Order[]>(config,"GET",`/orders${query}`);
  if(!list.ok||!Array.isArray(list.data)){lastError=`sipariş listesi okunamadı (HTTP ${list.status})`;continue}
  const hit=list.data.find(order=>matches(order,ref,productId));
  if(!hit){if(query.startsWith("?productId"))continue;return {merchantOid:ref,status:"pending",note:`Shopier'de bu ödemeye ait sipariş henüz yok (${list.data.length} sipariş tarandı${productId?`, aranan ürün ${productId}${known?"":" (ürün listesinden bulundu)"}`:", ürün kimliği bilinmiyor"}). Son siparişler: ${sample(list.data)||"yok"}`}}
  if(isPaid(hit))return answer(ref,hit,"liste");
  const one=hit.id?await readOrder(config,String(hit.id)):null;
  return answer(ref,one&&matches(one,ref,productId)?one:hit,"sipariş");
 }
 return {merchantOid:ref,status:"pending",note:`Shopier'e sorulamadı: ${lastError||"yanıt yok"}. Erişim anahtarının sipariş okuma izni olmalı.`};
}
async function verify(config:ShopierConfig,input:{payload?:string;reference?:string;productId?:string}):Promise<Result|null>{
 const payload=typeof input?.payload==="string"?input.payload:"",productId=String(input?.productId||"");
 let ref=String(input?.reference||"").toLowerCase();
 if(ref&&ref.match(REFERENCE)?.[0]!==ref)return null;
 if(!payload)return ref?pull(config,ref,productId):null;
 let data:unknown;
 try{data=JSON.parse(payload)}catch{return null}
 ref||=(payload.match(REFERENCE)?.[0]||"").toLowerCase();
 if(!ref)return {merchantOid:"",status:"ignored",note:"Bildirimde bu siteye ait ödeme yok."};
 const hint=findOrder(data);
 const order=hint?.id?await readOrder(config,String(hint.id)):null;
 if(order&&matches(order,ref,productId))return answer(ref,order,"bildirim");
 return pull(config,ref,productId);
}

// Refunds (1.0.5): the money goes back to the card the customer paid with. The Shopier order is the one recorded when the payment
// was confirmed (providerOrderId) or, for older payments, found again by product id / reference. A full refund returns the whole
// order (amount = order total); a partial one only the given amount (one item of a multi-item cart). POST /refunds always carries
// orderId, amount and a short note to the buyer (Shopier API). Shopier answers with a refund record whose status is pending,
// succeeded or failed; refundStatus reads it again later. Failures come back as { ok:false, note } (never a bare error).
type RefundInput={reference:string;productId?:string;providerOrderId?:string;amountMicros:number;full:boolean};
type RefundRecord={id?:string|number;status?:string;total?:string;amount?:string;orderId?:string;order_id?:string;dateRefunded?:string};
const refundState=(r:RefundRecord|null)=>{const s=String(r?.status||"").toLowerCase();return s==="succeeded"||s==="success"||s==="completed"?"succeeded":s==="failed"||s==="rejected"?"failed":"pending"};
async function refund(config:ShopierConfig,input:RefundInput){
 const ref=String(input?.reference||"").toLowerCase(),amount=(Number(input?.amountMicros)/1000000).toFixed(2);
 if(ref.match(REFERENCE)?.[0]!==ref)return {ok:false,note:"Ödeme referansı geçersiz."};
 if(!(Number(amount)>0))return {ok:false,note:"İade tutarı geçersiz."};
 let orderId=String(input?.providerOrderId||"");
 if(!orderId){const found=await pull(config,ref,String(input?.productId||""));orderId=found.status==="paid"?providerOrderOf(found.note):"";if(!orderId)return {ok:false,note:`Shopier siparişi bulunamadı: ${found.note}`}}
 if(!ID.test(orderId))return {ok:false,note:"Shopier sipariş numarası geçersiz."};
 const r=await call<RefundRecord>(config,"POST","/refunds",{orderId,amount,note:input.full?"Siparişiniz iade edildi.":"Siparişinizdeki bir ürün iade edildi."});
 if(!r.ok||!r.data)return {ok:false,note:apiError(r.data,`Shopier iadeyi kabul etmedi (HTTP ${r.status}).`).message,providerOrderId:orderId};
 return {ok:true,refundId:String(r.data.id??""),status:refundState(r.data),providerOrderId:orderId,amount:String(r.data.total??r.data.amount??amount),note:`Shopier iade kaydı ${r.data.id??""} oluşturuldu.`};
}
async function refundStatus(config:ShopierConfig,input:{refundId:string}){
 const id=String(input?.refundId||"");if(!ID.test(id))return {ok:false,note:"İade numarası geçersiz."};
 const r=await call<RefundRecord>(config,"GET",`/refunds/${encodeURIComponent(id)}`);
 if(!r.ok||!r.data)return {ok:false,note:`İade durumu okunamadı (HTTP ${r.status}).`};
 return {ok:true,refundId:id,status:refundState(r.data),refundedAt:r.data.dateRefunded||null};
}
const providerOrderOf=(note:string)=>note.match(/siparişi\s+([A-Za-z0-9_-]+)\s+ödendi/)?.[1]||"";

return {createPayment: async (input:PaymentInput) => createPayment(await host.configuration(),input),
// Network or API failures never surface as a bare module error: the host gets a pending answer with the reason.
verifyCallback: async (input:{payload?:string;reference?:string;productId?:string}) => {try{const r=await verify(await host.configuration(),input);return r&&r.status==="paid"?{...r,providerOrderId:providerOrderOf(r.note)}:r}catch(error){const ref=String(input?.reference||"").toLowerCase();return ref?{merchantOid:ref,status:"pending" as Status,note:`Shopier'e bağlanılamadı: ${error instanceof Error?error.message:"hata"}`}:null}},
refund: async (input:RefundInput) => {try{return await refund(await host.configuration(),input)}catch(error){return {ok:false,note:`Shopier'e bağlanılamadı: ${error instanceof Error?error.message:"hata"}`}}},
refundStatus: async (input:{refundId:string}) => {try{return await refundStatus(await host.configuration(),input)}catch(error){return {ok:false,note:`Shopier'e bağlanılamadı: ${error instanceof Error?error.message:"hata"}`}}}};
}
