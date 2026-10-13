export async function onRequest(context){
const url=new URL(context.request.url);
const d=url.searchParams.get('date')||new Date().toISOString().split('T')[0];
const KEY=context.env.FOOTBALL_API_KEY||context.env.LIVE_FOOTBALL_API_KEY||context.env.API_KEY||"";
if(!KEY)return new Response(JSON.stringify({response:[]}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
try{
const r=await fetch(`https://live-football-api.com/api/v1/matches?api_key=${KEY}&date=${d}&lang=en`);
const j=await r.json();
const list=j.matches||j.data||[];
const out=list.map(m=>{
const s=String(m.status||"").toLowerCase();
const live=s.includes("live")||m.live===true;
const ft=s.includes("finish")||s.includes("ft")||s.includes("ended");
return{
league:{name:m.league?.name||"Football",country:m.league?.country||"World",flag:m.league?.country_code||"INT"},
teams:{home:{name:m.home?.name||"Home"},away:{name:m.away?.name||"Away"}},
fixture:{date:m.kickoff||m.date||new Date().toISOString(),status:{short:live?"LIVE":(ft?"FT":"NS"),elapsed:m.minute?m.minute+"'":m.status||""}},
goals:{home:m.score?.home??m.home?.score??null,away:m.score?.away??m.away?.score??null}
}});
return new Response(JSON.stringify({response:out}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'public, max-age=30'}});
}catch(e){return new Response(JSON.stringify({response:[],error:e.message}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});}
}
