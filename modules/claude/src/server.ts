// Claude Entegrasyonu: Anthropic API'ye (api.anthropic.com) yazı (messages) ve model listesi istekleri. Bağımsız sağlayıcı paketidir:
// API anahtarı ve ağ erişimi sistem tarafından verilir; modül veritabanına ve başka adrese erişemez. İsteğin gövdesini sistem hazırlar
// (model, sistem talimatı, mesajlar, sınır, düşünme düzeyi); modül yanıtı akışla ister (uzun yazılar zaman aşımına düşmesin) ve akışı tek
// bir yanıta (model, metin, bitiş nedeni, jeton sayıları) çevirir. Hatalar fırlatılmaz, {error,status,code} olarak döner.
export type ModuleHost={configuration():Promise<{apiKey:string}>;request(url:string,init?:RequestInit):Promise<{ok:boolean;status:number;json():Promise<unknown>;text():Promise<string>}>};
type Result={status:number;data:unknown}|{error:string;status:number;code:string};

const API="https://api.anthropic.com/v1";
const redact=(value:string)=>value.replace(/sk-ant-[A-Za-z0-9_-]+/g,"sk-ant-…").slice(0,300);

// Akış olaylarından tek yanıt: message_start (model, girdi jetonları), content_block_delta (metin), message_delta (bitiş, çıktı jetonları).
export function readStream(text:string){
 const out={model:"",text:"",stopReason:"",inputTokens:0,cacheReadTokens:0,outputTokens:0,error:""};
 for(const line of text.split("\n")){
  if(!line.startsWith("data:"))continue;
  let event:Record<string,unknown>;try{event=JSON.parse(line.slice(5).trim())}catch{continue}
  const type=event.type;
  if(type==="message_start"){const m=event.message as {model?:string;usage?:{input_tokens?:number;cache_read_input_tokens?:number}};out.model=m?.model||out.model;out.inputTokens=m?.usage?.input_tokens||0;out.cacheReadTokens=m?.usage?.cache_read_input_tokens||0}
  else if(type==="content_block_delta"){const d=event.delta as {type?:string;text?:string};if(d?.type==="text_delta")out.text+=d.text||""}
  else if(type==="message_delta"){const d=event.delta as {stop_reason?:string};const u=event.usage as {output_tokens?:number};if(d?.stop_reason)out.stopReason=d.stop_reason;if(u?.output_tokens)out.outputTokens=u.output_tokens}
  else if(type==="error"){const e=event.error as {message?:string};out.error=redact(String(e?.message||"Claude akışı hata verdi."))}
 }
 return out;
}

export default function createModule(host:ModuleHost){
 const headers=async(beta?:string[])=>{const {apiKey}=await host.configuration();return {"x-api-key":apiKey,"anthropic-version":"2023-06-01","content-type":"application/json",...(beta?.length?{"anthropic-beta":beta.join(",")}:{})}};
 const failure=async(response:{status:number;json():Promise<unknown>}):Promise<Result>=>{const data=await response.json().catch(()=>({})) as {error?:{message?:string;type?:string}};return {error:redact(String(data.error?.message||"")),status:response.status,code:String(data.error?.type||"")}};
 // Yazı: messages gövdesi akışla gönderilir (stream: true); beta: istenen beta özellikleri (ör. sunucu tarafı yedek model).
 async function complete(input:{body?:Record<string,unknown>;beta?:string[]}):Promise<Result>{
  if(!input||typeof input.body!=="object"||!input.body)return {error:"Yazı isteği geçersiz.",status:400,code:"invalid"};
  const response=await host.request(`${API}/messages`,{method:"POST",headers:await headers(Array.isArray(input.beta)?input.beta.filter(b=>typeof b==="string"):undefined),body:JSON.stringify({...input.body,stream:true})}).catch(()=>null);
  if(!response)return {error:"Claude'a ulaşılamadı ya da yanıt zamanında gelmedi.",status:0,code:"network"};
  if(!response.ok)return failure(response);
  const r=readStream(await response.text());
  if(r.error)return {error:r.error,status:/overload/i.test(r.error)?529:500,code:"stream_error"};
  return {status:200,data:r};
 }
 // Hesabın erişebildiği modeller (en fazla 50).
 async function models():Promise<Result>{
  const response=await host.request(`${API}/models?limit=50`,{method:"GET",headers:await headers()}).catch(()=>null);
  if(!response)return {error:"Claude'a ulaşılamadı.",status:0,code:"network"};
  if(!response.ok)return failure(response);
  return {status:200,data:await response.json().catch(()=>({}))};
 }
 return {complete,models};
}
