export async function onRequest(c){
const K=(c.env.FOOTBALL_API_KEY||'').trim();
if(!K) return new Response(JSON.stringify({response:[]}),{headers:{"content-type":"application/json"}});

const toB=k=>{
 try{
  if(!k) return "00:00";
  let s=String(k).trim();
  if(s.includes('T')&&s.includes('Z')) return new Date(s).toLocaleTimeString('en-GB',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit',hour12:false});
  if(s.match(/^\d{2}:\d{2}/)){
   const [h,m]=s.split(':').map(Number);
   const d=new Date(); d.setUTCHours(h,m,0,0);
   return d.toLocaleTimeString('en-GB',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit',hour12:false});
  }
  return s;
 }catch(e){return "00:00"}
};

const pri=s=>{s=(s||'').toLowerCase();if(s.includes('champions'))return 1;if(s.includes('europa'))return 2;if(s.includes('premier'))return 3;if(s.includes('la liga')||s.includes('primera'))return 4;if(s.includes('bundesliga'))return 5;if(s.includes('serie a'))return 6;return 99;};

async function get(d){
 const r=await fetch(`https://live-football-api.com/api/v1/matches?date=${d}&api_key=${K}`);
 const j=await r.json();
 return j;
}

function toArray(v){
 if(!v) return [];
 if(Array.isArray(v)) return v;
 if(typeof v==='object') return Object.values(v);
 return [];
}

try{
let req='2026-10-14';
try{req=new URL(c.request.url).searchParams.get('date')||'2026-10-14'}catch(e){}
let j=await get(req);
let used=req;
let list=toArray(j.matches||j.data||j.response||j.result||[]);

if(list.length===0){
 for(let o=1;o<=3;o++){
  const d1=new Date(req); d1.setDate(d1.getDate()+o);
  const dt=d1.toISOString().split('T')[0];
  const r=await get(dt);
  const l=toArray(r.matches||r.data||[]);
  if(l.length>0){j=r;list=l;used=dt;break;}
 }
}

const out=list.map(m=>{
 const kick=m.kickoff||m.time||m.kick_off||"00:00";
 const berlin=toB(kick);
 const statusRaw=String(m.status||'').toLowerCase();
 let short='NS';
 if(statusRaw.includes('live')||m.is_live) short='LIVE';
 else if(statusRaw.includes('finish')||statusRaw==='ft') short='FT';
 else if(statusRaw.includes('half')||statusRaw==='ht') short='HT';

 let hs=null,as=null;
 if(m.home?.score!=null) hs=m.home.score;
 if(m.away?.score!=null) as=m.away.score;
 if(m.score){
  if(typeof m.score==='string'&&m.score.includes('-')){const p=m.score.split('-');hs=parseInt(p[0]);as=parseInt(p[1]);}
  else {hs=m.score.home??m.score.h??hs; as=m.score.away??m.score.a??as;}
 }

 const leagueName=m.league?.name||m.competition||'Other';
 const country=m.league?.country||m.country||'';
 const homeName=m.home?.name||m.home_team?.name||'Home';
 const awayName=m.away?.name||m.away_team?.name||'Away';

 return{
  fixture:{id:m.id||Math.random(),date:m.date||req,berlinTime:berlin,status:{short:short,long:m.status||''},minute:m.minute||null},
  league:{name:leagueName,country:country},
  teams:{home:{name:homeName},away:{name:awayName}},
  goals:{home:hs,away:as},
  priority:pri(leagueName),
  status:m.status
 };
});

out.sort((a,b)=>{
 if(a.fixture.status.short==='LIVE'&&b.fixture.status.short!=='LIVE') return -1;
 if(b.fixture.status.short==='LIVE'&&a.fixture.status.short!=='LIVE') return 1;
 if(a.priority!==b.priority) return a.priority-b.priority;
 return a.fixture.berlinTime.localeCompare(b.fixture.berlinTime);
});

return new Response(JSON.stringify({response:out,results:out.length,usedDate:used}),{headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}});
}catch(e){
 return new Response(JSON.stringify({response:[],error:e.message+" | "+e.stack}),{headers:{"content-type":"application/json"}});
}
}
