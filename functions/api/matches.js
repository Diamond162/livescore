export async function onRequest(c){
const K=(c.env.FOOTBALL_API_KEY||'').trim();

const toBerlin=(t)=>{
 try{
  if(!t) return "00:00";
  const str=String(t).trim();
  if(str.match(/^\d{2}:\d{2}/)){
    const [h,m]=str.split(':').map(Number);
    const d=new Date(); d.setUTCHours(h,m,0,0);
    return d.toLocaleTimeString('en-GB',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit',hour12:false});
  }
  return str;
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
  const r=await fetch(url,{cf:{cacheTtl:60}});
  const j=await r.json();
  return j;
 }catch(e){return {matches:[],credits_remaining:0};}
}

try{
let req=new Date().toISOString().split('T')[0];
try{ req=new URL(c.request.url).searchParams.get('date')||req; }catch(e){}

let all=[];
let credits=0;
let usedDates=[];

 // Fetch requested date + next 2 days to never be empty if API has sparse data
 for(let i=0;i<3;i++){
   const d=new Date(req); d.setDate(d.getDate()+i);
   const ds=d.toISOString().split('T')[0];
   const data=await fetchDate(ds);
   if(data.credits_remaining) credits=data.credits_remaining;
   const ms=data.matches||[];
   if(ms.length>0){
     ms.forEach(m=>all.push({...m,_date:ds}));
     usedDates.push(ds);
   }
 }

const out=all.map((m,idx)=>{
 const berlin=toBerlin(m.kickoff||m.time||"00:00");
 const s=String(m.status||"").toLowerCase();
 let short="NS";
 if(s.includes('live')||s==='inplay') short="LIVE";
 else if(s.includes('postgame')||s.includes('finished')||s==='ft'||s==='aet'||s==='pen') short="FT";
 else if(s.includes('halftime')||s==='ht') short="HT";
 else short="NS";

 let hs=null,as=null;
 if(m.home?.score!==""&&m.home?.score!=null&&!isNaN(m.home.score)) hs=parseInt(m.home.score);
 if(m.away?.score!==""&&m.away?.score!=null&&!isNaN(m.away.score)) as=parseInt(m.away.score);

 // Also try m.score.display like "1-0"
 if(hs===null && m.score?.display && m.score.display.includes('-')){
   const p=m.score.display.split('-');
   if(!isNaN(p[0])) hs=parseInt(p[0]);
   if(!isNaN(p[1])) as=parseInt(p[1]);
 }

 return{
  fixture:{id:m.id||`m-${idx}`,date:m._date||req,berlinTime:berlin,status:{short:short,long:m.status||""},minute:m.minute||null},
  league:{name:m.league?.name||"Other",country:m.league?.country||""},
  teams:{home:{name:m.home?.name||"Home"},away:{name:m.away?.name||"Away"}},
  goals:{home:hs,away:as},
  priority:pri(m.league?.name||"",m.league?.country||"")
 };
});

out.sort((a,b)=>{
 if(a.fixture.status.short==='LIVE'&&b.fixture.status.short!=='LIVE') return -1;
 if(b.fixture.status.short==='LIVE'&&a.fixture.status.short!=='LIVE') return 1;
 if(a.priority!==b.priority) return a.priority-b.priority;
 return a.fixture.berlinTime.localeCompare(b.fixture.berlinTime);
});

return new Response(JSON.stringify({response:out,results:out.length,usedDates:usedDates,credits:credits,date:req}),{headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*","Cache-Control":"no-cache"}});
}catch(e){
 return new Response(JSON.stringify({response:[],results:0,error:e.message}),{headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}});
}
}
