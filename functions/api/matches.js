export async function onRequest(context){
  const apiKey = context.env.FOOTBALL_API_KEY;
  const url = new URL(context.request.url);
  const date = url.searchParams.get('date') || '2026-10-16';
  const apiUrl = `https://live-football-api.com/api/matches?api_key=${apiKey}&date=${date}`;
  try{
    const res = await fetch(apiUrl);
    const data = await res.json();
    const list = data.matches || data.data || [];
    return new Response(JSON.stringify({matches:list,date,count:list.length}),{
      headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}
    });
  }catch(e){
    return new Response(JSON.stringify({matches:[],error:e.message,date,count:0}),{
      headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}
    });
  }
}
