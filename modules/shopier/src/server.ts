// Independent provider package. Credentials and networking are supplied by the host.
export type ModuleHost={configuration():Promise<ShopierConfig>;request(url:string,init?:RequestInit):Promise<Response>};
type ShopierConfig={apiKey:string;apiSecret:string};
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


const microsToTl=(amountMicros:number)=>(amountMicros/1e6).toFixed(2);

async function shopierSignature(config:ShopierConfig,randomNr:string,platformOrderId:string,totalOrderValue:string,currency:string){
 return hmacSha256Base64(config.apiSecret,`${randomNr}${platformOrderId}${totalOrderValue}${currency}`);
}

async function buildShopierFormFields(config:ShopierConfig,input:{platformOrderId:string;productName:string;buyerName:string;buyerSurname:string;buyerEmail:string;buyerPhone:string;amountMicros:number;currency?:"TRY"|"USD"|"EUR"}){
 const totalOrderValue=microsToTl(input.amountMicros),currency=({TRY:"0",USD:"1",EUR:"2"} as const)[input.currency||"TRY"]||"0",randomNr=String(Math.floor(Math.random()*1000000000));
 const signature=await shopierSignature(config,randomNr,input.platformOrderId,totalOrderValue,currency);
 return {
  actionUrl:"https://www.shopier.com/ShowProduct/api_pay4.php",
  fields:{
   API_key:config.apiKey,
   website_index:"1",
   platform_order_id:input.platformOrderId,
   product_name:input.productName,
   product_type:"1",
   buyer_name:input.buyerName,
   buyer_surname:input.buyerSurname||input.buyerName,
   buyer_email:input.buyerEmail,
   buyer_account_age:"0",
   buyer_id_nr:"",
   buyer_phone:input.buyerPhone||"0000000000",
   billing_address:"Belirtilmedi",billing_city:"Istanbul",billing_country:"Turkey",billing_postcode:"34000",
   shipping_address:"Belirtilmedi",shipping_city:"Istanbul",shipping_country:"Turkey",shipping_postcode:"34000",
   total_order_value:totalOrderValue,
   currency,
   platform:"0",
   is_in_frame:"0",
   current_language:"0",
   modul_version:"1.0.4",
   random_nr:randomNr,
   signature,
  },
 };
}

async function verifyShopierCallback(config:ShopierConfig,fields:Record<string,string>){
 const {platform_order_id:platformOrderId,status,random_nr:randomNr,signature}=fields;
 if(!platformOrderId||!randomNr||!signature)return null;
 const expected=await hmacSha256Base64(config.apiSecret,`${randomNr}${platformOrderId}`);
 if(!timingSafeEqual(expected,signature))return null;
 return {platformOrderId,success:status==="1"||status==="success"};
}

return {createPayment: async (input:Parameters<typeof buildShopierFormFields>[1]) => buildShopierFormFields(await host.configuration(),input),
verifyCallback: async (fields:Record<string,string>) => verifyShopierCallback(await host.configuration(),fields)};
}
