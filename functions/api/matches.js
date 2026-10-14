export async function onRequest(context){
  const url = new URL(context.request.url);
  let dateParam = url.searchParams.get('date') || 'today';
  const KEY = context.env.FOOTBALL_API_KEY?.trim();

  // FIX: Convert "today" to YYYY-MM-DD
  if(dateParam==='today' ||!dateParam){
    dateParam = new Date().toISOString().split('T')[0]; // e.g 2026-10-14
  }

  async function fetchOne(d){
    const apiUrl = `https://live-football-api.com/api/v1/matches?api_key=${KEY}&date=${d}&lang=en`;
    const r = await fetch(apiUrl);
    const j = await r.json();
    const list = j?.data?.matches || [];
    return {list, date:d, raw:j, credits:j?.data?.credits_remaining};
  }

  let final = await fetchOne(dateParam);

  // If today no matches, try last 6 days (to save your 482 credits)
  if(final.list.length===0){
    for(let i=1;i<=6;i++){
      const dt=new Date(); dt.setDate(dt.getDate()-i);
      const dStr=dt.toISOString().split('T')[0];
      const res = await fetchOne(dStr);
      if(res.list.length>0){ final=res; break; }
    }
  }

  const norm = final.list.map(m=>{
    const st = m.status || {};
    let short='NS';
    const sStr = (st.status||st.display||'').toLowerCase();
    if(st.is_live) short='LIVE';
    else if(st.state==='postGame' || sStr.includes('finish') || st.display==='FT') short='FT';

    return {
      fixture:{
        id:m.id,
        date:m.kickoff||final.date+'T12:00:00Z',
        timestamp:Math.floor(new Date(m.kickoff||Date.now()).getTime()/1000),
        status:{short, long:st.display||st.status||'NS', elapsed:null}
      },
      league:{name:m.league?.name||'League', country:m.league?.country||'World'},
      teams:{
        home:{name:m.home?.name||'Home', logo:m.home?.logo},
        away:{name:m.away?.name||'Away', logo:m.away?.logo}
      },
      goals:{
        home:m.home?.score??null,
        away:m.away?.score??null
      }
    };
  });

  return new Response(JSON.stringify({response:norm, found:norm.length, date_used:final.date, credits:final.credits, source:'livefootball-only'}),{
    headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Cache-Control":"public, max-age=60"}
  });
}
