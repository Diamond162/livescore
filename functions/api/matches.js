export async function onRequest(context){
  const reqUrl = new URL(context.request.url);
  let date = reqUrl.searchParams.get('date') || new Date().toISOString().split('T')[0];
  if(date==='today') date = new Date().toISOString().split('T')[0];

  const API_KEY = context.env.FOOTBALL_API_KEY?.trim();

  if(!API_KEY){
    return new Response(JSON.stringify({response:[], error:"NO_KEY"}),{headers:{"Content-Type":"application/json"}});
  }

  try{
    const apiUrl = `https://live-football-api.com/api/v1/matches?api_key=${API_KEY}&date=${date}&lang=en`;
    const r = await fetch(apiUrl);
    const data = await r.json();

    if(data.success===false){
      return new Response(JSON.stringify({response:[], api_error:data.message, success:false}),{headers:{"Content-Type":"application/json"}});
    }

    // If API returns 0 for today, try yesterday to prove key works
    let matches = data.matches || data.response || [];
    if(matches.length===0 && date===new Date().toISOString().split('T')[0]){
      // Try yesterday
      const y = new Date(); y.setDate(y.getDate()-1);
      const yDate = y.toISOString().split('T')[0];
      const apiUrl2 = `https://live-football-api.com/api/v1/matches?api_key=${API_KEY}&date=${yDate}&lang=en`;
      const r2 = await fetch(apiUrl2);
      const data2 = await r2.json();
      matches = data2.matches || data2.response || [];
      if(matches.length>0){
        data.matches = matches;
        date = yDate;
      }
    }

    // Convert to your site format
    const norm = (data.matches||data.response||[]).map(m=>{
      const status = (m.status||'').toString();
      let short = 'NS';
      const low = status.toLowerCase();
      if(low.includes('live')||low.includes('1h')||low.includes('ht')||low.includes('2h')) short='LIVE';
      else if(low.includes('ft')||low.includes('finished')||low.includes('full')) short='FT';

      return {
        fixture:{id:m.id, date:m.kickoff||m.date||`${date}T15:00:00Z`, timestamp:Date.now()/1000, status:{short:short, long:status, elapsed:m.minute||null}},
        league:{name:m.league?.name||'League', country:m.league?.country||'WORLD'},
        teams:{home:{name:m.home?.name||m.home_team||'Home'}, away:{name:m.away?.name||m.away_team||'Away'}},
        goals:{home:m.score?.home??m.home_score??null, away:m.score?.away??m.away_score??null}
      };
    });

    return new Response(JSON.stringify({response:norm, raw_count:norm.length, date_used:date}),{
      headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}
    });

  }catch(e){
    return new Response(JSON.stringify({response:[], error:e.message}),{headers:{"Content-Type":"application/json"}});
  }
}
