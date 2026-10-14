export async function onRequest(context){
  const url = new URL(context.request.url);
  let date = url.searchParams.get('date') || 'today';

  // Handle date words
  if(date === 'today') date = new Date().toISOString().split('T')[0];
  else if(date === 'yesterday'){ let d=new Date(); d.setDate(d.getDate()-1); date=d.toISOString().split('T')[0]; }
  else if(date === 'tomorrow'){ let d=new Date(); d.setDate(d.getDate()+1); date=d.toISOString().split('T')[0]; }

  const API_KEY = context.env.LIVE_FOOTBALL_API_KEY || context.env.FOOTBALL_API_KEY || context.env.API_KEY;

  try{
    const apiRes = await fetch(`https://api.live-football-api.com/matches?date=${date}`,{
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-api-key': API_KEY
      },
      cf: { cacheTtl: 30, cacheEverything: false }
    });
    const raw = await apiRes.json();
    let list = raw.response || raw.data || raw.matches || [];

    // Normalize and FIX time + scores
    let out = list.map(m=>{
      let fixture = m.fixture || m;
      let league = m.league || {name: m.competition||'League', country: m.country||'World'};
      let teams = m.teams || {home:{name:m.home||'Home'}, away:{name:m.away||'Away'}};
      let goals = m.goals || {home: m.home_score??m.score?.home??null, away: m.away_score??m.score?.away??null};
      let status = fixture.status || {short: m.status||'NS', long: m.status||'Not Started', elapsed: m.minute||null};

      // Fix status mapping
      let short = (status.short||'').toString().toUpperCase();
      if(['LIVE','1H','2H','HT','ET','P'].includes(short)) short='LIVE';
      if(short==='FT' || short==='AET' || short==='PEN') short='FT';

      return {
        fixture: {
          id: fixture.id || Math.random(),
          date: fixture.date || fixture.start_time || new Date().toISOString(),
          timestamp: fixture.timestamp || new Date(fixture.date).getTime()/1000,
          status: { short: short, long: status.long||short, elapsed: status.elapsed||null }
        },
        league: { id: league.id||0, name: league.name||'League', country: league.country||'World' },
        teams: { home: {name: teams.home.name||teams.home}, away:{name: teams.away.name||teams.away} },
        goals: { home: goals.home, away: goals.away },
        score: m.score
      };
    });

    return new Response(JSON.stringify({response: out}),{
      headers: {
        "Content-Type":"application/json",
        "Access-Control-Allow-Origin":"*",
        "Cache-Control":"no-cache"
      }
    });
  }catch(e){
    return new Response(JSON.stringify({response:[], error:e.message}),{headers:{"Content-Type":"application/json"}});
  }
}
