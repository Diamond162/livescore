export async function onRequest(context) {
  const url = new URL(context.request.url);
  const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
  const LIVE_KEY = (context.env.LIVE_FOOTBALL_API_KEY || '').trim();
  const HIGH_KEY = (context.env.HIGHLIGHTLY_API_KEY || '').trim();

  // Helper to make Berlin time
  const toBerlin = (iso) => {
    try { return new Date(iso).toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit', timeZone:'Europe/Berlin'}); }
    catch { return '--:--'; }
  };

  // 1. TRY LIVE-FOOTBALL-API.COM FIRST (your 500 credits)
  if (LIVE_KEY) {
    try {
      // This is the real endpoint used by the official JS client
      const endpoints = [
        `https://api.live-football-api.com/matches?date=${date}&language=en`,
        `https://live-football-api.com/api/matches?date=${date}&language=en`
      ];
      for (let apiUrl of endpoints) {
        let r = await fetch(apiUrl, {
          headers: {
            'x-api-key': LIVE_KEY,
            'X-API-Key': LIVE_KEY,
            'Authorization': `Bearer ${LIVE_KEY}`
          }
        });
        let text = await r.text();
        let j = {};
        try { j = JSON.parse(text); } catch { continue; }

        // Response can be {data:{matches:[]}} or {matches:[]}
        let matches = j.data?.matches || j.data || j.matches || j.response || [];
        if (Array.isArray(matches) && matches.length > 0) {
          let out = matches.map(m => {
            let id = m.id || m.match_id || Math.random();
            let home = m.home_team?.name || m.homeTeam?.name || m.teams?.home || 'Home';
            let away = m.away_team?.name || m.awayTeam?.name || m.teams?.away || 'Away';
            let scoreH = m.scores?.home?? m.score?.home?? m.home_score?? 0;
            let scoreA = m.scores?.away?? m.score?.away?? m.away_score?? 0;
            let status = m.status || m.state || 'NS';
            let display = status === 'FT' || status === 'FINISHED'? `${scoreH}-${scoreA}` : (status === 'LIVE' || status === 'INPLAY'? `${scoreH}-${scoreA}` : '-:-');
            if (m.score && typeof m.score === 'string') display = m.score;

            return {
              fixture: { id: id, berlinTime: toBerlin(m.kickoff || m.date || m.start_time), status: { short: status } },
              league: { name: m.league?.name || m.competition || 'League', country: m.league?.country || 'World', fullName: `${m.league?.country || ''} - ${m.league?.name || 'League'}` },
              teams: { home: { name: home }, away: { name: away } },
              goals: { display: display, home: scoreH, away: scoreA }
            };
          });
          out.sort((a,b)=>a.fixture.berlinTime.localeCompare(b.fixture.berlinTime));
          return new Response(JSON.stringify({response: out, results: out.length, source: 'live-football-api', date}), {
            headers: {"content-type":"application/json","Access-Control-Allow-Origin":"*"}
          });
        }
      }
    } catch (e) {
      // fall through to highlightly
    }
  }

  // 2. FALLBACK TO HIGHLIGHTLY (old API)
  if (!HIGH_KEY) {
    return new Response(JSON.stringify({response:[], results:0, error: 'No API key'}), {headers:{"content-type":"application/json"}});
  }
  try {
    let all=[];
    for(let p=0;p<3;p++){
      let r=await fetch(`https://soccer.highlightly.net/matches?date=${date}&limit=100&offset=${p*100}`,{headers:{"x-rapidapi-key":HIGH_KEY,"x-rapidapi-host":"soccer.highlightly.net","x-api-key":HIGH_KEY}});
      let t=await r.text(); let j={}; try{j=JSON.parse(t);}catch{continue;}
      let list=j.data||j.matches||[]; if(!list.length) break; all=all.concat(list);
    }
    all.sort((a,b)=>new Date(a.date)-new Date(b.date));
    let out=all.map(m=>{
      return{fixture:{id:m.id,berlinTime:toBerlin(m.date),status:{short:m.state?.description||"NS"}},league:{name:m.league?.name||"League",country:m.country?.name||"World",fullName:`${m.country?.name||'World'} - ${m.league?.name||'League'}`},teams:{home:{name:m.homeTeam?.name||"Home"},away:{name:m.awayTeam?.name||"Away"}},goals:{display:m.score?.current||"-:-"}};
    });
    return new Response(JSON.stringify({response:out,results:out.length,source:'highlightly',date}),{headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}});
  } catch(e){
    return new Response(JSON.stringify({response:[],results:0,error:e.message}),{headers:{"content-type":"application/json"}});
  }
}
