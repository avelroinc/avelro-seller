// Proposed host contract. This template is not installed in the panel.
export type TelegramHost = {
  // The host obtains encrypted credentials for the current panel/store scope.
  configuration(): Promise<{botToken:string;chatId:string}>;
  // The host must enforce manifest network permissions, timeouts and redacted logs.
  request(url:string,init:RequestInit):Promise<Response>;
};
export type OrderCreated = {orderCode:string};

export default function createTelegramModule(host:TelegramHost) {
  return {
    async onOrderCreated(event:OrderCreated) {
      const {botToken,chatId}=await host.configuration();
      if(!/^\d+:[A-Za-z0-9_-]+$/.test(botToken)||!chatId.trim())throw new Error("Telegram bağlantı bilgileri geçersiz.");
      const response=await host.request(`https://api.telegram.org/bot${botToken}/sendMessage`,{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({chat_id:chatId,text:`Yeni Sipariş: ${event.orderCode}`}),
      });
      const result=await response.json().catch(()=>null) as {ok?:boolean}|null;
      if(!response.ok||result?.ok!==true)throw new Error("Telegram bildirimi gönderilemedi.");
    },
  };
}
