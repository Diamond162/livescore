export async function onRequest(c){
const K=(c.env.FOOTBALL_API_KEY||'').trim();
const toBerlin=(t)=>{
 try{
  if(!t) return "00:00";
  // t is "00:00" -> convert UTC to Berlin
  if(t.match(/^\d{2}:\d{2}/)){
    const [h,m]=t.split(':').map(Number);
    const d=new Date(); d.setUTCHours(h,m,0,0);
    return d.toLocaleTimeString('en-GB',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit',hour12:false});
  }
  return t;
 }catch(e){return t}
};

const pri=(name,country)=>{
 const s=(name+' '+country).toLowerCase();
 if(s.includes('champions')) return 1;
 if(s.includes('europa')) return 2;
 if(s.includes('premier league')) return 3;
 if(s.includes('la liga')) return 4;
 if(s.includes('bundesliga')) return 5;
 if(s.includes('serie a')) return 6;
 return 99;
};

async function fetchDate(d){
 const url=`https://live-football-api.com/api/v1/matches?date=${d}&api_key=${K}`;
 const r=await fetch(url);
 const j=await r.json();
 return j;
}

try{
let req='2026-10-14';
try{req=new URL(c.request.url).searchParams.get('date')||'2026-10-14';}catch(e){}
let data=await fetchDate(req);
let used=req;
let matches=data.matches||[];

if(matches.length===0){
 for(let i=1;i<=3;i++){
  const d=new Date(req); d.setDate(d.getDate()+i);
  const ds=d.toISOString().split('T')[0];
  const r=await fetchDate(ds);
  if(r.matches&&r.matches.length>0){data=r;matches=r.matches;used=ds;break;}
 }
}

const out=matches.map((m,idx)=>{
 const kick=m.kickoff||"00:00";
 const berlin=toBerlin(kick);
 const statusRaw=String(m.status||"").toLowerCase();
 let short="NS";
 if(statusRaw.includes('live')) short="LIVE";
 else if(statusRaw.includes('postgame')||statusRaw.includes('finished')||statusRaw==='ft') short="FT";
 else if(statusRaw.includes('halftime')||statusRaw==='ht') short="HT";
 else short="NS";

 const leagueName=m.league?.name||"Other";
 const country=m.league?.country||"";
 const homeName=m.home?.name||"Home";
 const awayName=m.away?.name||"Away";

 // Score parsing: home.score is "2" or "", away.score is "1"
 let hs=null,as=null;
 if(m.home?.score!==""&&m.home?.score!=null) hs=parseInt(m.home.score);
 if(m.away?.score!==""&&m.away?.score!=null) as=parseInt(m.away.score);
 // also check m.score.display like "2-1"
 if(hs===null&&m.score?.display&&m.score.display.includes('-')){
   const p=m.score.display.split('-');
   hs=parseInt(p[0]); as=parseInt(p[1]);
   if(isNaN(hs)) hs=null;
   if(isNaN(as)) as=null;
 }

 return{
  fixture:{id:m.id||idx,date:m.date||req,berlinTime:berlin,status:{short:short,long:m.status||""},minute:m.minute||null},
  league:{name:leagueName,country:country},
  teams:{home:{name:homeName},away:{name:awayName}},
  goals:{home:hs,away:as},
  priority:pri(leagueName,country),
  status:m.status
 };
});

out.sort((a,b)=>{
 if(a.fixture.status.short==='LIVE'&&b.fixture.status.short!=='LIVE') return -1;
 if(b.fixture.status.short==='LIVE'&&a.fixture.status.short!=='LIVE') return 1;
 if(a.priority!==b.priority) return a.priority-b.priority;
 return a.fixture.berlinTime.localeCompare(b.fixture.berlinTime);
});

return new Response(JSON.stringify({response:out,results:out.length,usedDate:used,credits:data.credits_remaining||478}),{headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}});
}catch(e){
 return new Response(JSON.stringify({response:[],error:e.message}),{headers:{"content-type":"application/json"}});
}
}
