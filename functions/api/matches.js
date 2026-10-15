export async function onRequest(context) {
  const url = new URL(context.request.url);
  let date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
  const KEY = (context.env.LIVE_FOOTBALL_API_KEY || '').trim();

  if (!KEY) {
    return new Response(JSON.stringify({response:[], error:"No LIVE_FOOTBALL_API_KEY"}), {headers:{"content-type":"application/json"}});
  }

  const toBerlin = (iso) => {
    try { return new Date(iso).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'}); }
    catch { return '--:--'; }
  };

  let apiDate = date;
  if (new Date(date) > new Date(Date.now() + 86400000*2)) {
    apiDate = new Date().toISOString().split('T')[0];
  }

  // CORRECT ENDPOINTS from official docs
  const endpoints = [
    `https://live-football-api.com/api/v1/matches?date=${apiDate}&language=en`,
    `https://live-football-api.com/api/v1/matches?date=${apiDate}`,
    `https://api.live-football-api.com/api/v1/matches?date=${apiDate}&language=en`,
    `https://api.live-football-api.com/api/v1/matches?date=${apiDate}`
  ];

  let debugLogs = [];
  let matches = [];

  for (let endpoint of endpoints) {
    try {
      let res = await fetch(endpoint, {
        headers: {
          'x-api-key': KEY,
          'X-API-KEY': KEY,
          'Authorization': `Bearer ${KEY}`,
          'apikey': KEY
        }
      });
      let text = await res.text();
      let json;
      try { json = JSON.parse(text); } catch {
        debugLogs.push({endpoint, status: res.status, raw: text.slice(0,200)});
        continue;
      }

      debugLogs.push({endpoint, status: res.status, keys: Object.keys(json).slice(0,5), sample: JSON.stringify(json).slice(0,300)});

      // Try all possible locations
      let m = json.data?.matches || json.data || json.matches || json.response || json.result || [];
      if (Array.isArray(m) && m.length > 0) {
        matches = m;
        break;
      }
      // Sometimes it's {data: {data: [...]}}?
      if (m && typeof m === 'object' &&!Array.isArray(m) && m.matches) {
        matches = m.matches;
        break;
      }
    } catch (e) {
      debugLogs.push({endpoint, error: e.message});
    }
  }

  if (matches.length === 0) {
    return new Response(JSON.stringify({
      response: [],
      results: 0,
      message: `No matches for ${apiDate}`,
      debug: debugLogs,
      hint: "Check your API Playground on live-football-api.com - copy the CURL example"
    }), {headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}});
  }

  let out = matches.map(item => {
    let id = item.id || item.match_id || item.fixture_id || Math.random().toString(36).substr(2);
    let home = item.home_team?.name || item.home?.name || item.teams?.home?.name || item.homeTeam?.name || "Home";
    let away = item.away_team?.name || item.away?.name || item.teams?.away?.name || item.awayTeam?.name || "Away";
    let leagueName = item.league?.name || item.competition?.name || item.league_name || "League";
    let country = item.league?.country || item.country?.name || item.league_country || "World";
    let kickoff = item.kickoff || item.date || item.start_time || item.time || item.match_date || new Date().toISOString();
    let status = item.status || item.state || item.match_status || "NS";
    let scoreHome = item.scores?.home?? item.score?.home?? item.home_score?? item.goals?.home?? 0;
    let scoreAway = item.scores?.away?? item.score?.away?? item.away_score?? item.goals?.away?? 0;

    let display = "-:-";
    if (typeof item.score === 'string' && item.score.includes('-')) display = item.score;
    else if (status === 'FT' || status === 'LIVE' || status === 'INPLAY' || status === 'HT' || status === 'FINISHED') {
      display = `${scoreHome}-${scoreAway}`;
    }

    return {
      fixture: { id, berlinTime: toBerlin(kickoff), status: { short: status } },
      league: { name: leagueName, country, fullName: `${country} - ${leagueName}` },
      teams: { home: { name: home }, away: { name: away } },
      goals: { display }
    };
  });

  out.sort((a,b) => a.fixture.berlinTime.localeCompare(b.fixture.berlinTime));

  return new Response(JSON.stringify({response: out, results: out.length, source: "live-football-api v1", apiDate, debug: debugLogs[0]}), {
    headers: {"content-type":"application/json","Access-Control-Allow-Origin":"*"}
  });
}
