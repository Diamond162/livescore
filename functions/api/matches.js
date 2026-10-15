export async function onRequest(c){
const K=(c.env.FOOTBALL_API_KEY||'').trim();
const toBerlin=(utc)=>{
 try{const d=utc?new Date(utc):new Date();return d.toLocaleTimeString('en-GB',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit',hour12:false});}catch(e){return "--:--"}
};
try{
 let date=new URL(c.request.url).searchParams.get('date')||new Date().toISOString().split('T')[0];
 const url=`https://live-football-api.com/api/v1/matches?api_key=${K}&date=${date}&lang=en`;
 const r=await fetch(url);
 const j=await r.json();
 if(j.error || j.status==="error"){
  return new Response(JSON.stringify({response:[],results:0,error:j.error||j.message,date:date}),{headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}});
 }
 let list=j.matches||j.data?.matches||[];
 const out=list.map(m=>({fixture:{id:m.id,date:date,berlinTime:m.time||toBerlin(m.date),status:{short:m.status||"NS",long:m.status||""}},league:{name:m.league?.name||m.competition||"League",country:m.league?.country||""},teams:{home:{name:m.home?.name||"Home"},away:{name:m.away?.name||"Away"}},goals:{home:m.score?.home??null,away:m.score?.away??null}}));
 return new Response(JSON.stringify({response:out,results:out.length,date:date}),{headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}});
}catch(e){
 return new Response(JSON.stringify({response:[],results:0,error:e.message}),{headers:{"content-type":"application/json"}});
}
}
