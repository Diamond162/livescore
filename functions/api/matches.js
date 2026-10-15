export async function onRequest(c){
const K=(c.env.FOOTBALL_API_KEY||'').trim();
const toBerlin=(t)=>{
 try{
  const s=String(t||"00:00");
  if(s.match(/^\d{2}:\d{2}/)){const [h,m]=s.split(':').map(Number); const d=new Date(); d.setUTCHours(h,m,0,0); return d.toLocaleTimeString('en-GB',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit',hour12:false});}
  return s;
 }catch(e){return "00:00"}
};
async function fetchDate(d){
 try{const r=await fetch(`https://live-football-api.com/api/v1/matches?date=${d}&api_key=${K}`); return await r.json();}catch(e){return {matches:[]}}
}
try{
let req=new Date().toISOString().split('T')[0];
try{req=new URL(c.request.url).searchParams.get('date')||req;}catch(e){}
let all=[]; let credits=0; let used=[];
for(let i=-3;i<=3;i++){
  const dt=new Date(req); dt.setDate(dt.getDate()+i);
  const ds=dt.toISOString().split('T')[0];
  const data=await fetchDate(ds);
  if(data.credits_remaining) credits=data.credits_remaining;
  (data.matches||[]).forEach(m=>{all.push({...m,_date:ds}); if(!used.includes(ds)) used.push(ds);});
  if(all.length>=10) break; // stop when we have 10 real matches
}
const out=all.map((m,idx)=>{
 const berlin=toBerlin(m.kickoff);
 const st=String(m.status||"").toLowerCase();
 let short="NS"; if(st.includes('live')) short="LIVE"; else if(st.includes('postgame')||st.includes('finished')||st==='ft') short="FT"; else if(st.includes('halftime')) short="HT";
 let hs=null,as=null; if(m.home?.score!==""&&!isNaN(m.home.score)) hs=parseInt(m.home.score); if(m.away?.score!==""&&!isNaN(m.away.score)) as=parseInt(m.away.score);
 return{fixture:{id:m.id||idx,date:m._date,berlinTime:berlin,status:{short:short,long:m.status||""}},league:{name:m.league?.name||"Other",country:m.league?.country||""},teams:{home:{name:m.home?.name||"Home"},away:{name:m.away?.name||"Away"}},goals:{home:hs,away:as}};
});
return new Response(JSON.stringify({response:out,results:out.length,usedDates:used,credits:credits,date:req,realOnly:true}),{headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}});
}catch(e){return new Response(JSON.stringify({response:[],results:0,error:e.message}),{headers:{"content-type":"application/json"}});}
}
