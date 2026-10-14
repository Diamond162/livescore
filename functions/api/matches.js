export async function onRequest(c){
const K=(c.env.LIVE_FOOTBALL_API_KEY||'').trim();
const u=new URL(c.request.url);
let d=u.searchParams.get('date')||new Date().toISOString().split('T')[0];
if(!/^\d{4}-\d{2}-\d{2}$/.test(d)) d=new Date().toISOString().split('T')[0];
if(!K) return new Response(JSON.stringify({response:[],error:"NO KEY"}),{headers:{"content-type":"application/json"}});
const toB=k=>{if(!k)return'00:00';try{let i=String(k).trim().replace(' ','T');if(!i.endsWith('Z')&&!i.includes('+'))i+='Z';const D=new Date(i);if(isNaN(D))return String(k).slice(11,16)||'00:00';return D.toLocaleTimeString('en-GB',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit',hour12:false})}catch(e){return'00:00'}};
const pri=(n,co)=>{const s=(n+' '+(co||'')).toLowerCase();if(s.includes('uefa champions league'))return 1;if(s.includes('champions league')&&!s.includes('afc')&&!s.includes('gcc')&&!s.includes('two'))return 1;if(s.includes('europa league'))return 2;if(s.includes('conference'))return 3;if(s.includes('premier league'))return 4;if(s.includes('la liga'))return 5;if(s.includes('bundesliga'))return 6;if(s.includes('serie a'))return 7;if(s.includes('ligue 1'))return 8;if(s.includes('afc champions league two'))return 25;if(s.includes('afc champions'))return 20;if(s.includes('gcc'))return 30;return 100};
async function fetchD(date){const api=`https://live-football-api.com/api/v1/matches?date=${date}&api_key=${K}`;const r=await fetch(api);const j=await r.json();return{date,matches:j.matches||[],credits:j.credits_remaining,msg:j.message||'ok'}};
try{
let logs=[];let ms=[];
let first=await fetchD(d);logs.push(first);ms=first.matches;
// If requested date (Oct 2026) has 0 matches, force REAL TODAY dates
if(ms.length===0){
  const now=new Date();
  const fmt=x=>x.toISOString().split('T')[0];
  const today=fmt(now);
  const y=new Date(now);y.setDate(now.getDate()-1);const yest=fmt(y);
  const t=new Date(now);t.setDate(now.getDate()+1);const tom=fmt(t);
  const ry=await fetchD(yest);logs.push(ry);if(ry.matches.length>0)ms=ry.matches;
  if(ms.length===0){const rt=await fetchD(today);logs.push(rt);if(rt.matches.length>0)ms=rt.matches;}
  if(ms.length===0){const rtm=await fetchD(tom);logs.push(rtm);if(rtm.matches.length>0)ms=rtm.matches;}
  // Last try: May 13 2026 if API server date wrong
  if(ms.length===0){const fallback=await fetchD(today);logs.push(fallback);ms=fallback.matches;}
}
const fmt=ms.map(m=>{const k=m.kickoff||m.date||'';const b=toB(k);let hs=m.score?.home??m.home_score??null;let as=m.score?.away??m.away_score??null;if(typeof m.score==='string'&&m.score.includes('-')){const p=m.score.split('-');hs=parseInt(p[0]);as=parseInt(p[1])}const st=String(m.status||'').toLowerCase();let sh='NS';if(st==='live')sh='LIVE';else if(st==='finished')sh='FT';else if(st==='ht'||st==='halftime')sh='HT';return{fixture:{id:m.id,date:k,berlinTime:b,status:{short:sh,long:m.status},minute:m.minute||null},league:{name:m.league?.name||'Other',country:m.league?.country||''},teams:{home:{name:m.home?.name||'Home'},away:{name:m.away?.name||'Away'}},goals:{home:hs,away:as},priority:pri(m.league?.name||'',m.league?.country||''),status:m.status}});
fmt.sort((a,b)=>{if(a.fixture.status.short==='LIVE'&&b.fixture.status.short!=='LIVE')return-1;if(b.fixture.status.short==='LIVE'&&a.fixture.status.short!=='LIVE')return 1;if(a.priority!==b.priority)return a.priority-b.priority;return a.fixture.berlinTime.localeCompare(b.fixture.berlinTime)});
return new Response(JSON.stringify({response:fmt,results:fmt.length,debug:logs,requested:d,realToday:new Date().toISOString().split('T')[0]}),{headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}});
}catch(e){return new Response(JSON.stringify({response:[],error:e.message}),{headers:{"content-type":"application/json"}})}
}
