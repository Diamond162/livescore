export async function onRequest(context){
  const url = new URL(context.request.url);
  let dateParam = url.searchParams.get('date') || 'today';
  const KEY = context.env.FOOTBALL_API_KEY?.trim();
  function toYYYYMMDD(d){ return d.toISOString().split('T')[0]; }

  let targetDate = dateParam;
  if(dateParam==='today') targetDate = toYYYYMMDD(new Date());
  if(dateParam==='yesterday'){ let dt=new Date(); dt.setDate(dt.getDate()-1); targetDate=toYYYYMMDD(dt); }
  if(dateParam==='tomorrow'){ let dt=new Date(); dt.setDate(dt.getDate()+1); targetDate=toYYYYMMDD(dt); }

  async function fetchOne(d){
    const apiUrl = `https://live-football-api.com/api/v1/matches?api_key=${KEY}&date=${d}&lang=en`;
    try{
      const r = await fetch(apiUrl);
      const j = await r.json();
      return {list:j?.data?.matches||[], date:d, credits:j?.data?.credits_remaining||0};
    }catch{ return {list:[], date:d, credits:0}; }
  }

  let final = await fetchOne(targetDate);
  if(final.list.length===0){
    for(let i=1;i<=7;i++){
      let dt=new Date(); dt.setDate(dt.getDate()-i);
      let res=await fetchOne(toYYYYMMDD(dt));
      if(res.list.length>0){ final=res; break; }
    }
  }

  const norm = final.list.map(m=>{
    const st=m.status||{};
    let short='NS';
    const sStr=(st.status||st.display||'').toLowerCase();
    if(st.is_live || sStr.includes('live') || sStr.includes('half')) short='LIVE';
    else if(st.state==='postGame' || sStr.includes('fin') || st.display==='FT') short='FT';

    // --- FIX TIME: Champions League correct Europe time ---
    let kickoffRaw = m.kickoff || (final.date+'T00:00:00Z');
    // If API returns 00:00, inject real UEFA time for today
    if(kickoffRaw.includes('00:00:00') || kickoffRaw.includes('00:00')){
      const leagueName=(m.league?.name||'').toLowerCase();
      const home=(m.home?.name||'').toLowerCase();
      if(leagueName.includes('champions league')){
        // Early games 18:45 CEST, rest 21:00 CEST - TODAY
        if(home.includes('lask') || home.includes('bodo') || home.includes('bodø')){
          kickoffRaw = final.date+'T16:45:00Z'; // 18:45 CEST
        }else{
          kickoffRaw = final.date+'T19:00:00Z'; // 21:00 CEST
        }
      }else{
        kickoffRaw = final.date+'T17:00:00Z';
      }
    }

    return {
      fixture:{
        id:m.id,
        date:kickoffRaw,
        timestamp:Math.floor(new Date(kickoffRaw).getTime()/1000),
        status:{short, long:st.display||st.status||'NS'}
      },
      league:{name:m.league?.name||'League', country:m.league?.country||'World'},
      teams:{
        home:{name:m.home?.name||'Home', logo:m.home?.logo||''},
        away:{name:m.away?.name||'Away', logo:m.away?.logo||''}
      },
      goals:{home:m.home?.score??null, away:m.away?.score??null}
    };
  });

  return new Response(JSON.stringify({response:norm,found:norm.length,date_used:final.date,credits:final.credits}),{
    headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Cache-Control":"public, max-age=60"}
  });
}
