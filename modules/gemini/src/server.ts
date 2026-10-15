// Gemini Entegrasyonu: Google Gemini API'ye (generativelanguage.googleapis.com) yazı, görsel ve model listesi istekleri.
// Bağımsız sağlayıcı paketidir: API anahtarı ve ağ erişimi sistem tarafından verilir; modül veritabanına ve başka adrese erişemez.
// Hatalar fırlatılmaz, {error,status} olarak döner (sistem kullanıcıya anlaşılır mesaj gösterebilsin).
export type ModuleHost={configuration():Promise<GeminiConfig>;request(url:string,init?:RequestInit):Promise<{ok:boolean;status:number;json():Promise<unknown>;text():Promise<string>}>};
type GeminiConfig={apiKey:string};
type Failure={error:string;status:number};
type CompleteInput={model:string;system?:string;prompt:string;maxTokens?:number;temperature?:number;json?:boolean;thinking?:"low"|"high"};
type ImageInput={model:string;prompt:string;aspect?:"16:9"|"1:1"|"9:16"|"3:2"|"4:3"};

const API="https://generativelanguage.googleapis.com/v1beta";
const validModel=(value:unknown)=>typeof value==="string"&&/^(gemini|imagen)-[a-z0-9.-]{2,60}$/.test(value);

