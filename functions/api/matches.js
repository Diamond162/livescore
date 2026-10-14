export async function onRequest(context){
  const url = new URL(context.request.url);
  const dateParam = url.searchParams.get('date') || 'today';
  const KEY = context.env.FOOTBALL_API_KEY?.trim();

  async function fetchOne(d){
    const apiUrl = `https://live-football-api.com/api/v1/matches?api_key=${KEY}&date=${d}&lang=en`;
    const r = await fetch(apiUrl);
    const j = await r.json();
    const list = j?.data?.matches || [];
    return {list, date:d, credits:j?.data?.credits_remaining||j?.credits_remaining};
  }

  let final={list:[], date:dateParam};

  if(dateParam!=='today'){
    final = await fetchOne(dateParam);
  } else {
    const dates=[];
    for(let i=0;i<4;i++){ const dt=new Date(); dt.setDate(dt.getDate()-i); dates.push(dt.toISOString().split('T')[0]); }
    dates.push('2026-07-03','2026-07-02','2026-05-15');

    for(const d of dates){
      const res = await fetchOne(d);
      if(res.list.length>0){ final=res; break; }
    }
  }

  const norm = final.list.map(m=>{
    const st = m.status || {};
    let short='NS';
    const sStr = (st.status||st.display||'').toLowerCase();
    if(st.is_live || sStr.includes('live') || sStr.includes('inplay') || sStr.includes('ht')) short='LIVE';
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
        home:m.home?.score??m.score?.home??m.halftime?.home??null,
        away:m.away?.score??m.score?.away??m.halftime?.away??null
      }
    };
  });

  return new Response(JSON.stringify({response:norm, found:norm.length, date_used:final.date, credits:final.credits, source:'livefootball'}),{
    headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Cache-Control":"public, max-age=60"}
  });
}
