// REAL ONLY - NO DEMO - Uses FOOTBALL_API_KEY
export async function onRequest(c){
const K=(c.env.FOOTBALL_API_KEY||'').trim();
if(!K) return new Response(JSON.stringify({response:[],error:"NO KEY - FOOTBALL_API_KEY not set in Cloudflare"}),{headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}});

const toB=k=>{try{let s=String(k).trim().replace(' ','T');if(!s.endsWith('Z')&&!s.includes('+'))s+='Z';return new Date(s).toLocaleTimeString('en-GB',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit',hour12:false})}catch(e){return'00:00'}};
const pri=s=>{s=(s||'').toLowerCase();if(s.includes('uefa champions')||(s.includes('champions league')&&!s.includes('afc')))return 1;if(s.includes('europa'))return 2;if(s.includes('premier'))return 3;if(s.includes('la liga'))return 4;if(s.includes('bundesliga'))return 5;if(s.includes('serie a'))return 6;return 99};

async function fetchDate(d){
 const r=await fetch(`https://live-football-api.com/api/v1/matches?date=${d}&api_key=${K}`);
 const txt=await r.text();
 let j={}; try{j=JSON.parse(txt)}catch(e){j={raw:txt,status:r.status}}
 return {http:r.status,json:j,txt};
}

try{
let req='2026-10-14';
try{const u=new URL(c.request.url);req=u.searchParams.get('date')||'2026-10-14';}catch(e){}

let result=await fetchDate(req);
let used=req;
let matches=result.json.matches||[];

// If 0, search ±7 days for real matches
if(matches.length===0){
 for(let o=1;o<=7;o++){
  const d1=new Date(req);d1.setDate(d1.getDate()+o);
  const d2=new Date(req);d2.setDate(d2.getDate()-o);
  for(const dt of [d1.toISOString().split('T')[0], d2.toISOString().split('T')[0]]){
   const r=await fetchDate(dt);
   if(r.json.matches&&r.json.matches.length>0){result=r;matches=r.json.matches;used=dt;break;}
  }
  if(matches.length>0) break;
 }
}

// If still 0, return REAL API error so you can see problem
if(matches.length===0){
 return new Response(JSON.stringify({
   response:[],
   results:0,
   requested:req,
   usedDate:used,
   apiHttpStatus:result.http,
   apiResponse:result.json,
   hint:"If apiResponse says Invalid key or No credits -> your FOOTBALL_API_KEY is wrong or empty. Go live-football-api.com dashboard -> check credits and key"
 },null,2),{headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}});
}

const out=matches.map(m=>{
 const k=m.kickoff||m.date||'';
 const b=toB(k);
 let hs=m.score?.home??m.home_score??null;
 let as=m.score?.away??m.away_score??null;
 if(typeof m.score==='string'&&m.score.includes('-')){const p=m.score.split('-');hs=parseInt(p[0]);as=parseInt(p[1])}
 const st=String(m.status||'').toLowerCase();
 let sh='NS'; if(st.includes('live')) sh='LIVE'; else if(st.includes('finish')||st==='ft') sh='FT'; else if(st.includes('half')||st==='ht') sh='HT';
 return{
   fixture:{id:m.id,date:k,berlinTime:b,status:{short:sh,long:m.status||''},minute:m.minute||null},
   league:{name:m.league?.name||'Other',country:m.league?.country||''},
   teams:{home:{name:m.home?.name||m.home?.team||'Home'},away:{name:m.away?.name||m.away?.team||'Away'}},
   goals:{home:hs,away:as},
   priority:pri(m.league?.name||''),
   status:m.status
 };
});

out.sort((a,b)=>{
 if(a.fixture.status.short==='LIVE'&&b.fixture.status.short!=='LIVE')return-1;
 if(b.fixture.status.short==='LIVE'&&a.fixture.status.short!=='LIVE')return 1;
 if(a.priority!==b.priority) return a.priority-b.priority;
 return a.fixture.berlinTime.localeCompare(b.fixture.berlinTime);
});

return new Response(JSON.stringify({response:out,results:out.length,requested:req,usedDate:used}),{headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}});

}catch(e){
 return new Response(JSON.stringify({response:[],error:e.message,stack:e.stack}),{headers:{"content-type":"application/json"}});
}
}
