export async function onRequest(c){
const K=(c.env.LIVE_FOOTBALL_API_KEY||'').trim();
if(!K) return new Response(JSON.stringify({response:[]}),{headers:{"content-type":"application/json"}});
const toB=k=>{try{let i=String(k).trim().replace(' ','T');if(!i.endsWith('Z')&&!i.includes('+'))i+='Z';return new Date(i).toLocaleTimeString('en-GB',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit',hour12:false})}catch(e){return'00:00'}};
const pri=s=>{s=(s||'').toLowerCase();if(s.includes('uefa champions'))return 1;if(s.includes('champions league')&&!s.includes('afc'))return 1;if(s.includes('europa'))return 2;if(s.includes('premier'))return 4;if(s.includes('la liga'))return 5;if(s.includes('bundesliga'))return 6;if(s.includes('serie a'))return 7;return 100};
async function get(d){const r=await fetch(`https://live-football-api.com/api/v1/matches?date=${d}&api_key=${K}`);return await r.json();}
try{
let req='2026-10-14'; try{req=new URL(c.request.url).searchParams.get('date')||'2026-10-14'}catch(e){}
let j=await get(req); let used=req;
if(!j.matches||j.matches.length===0){
 for(let o=1;o<=7;o++){
  const d1=new Date(req);d1.setDate(d1.getDate()+o);const d2=new Date(req);d2.setDate(d2.getDate()-o);
  for(const dt of [d1.toISOString().split('T')[0],d2.toISOString().split('T')[0]]){
   const r=await get(dt); if(r.matches&&r.matches.length>0){j=r;used=dt;break;}
  } if(j.matches&&j.matches.length>0) break;
 }
}
const fmt=(j.matches||[]).map(m=>{const k=m.kickoff||m.date||'';const b=toB(k);let hs=m.score?.home??m.home_score??null;let as=m.score?.away??m.away_score??null;if(typeof m.score==='string'&&m.score.includes('-')){const p=m.score.split('-');hs=parseInt(p[0]);as=parseInt(p[1])}const st=String(m.status||'').toLowerCase();let sh='NS';if(st==='live')sh='LIVE';else if(st==='finished')sh='FT';else if(st==='ht')sh='HT';return{fixture:{id:m.id,date:k,berlinTime:b,status:{short:sh,long:m.status},minute:m.minute||null},league:{name:m.league?.name||'Other',country:m.league?.country||''},teams:{home:{name:m.home?.name||'Home'},away:{name:m.away?.name||'Away'}},goals:{home:hs,away:as},priority:pri(m.league?.name||''),status:m.status}});
fmt.sort((a,b)=>{if(a.fixture.status.short==='LIVE'&&b.fixture.status.short!=='LIVE')return-1;if(b.fixture.status.short==='LIVE'&&a.fixture.status.short!=='LIVE')return 1;if(a.priority!==b.priority)return a.priority-b.priority;return a.fixture.berlinTime.localeCompare(b.fixture.berlinTime);});
return new Response(JSON.stringify({response:fmt,results:fmt.length,usedDate:used}),{headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}});
}catch(e){return new Response(JSON.stringify({response:[],error:e.message}),{headers:{"content-type":"application/json"}});}
}
