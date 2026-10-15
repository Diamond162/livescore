export async function onRequest(c){
const K=(c.env.FOOTBALL_API_KEY||'').trim();
const date=new URL(c.request.url).searchParams.get('date')||'2026-10-14';
const url=`https://live-football-api.com/api/v1/matches?date=${date}&api_key=${K}`;
const r=await fetch(url);
const j=await r.json();
return new Response(JSON.stringify(j,null,2),{headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}});
}
