export async function onRequest(c){
const K=(c.env.FOOTBALL_API_KEY||'').trim();

const toBerlin=(t)=>{
 try{
  if(!t) return "00:00";
  if(t.match(/^\d{2}:\d{2}/)){
    const [h,m]=t.split(':').map(Number);
    const d=new Date(); d.setUTCHours(h,m,0,0);
    return d.toLocaleTimeString('en-GB',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit',hour12:false});
  }
  return t;
 }catch(e){return "00:00"}
};

const pri=(name,country)=>{
 const s=(name+' '+country).toLowerCase();
 if(s.includes('champions')) return 1;
 if(s.includes('europa')) return 2;
 if(s.includes('premier')) return 3;
 if(s.includes('la liga')) return 4;
 if(s.includes('bundesliga')) return 5;
 if(s.includes('serie a')) return 6;
 return 99;
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
let req='2026-10-14';
try{req=new URL(c.request.url).searchParams.get('date')||'2026-10-14';}catch(e){}

let allMatches=[];
let usedDates=[];
let credits=477;

// Try 7 days starting from req date
for(let i=0;i<7;i++){
  const d=new Date(req); d.setDate(d.getDate()+i);
  const ds=d.toISOString().split('T')[0];
  const data=await fetchDate(ds);
  if(data.credits_remaining) credits=data.credits_remaining;
  const m=data.matches||[];
  if(m.length>0){
    allMatches=allMatches.concat(m.map(x=>({...x,_date:ds})));
    usedDates.push(ds);
    if(allMatches.length>=20) break; // enough
  }
}

if(allMatches.length===0){
  // last chance: try 2026-10-14 which we KNOW had 4 matches before
  const fallback=await fetchDate('2026-10-14');
  allMatches=fallback.matches||[];
  usedDates=['2026-10-14-fallback'];
  if(fallback.credits_remaining) credits=fallback.credits_remaining;
}

const out=allMatches.map((m,idx)=>{
 const kick=m.kickoff||"00:00";
 const berlin=toBerlin(kick);
 const statusRaw=String(m.status||"").toLowerCase();
 let short="NS";
 if(statusRaw.includes('live')) short="LIVE";
 else if(statusRaw.includes('postgame')||statusRaw.includes('finished')||statusRaw==='ft') short="FT";
 else if(statusRaw.includes('halftime')) short="HT";
 else short="NS";

 const leagueName=m.league?.name||"Other";
 const country=m.league?.country||"";
 const homeName=m.home?.name||"Home";
 const awayName=m.away?.name||"Away";

 let hs=null,as=null;
 if(m.home?.score!==""&&m.home?.score!=null&&!isNaN(m.home.score)) hs=parseInt(m.home.score);
 if(m.away?.score!==""&&m.away?.score!=null&&!isNaN(m.away.score)) as=parseInt(m.away.score);

 return{
  fixture:{id:m.id||idx,date:m._date||req,berlinTime:berlin,status:{short:short,long:m.status||""}},
  league:{name:leagueName,country:country},
  teams:{home:{name:homeName},away:{name:awayName}},
  goals:{home:hs,away:as},
  priority:pri(leagueName,country)
 };
});

out.sort((a,b)=>{
 if(a.fixture.status.short==='LIVE'&&b.fixture.status.short!=='LIVE') return -1;
 if(b.fixture.status.short==='LIVE'&&a.fixture.status.short!=='LIVE') return 1;
 if(a.priority!==b.priority) return a.priority-b.priority;
 return a.fixture.berlinTime.localeCompare(b.fixture.berlinTime);
});

return new Response(JSON.stringify({response:out,results:out.length,usedDates:usedDates,credits:credits}),{headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}});
}catch(e){
 return new Response(JSON.stringify({response:[],error:e.message}),{headers:{"content-type":"application/json"}});
}
}
