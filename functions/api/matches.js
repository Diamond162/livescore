export async function onRequest(c){
const K=(c.env.FOOTBALL_API_KEY||'').trim();
const toBerlin=(t)=>{
 try{
  const str=String(t||"00:00");
  if(str.match(/^\d{2}:\d{2}/)){
    const [h,m]=str.split(':').map(Number);
    const d=new Date(); d.setUTCHours(h,m,0,0);
    return d.toLocaleTimeString('en-GB',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit',hour12:false});
  }
  return str;
 }catch(e){return "00:00"}
};
async function fetchDate(d){
 try{
  const url=`https://live-football-api.com/api/v1/matches?date=${d}&api_key=${K}`;
  const r=await fetch(url);
  const j=await r.json();
  return j;
 }catch(e){return {matches:[]};}
}
try{
let req=new Date().toISOString().split('T')[0];
try{ req=new URL(c.request.url).searchParams.get('date')||req; }catch(e){}
let all=[]; let credits=0; let used=[];
for(let i=0;i<3;i++){
  const dt=new Date(req); dt.setDate(dt.getDate()+i);
  const ds=dt.toISOString().split('T')[0];
  const data=await fetchDate(ds);
  if(data.credits_remaining) credits=data.credits_remaining;
  const ms=data.matches||[];
  if(ms.length>0){ ms.forEach(m=>all.push({...m,_date:ds})); used.push(ds); }
}
const out=all.map((m,idx)=>{
 const berlin=toBerlin(m.kickoff);
 const s=String(m.status||"").toLowerCase();
 let short="NS"; if(s.includes('live')) short="LIVE"; else if(s.includes('postgame')||s.includes('finished')||s==='ft') short="FT"; else if(s.includes('halftime')) short="HT";
 let hs=null,as=null;
 if(m.home?.score!==""&&!isNaN(m.home.score)) hs=parseInt(m.home.score);
 if(m.away?.score!==""&&!isNaN(m.away.score)) as=parseInt(m.away.score);
 return{
  fixture:{id:m.id||idx,date:m._date||req,berlinTime:berlin,status:{short:short,long:m.status||""}},
  league:{name:m.league?.name||"Other",country:m.league?.country||""},
  teams:{home:{name:m.home?.name||"Home"},away:{name:m.away?.name||"Away"}},
  goals:{home:hs,away:as}
 };
});
return new Response(JSON.stringify({response:out,results:out.length,usedDates:used,credits:credits}),{headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*","Cache-Control":"no-cache"}});
}catch(e){
 return new Response(JSON.stringify({response:[],results:0,error:e.message}),{headers:{"content-type":"application/json"}});
}
}
