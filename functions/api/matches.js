export async function onRequest(context){
  const reqUrl = new URL(context.request.url);
  let dateParam = reqUrl.searchParams.get('date');
  const API_KEY = context.env.FOOTBALL_API_KEY?.trim();
  if(!API_KEY) return new Response(JSON.stringify({response:[], error:"NO_KEY"}),{headers:{"Content-Type":"application/json"}});
  async function fetchDate(d){
    const url = `https://live-football-api.com/api/v1/matches?api_key=${API_KEY}&date=${d}&lang=en`;
    const r = await fetch(url);
    const j = await r.json();
    if(j.success===false) return [];
    return j.matches || j.response || [];
  }
  try{
    let matches = [];
    let usedDate = null;
    if(dateParam && dateParam!=='today'){
      matches = await fetchDate(dateParam);
      usedDate = dateParam;
    } else {
      for(let i=0;i<7;i++){
        const d = new Date(); d.setDate(d.getDate()-i);
        const iso = d.toISOString().split('T')[0];
        const m = await fetchDate(iso);
        if(m.length>0){ matches=m; usedDate=iso; break; }
      }
      if(matches.length===0){
        const tom = new Date(); tom.setDate(tom.getDate()+1);
        const iso = tom.toISOString().split('T')[0];
        matches = await fetchDate(iso);
        usedDate = iso;
      }
    }
    const norm = matches.map(m=>{
      let short='NS'; const s=(m.status||'').toLowerCase();
      if(s.includes('live')||s.includes('1h')||s.includes('ht')||s.includes('2h')) short='LIVE';
      else if(s.includes('ft')||s.includes('fin')||s.includes('full')||s.includes('ended')) short='FT';
      return {
        fixture:{id:m.id, date:m.kickoff||`${usedDate}T15:00:00Z`, timestamp:Math.floor(new Date(m.kickoff||Date.now()).getTime()/1000), status:{short, long:m.status, elapsed:m.minute||null}},
        league:{name:m.league?.name||'League', country:m.league?.country||'WORLD'},
        teams:{home:{name:m.home?.name||m.home_team||'Home'}, away:{name:m.away?.name||m.away_team||'Away'}},
        goals:{home:m.score?.home??m.home_score??null, away:m.score?.away??m.away_score??null}
      };
    });
    return new Response(JSON.stringify({response:norm, date_used:usedDate, found:norm.length}),{headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}});
  }catch(e){
    return new Response(JSON.stringify({response:[], error:e.message}),{headers:{"Content-Type":"application/json"}});
  }
}
