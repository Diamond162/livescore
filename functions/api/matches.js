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
 const r=await fetch(`https://v3.football.api-sports.io/fixtures?date=${date}`,{headers:{"x-apisports-key":K}});
 const j=await r.json();
 const list=j.response||[];
 const out=list.map(m=>{
  return{
   fixture:{id:m.fixture.id,date:date,berlinTime:toBerlin(m.fixture.date),status:{short:m.fixture.status.short,long:m.fixture.status.long},minute:m.fixture.status.elapsed},
   league:{name:m.league.name,country:m.league.country},
   teams:{home:{name:m.teams.home.name},away:{name:m.teams.away.name}},
   goals:{home:m.goals.home,away:m.goals.away}
  };
 });
 return new Response(JSON.stringify({response:out,results:out.length}),{headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}});
}catch(e){
 return new Response(JSON.stringify({response:[],results:0,error:e.message}),{headers:{"content-type":"application/json"}});
}
}
