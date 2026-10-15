export async function onRequest(c){
const K=(c.env.FOOTBALL_API_KEY||'').trim();
if(!K) return new Response(JSON.stringify({response:[],error:"NO KEY"}),{headers:{"content-type":"application/json"}});

const toBerlin=(kickoff)=>{
 try{
  if(!kickoff) return "00:00";
  // kickoff is like "2026-06-10T17:00:00+00:00"
  const d=new Date(kickoff);
  return d.toLocaleTimeString('en-GB',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit',hour12:false});
 }catch(e){return "00:00"}
};

const priority=(name)=>{
 name=(name||'').toLowerCase();
 if(name.includes('champions')) return 1;
 if(name.includes('europa')) return 2;
 if(name.includes('premier league')) return 3;
 if(name.includes('la liga')) return 4;
 if(name.includes('bundesliga')) return 5;
 if(name.includes('serie a')) return 6;
 return 99;
};

async function fetchApi(date){
 const url=`https://live-football-api.com/api/v1/matches?date=${date}&api_key=${K}`;
 const res=await fetch(url);
 const json=await res.json();
 return json;
}

function normalize(raw){
 // raw is {matches: [...]} or {data: [...]}
 let arr = raw.matches || raw.data || raw.response || [];
 if(!Array.isArray(arr)){
   if(typeof arr==='object') arr=Object.values(arr);
   else arr=[];
 }
 return arr;
}

try{
 let req='2026-10-14';
 try{req=new URL(c.request.url).searchParams.get('date')||'2026-10-14';}catch(e){}

 let apiData=await fetchApi(req);
 let matches=normalize(apiData);
 let used=req;

 if(matches.length===0){
   // try +1 day because your API has no games for today
   for(let i=1;i<=3;i++){
     const d=new Date(req); d.setDate(d.getDate()+i);
     const ds=d.toISOString().split('T')[0];
     const r=await fetchApi(ds);
     const arr=normalize(r);
     if(arr.length>0){matches=arr; apiData=r; used=ds; break;}
   }
 }

 const out=matches.map(m=>{
   // REAL FIELDS from API docs
   const kickoff=m.kickoff || m.date || "";
   const berlin=toBerlin(kickoff);

   const statusRaw=String(m.status||"").toLowerCase(); // scheduled, live, finished
   let short="NS";
   if(statusRaw==="live") short="LIVE";
   else if(statusRaw==="finished") short="FT";
   else if(statusRaw==="halftime"||statusRaw==="ht") short="HT";
   else if(statusRaw==="scheduled") short="NS";

   const leagueName=m.league?.name || "Other";
   const country=m.league?.country || "";

   // home/away can be object or string
   let homeName="Home", awayName="Away";
   if(typeof m.home==='string') homeName=m.home;
   else if(m.home?.name) homeName=m.home.name;

   if(typeof m.away==='string') awayName=m.away;
   else if(m.away?.name) awayName=m.away.name;

   let hs=null, as=null;
   if(m.score){
     if(typeof m.score==='object'){
       hs=m.score.home?? m.score.h?? null;
       as=m.score.away?? m.score.a?? null;
     }
   }

   return{
     fixture:{id:m.id||Math.random(),date:kickoff,berlinTime:berlin,status:{short:short,long:m.status||""},minute:m.minute||null},
     league:{name:leagueName,country:country},
     teams:{home:{name:homeName},away:{name:awayName}},
     goals:{home:hs,away:as},
     priority:priority(leagueName),
     status:m.status
   };
 });

 out.sort((a,b)=>{
   if(a.fixture.status.short==='LIVE'&&b.fixture.status.short!=='LIVE') return -1;
   if(b.fixture.status.short==='LIVE'&&a.fixture.status.short!=='LIVE') return 1;
   if(a.priority!==b.priority) return a.priority-b.priority;
   return a.fixture.berlinTime.localeCompare(b.fixture.berlinTime);
 });

 return new Response(JSON.stringify({response:out,results:out.length,usedDate:used,rawCount:matches.length}),{headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}});
}catch(e){
 return new Response(JSON.stringify({response:[],error:e.message}),{headers:{"content-type":"application/json"}});
}
}