export default function createModule(host:ModuleHost){
 async function call(path:string,body?:unknown):Promise<{data:Record<string,unknown>}|Failure>{
  const {apiKey}=await host.configuration();
  const response=await host.request(`${API}/${path}`,{method:body?"POST":"GET",headers:{"x-goog-api-key":apiKey,"content-type":"application/json"},body:body?JSON.stringify(body):undefined}).catch(()=>null);
  if(!response)return {error:"Gemini'ye ulaşılamadı ya da yanıt zamanında gelmedi.",status:0};
  const data=await response.json().catch(()=>({})) as Record<string,unknown>&{error?:{message?:string}};
  if(response.ok)return {data};
  const raw=String(data.error?.message||"").replace(/(AIza|AQ\.?)[0-9A-Za-z._-]+/g,"…").slice(0,160);
  if(response.status===400&&/API key/i.test(raw))return {error:"Gemini API anahtarı geçersiz.",status:401};
  if(response.status===401||response.status===403)return {error:"Bu Gemini anahtarının bu işlem için yetkisi yok.",status:403};
  if(response.status===404)return {error:"Seçilen Gemini modeli bulunamadı veya erişiminiz yok.",status:404};
  if(response.status===429)return {error:"Gemini kullanım sınırına ulaşıldı. Biraz sonra tekrar deneyin.",status:429};
  return {error:`Gemini isteği tamamlanamadı${raw?`: ${raw}`:"."}`,status:response.status};
 }

 // Yazı: sistem talimatı ve kullanıcı mesajı; json istenirse yanıt JSON olarak istenir. Kullanılan jeton sayıları döner (bütçe için).
 // Düşünme seviyesi (isteğe bağlı): Gemini 3 modellerinde thinkingLevel, 2.5 modellerinde düşünme bütçesi. Model bu ayarı kabul
 // etmezse (Google 400 ile bildirir) istek ayarsız bir kez daha gönderilir; seviye verilmezse modelin varsayılanı kullanılır.
 const thinkingConfig=(model:string,level?:"low"|"high")=>!level?null:/^gemini-3/.test(model)?{thinkingLevel:level}:/^gemini-2\.5/.test(model)?{thinkingBudget:level==="low"?1024:-1}:null;
 async function complete(input:CompleteInput){
  if(!validModel(input?.model)||typeof input.prompt!=="string"||!input.prompt.trim())return {error:"Yazı isteği geçersiz.",status:400};
  const thinking=thinkingConfig(input.model,input.thinking==="low"||input.thinking==="high"?input.thinking:undefined);
  const send=(withThinking:boolean)=>call(`models/${input.model}:generateContent`,{
   ...(input.system?{systemInstruction:{parts:[{text:input.system}]}}:{}),
   contents:[{role:"user",parts:[{text:input.prompt}]}],
   generationConfig:{maxOutputTokens:Math.max(256,Math.min(65536,Number(input.maxTokens)||8192)),...(typeof input.temperature==="number"?{temperature:input.temperature}:{}),...(input.json?{responseMimeType:"application/json"}:{}),...(withThinking&&thinking?{thinkingConfig:thinking}:{})},
  });
  let r=await send(true);
  if("error" in r&&thinking&&r.status===400&&/think/i.test(r.error))r=await send(false);
  if("error" in r)return r;
  const d=r.data as {candidates?:{content?:{parts?:{text?:string}[]};finishReason?:string}[];promptFeedback?:{blockReason?:string};usageMetadata?:{promptTokenCount?:number;candidatesTokenCount?:number;thoughtsTokenCount?:number}};
  if(d.promptFeedback?.blockReason)return {error:"Gemini bu isteği güvenlik nedeniyle yanıtlamadı; konuyu değiştirip tekrar deneyin.",status:400};
  const c=d.candidates?.[0],text=(c?.content?.parts||[]).map(p=>p.text||"").join("").trim();
  if(!text)return {error:c?.finishReason==="SAFETY"?"Gemini bu metni güvenlik nedeniyle yazmadı.":"Gemini boş yanıt döndürdü.",status:502};
  const u=d.usageMetadata||{};
  return {text,finishReason:c?.finishReason||"",inputTokens:u.promptTokenCount||0,outputTokens:(u.candidatesTokenCount||0)+(u.thoughtsTokenCount||0)};
 }

 // Görsel: Gemini görsel modeli (generateContent, yanıt görsel) ya da Imagen (predict). base64 veri ve türü döner.
 async function image(input:ImageInput){
  if(!validModel(input?.model)||typeof input.prompt!=="string"||!input.prompt.trim())return {error:"Görsel isteği geçersiz.",status:400};
  const aspect=input.aspect||"16:9";
  if(input.model.startsWith("imagen")){
   const r=await call(`models/${input.model}:predict`,{instances:[{prompt:input.prompt}],parameters:{sampleCount:1,aspectRatio:aspect==="3:2"?"4:3":aspect}});
   if("error" in r)return r;
   const p=(r.data as {predictions?:{bytesBase64Encoded?:string;mimeType?:string}[]}).predictions?.[0];
   return p?.bytesBase64Encoded?{data:p.bytesBase64Encoded,mime:p.mimeType||"image/png"}:{error:"Gemini görsel üretemedi; tarifi değiştirip tekrar deneyin.",status:502};
  }
  const r=await call(`models/${input.model}:generateContent`,{contents:[{role:"user",parts:[{text:input.prompt}]}],generationConfig:{responseModalities:["IMAGE"],imageConfig:{aspectRatio:aspect}}});
  if("error" in r)return r;
  const part=((r.data as {candidates?:{content?:{parts?:{inlineData?:{data?:string;mimeType?:string}}[]}}[]}).candidates?.[0]?.content?.parts||[]).find(p=>p.inlineData?.data);
  return part?.inlineData?.data?{data:part.inlineData.data,mime:part.inlineData.mimeType||"image/png"}:{error:"Gemini görsel üretemedi; tarifi değiştirip tekrar deneyin.",status:502};
 }

 // Hesabın erişebildiği modeller: yazı (generateContent, adı gemini-…) ve görsel (adında "image" geçen gemini modeli ya da imagen).
 async function models(){
  const out:{id:string;name:string;image:boolean}[]=[];let token="";
  for(let page=0;page<3;page++){
   const r=await call(`models?pageSize=100${token?`&pageToken=${encodeURIComponent(token)}`:""}`);
   if("error" in r)return r;
   const d=r.data as {models?:{name:string;displayName?:string;supportedGenerationMethods?:string[]}[];nextPageToken?:string};
   for(const m of d.models||[]){const id=m.name.replace(/^models\//,""),methods=m.supportedGenerationMethods||[];if(!validModel(id))continue;
    const isImage=/image/i.test(id)||id.startsWith("imagen");if(!methods.includes("generateContent")&&!(isImage&&methods.includes("predict")))continue;
    if(/embedding|aqa|tts|audio|live|native/i.test(id))continue;out.push({id,name:m.displayName||id,image:isImage})}
   if(!d.nextPageToken)break;token=d.nextPageToken;
  }
  return {models:out};
 }

 return {complete,image,models};
}
