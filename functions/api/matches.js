export async function onRequest(context){
  const url = new URL(context.request.url);
  let dateParam = url.searchParams.get('date') || 'today';
  const KEY = context.env.FOOTBALL_API_KEY?.trim();

  function toYYYYMMDD(d){
    return d.toISOString().split('T')[0];
  }

  // Convert today/yesterday/tomorrow to real date
  let targetDate = dateParam;
  if(dateParam==='today') targetDate = toYYYYMMDD(new Date());
  if(dateParam==='yesterday'){ let dt=new Date(); dt.setDate(dt.getDate()-1); targetDate=toYYYYMMDD(dt); }
  if(dateParam==='tomorrow'){ let dt=new Date(); dt.setDate(dt.getDate()+1); targetDate=toYYYYMMDD(dt); }
  if(dateParam && dateParam.includes('-')===false && dateParam!=='today' && dateParam!=='yesterday' && dateParam!=='tomorrow'){
    targetDate = toYYYYMMDD(new Date());
  }

  async function fetchOne(d){
    const apiUrl = `https://live-football-api.com/api/v1/matches?api_key=${KEY}&date=${d}&lang=en`;
    try{
      const r = await fetch(apiUrl);
      const j = await r.json();
      const list = j?.data?.matches || [];
      const credits = j?.data?.credits_remaining || j?.credits_remaining;
      return {list, date:d, credits, raw:j};
    }catch(e){ return {list:[], date:d, credits:0, error:e.message}; }
  }

  let final = await fetchOne(targetDate);

  // ALWAYS FIND MATCHES: if today empty, search last 7 days (saves your 482 credits)
  if(final.list.length===0){
    for(let i=1;i<=7;i++){
      let dt=new Date(); dt.setDate(dt.getDate()-i);
      let dStr=toYYYYMMDD(dt);
      let res=await fetchOne(dStr);
      if(res.list.length>0){ final=res; break; }
    }
  }

  const norm = final.list.map(m=>{
    const st=m.status||{};
    let short='NS';
    const sStr=(st.status||st.display||'').toLowerCase();
    if(st.is_live || sStr.includes('live') || sStr.includes('half')) short='LIVE';
    else if(st.state==='postGame' || sStr.includes('fin') || st.display==='FT') short='FT';

    return {
      fixture:{
        id:m.id,
        date:m.kickoff||final.date+'T12:00:00Z',
        timestamp:Math.floor(new Date(m.kickoff||Date.now()).getTime()/1000),
        status:{short, long:st.display||st.status||'NS'}
      },
      league:{name:m.league?.name||'League', country:m.league?.country||'World'},
      teams:{
        home:{name:m.home?.name||'Home', logo:m.home?.logo||''},
        away:{name:m.away?.name||'Away', logo:m.away?.logo||''}
      },
      goals:{
        home:m.home?.score?? m.score?.home?? null,
        away:m.away?.score?? m.score?.away?? null
      }
    };
  });

  return new Response(JSON.stringify({
    response:norm,
    found:norm.length,
    date_used:final.date,
    credits:final.credits,
    source:'livefootball-ONLY'
  }),{
    headers:{
      "Content-Type":"application/json",
      "Access-Control-Allow-Origin":"*",
      "Cache-Control":"public, max-age=60"
    }
  });
}
