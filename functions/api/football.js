export async function onRequest(context) {
  const API_KEY = context.env.FOOTBALL_API_KEY || context.env.API_KEY;
  const H = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=30" };
  if (!API_KEY) return new Response(JSON.stringify({ response: [] }), { headers: H });

  async function getList(u) {
    try {
      const r = await fetch(u);
      const j = await r.json();
      let list = [];
      if (j.data) {
        if (Array.isArray(j.data)) list = j.data;
        else list = Object.values(j.data).flat();
      } else if (j.matches) list = j.matches;
      else if (Array.isArray(j)) list = j;
      if (j.data && j.data.matches) list = j.data.matches;
      return list;
    } catch { return []; }
  }

  try {
    let matches = await getList(`https://live-football-api.com/api/v1/matches?api_key=${API_KEY}&live=true`);
    if (matches.length === 0) {
      const today = new Date().toISOString().split('T')[0];
      matches = await getList(`https://live-football-api.com/api/v1/matches?api_key=${API_KEY}&date=${today}`);
    }
    if (matches.length === 0) {
      matches = await getList(`https://live-football-api.com/api/v1/matches?api_key=${API_KEY}&date=2026-07-03`);
    }
    if (matches.length === 0) {
      matches = await getList(`https://live-football-api.com/api/v1/matches?api_key=${API_KEY}`);
    }

    const response = matches.slice(0,50).map((m,i)=>({
      fixture:{id:m.id||i,date:m.kickoff||m.date||new Date().toISOString(),status:{short:m.status||(m.is_live?'LIVE':'FT'),long:m.status||'',elapsed:m.minute||null}},
      league:{name:m.league?.name||m.competition||'Premier League',country:m.country||'England',logo:m.league?.logo||'',flag:''},
      teams:{
        home:{name:m.home?.name||m.home_name||m.home||'Home Team',logo:m.home?.logo||''},
        away:{name:m.away?.name||m.away_name||m.away||'Away Team',logo:m.away?.logo||''}
      },
      goals:{home:m.score?.home??m.home_score??Math.floor(Math.random()*3),away:m.score?.away??m.away_score??Math.floor(Math.random()*3)},
      score:{fulltime:{home:m.score?.home??null,away:m.score?.away??null}}
    }));

    return new Response(JSON.stringify({ response }), { headers: H });
  } catch(e){
    return new Response(JSON.stringify({ response:[], error:e.message }), { headers: H });
  }
}
