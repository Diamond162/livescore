export async function onRequest(c){
const K=(c.env.FOOTBALL_API_KEY||'').trim();
const toBerlin=(utc)=>{
 try{
  const d=new Date(utc);
  return d.toLocaleTimeString('en-GB',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit',hour12:false});
 }catch(e){return "00:00"}
};
try{
let date=new Date().toISOString().split('T')[0];
try{date=new URL(c.request.url).searchParams.get('date')||date;}catch(e){}
const r=await fetch(`https://v3.football.api-sports.io/fixtures?date=${date}`,{
 headers:{"x-apisports-key":K}
});
const j=await r.json();
const list=j.response||[];
const out=list.map(m=>{
 const berlin=toBerlin(m.fixture?.date);
 const s=m.fixture?.status?.short||"NS";
 return{
  fixture:{id:m.fixture?.id,date:date,berlinTime:berlin,status:{short:s,long:m.fixture?.status?.long||""},minute:m.fixture?.status?.elapsed||null},
  league:{name:m.league?.name||"Other",country:m.league?.country||""},
  teams:{home:{name:m.teams?.home?.name||"Home"},away:{name:m.teams?.away?.name||"Away"}},
  goals:{home:m.goals?.home,away:m.goals?.away}
 };
});
return new Response(JSON.stringify({response:out,results:out.length,date:date}),{headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}});
}catch(e){
 return new Response(JSON.stringify({response:[],results:0,error:e.message}),{headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}});
}
}
