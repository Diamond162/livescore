export async function onRequest(c){
const K=(c.env.FOOTBALL_API_KEY||'').trim();
if(!K) return new Response(JSON.stringify({error:"NO KEY SET"}),{headers:{"content-type":"application/json"}});
try{
const url=`https://live-football-api.com/api/v1/matches?date=2026-10-14&api_key=${K}`;
const r=await fetch(url);
const txt=await r.text();
let j={};try{j=JSON.parse(txt)}catch(e){j={raw:txt}}
return new Response(JSON.stringify({httpStatus:r.status,urlCalled:url.replace(K,"HIDDEN_KEY"),apiRaw:j,hasMatches:!!(j.matches&&j.matches.length)},null,2),{headers:{"content-type":"application/json"}});
}catch(e){return new Response(JSON.stringify({error:e.message}),{headers:{"content-type":"application/json"}});}
}
