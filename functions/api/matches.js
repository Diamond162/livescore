export async function onRequest(context){
  const url = new URL(context.request.url);
  const date = url.searchParams.get('date') || '2026-07-03';
  const KEY = context.env.FOOTBALL_API_KEY?.trim();
  if(!KEY) return new Response(JSON.stringify({error:"NO_KEY_IN_CLOUDFLARE"}),{headers:{"Content-Type":"application/json"}});
  
  const apiUrl = `https://live-football-api.com/api/v1/matches?api_key=${KEY}&date=${date}&lang=en`;
  try{
    const r = await fetch(apiUrl);
    const j = await r.json();
    return new Response(JSON.stringify({apiUrl: apiUrl.replace(KEY,'HIDDEN_KEY'), raw_response: j, key_length: KEY.length, key_start: KEY.slice(0,6)}, null, 2),{
      headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}
    });
  }catch(e){
    return new Response(JSON.stringify({error:e.message, apiUrl}),{headers:{"Content-Type":"application/json"}});
  }
}
