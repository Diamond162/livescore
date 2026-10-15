export async function onRequest(context) {
  const url = new URL(context.request.url);
  let date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
  const KEY = (context.env.LIVE_FOOTBALL_API_KEY || '').trim();

  if (!KEY) {
    return new Response(JSON.stringify({response:[], error:"No LIVE_FOOTBALL_API_KEY set"}), {headers:{"content-type":"application/json"}});
  }

  const toBerlin = (iso) => {
    try { return new Date(iso).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'}); }
    catch { return '--:--'; }
  };

  // Your phone says 2026-10-15 (future), so use today for real data
  let apiDate = date;
  if (new Date(date) > new Date(Date.now() + 86400000*2)) {
    apiDate = new Date().toISOString().split('T')[0];
  }

  // Try official endpoints - this is what the JS client uses internally
  const endpoints = [
    `https://live-football-api.com/api/matches?date=${apiDate}&language=en`,
    `https://live-football-api.com/api/matches?date=${apiDate}`,
    `https://api.live-football-api.com/matches?date=${apiDate}&language=en`,
    `https://api.live-football-api.com/matches?date=${apiDate}`
  ];

  let matches = [];
  let lastError = "";

  for (let endpoint of endpoints) {
    try {
      let res = await fetch(endpoint, { headers: { 'x-api-key': KEY } });
      let text = await res.text();
      let json;
      try { json = JSON.parse(text); } catch { lastError = text.slice(0,200); continue; }

      let data = json.data?.matches || json.data || json.matches || [];
      if (Array.isArray(data) && data.length > 0) {
        matches = data;
        break;
      }
      lastError = JSON.stringify(json).slice(0,300);
    } catch (e) {
      lastError = e.message;
    }
  }

  // If no matches, try live endpoint
  if (matches.length === 0) {
    try {
      let res = await fetch(`https://live-football-api.com/api/matches?date=${apiDate}`, { headers: { 'x-api-key': KEY } });
      let json = JSON.parse(await res.text());
      matches = json.data?.matches || json.data || [];
    } catch {}
  }

  if (matches.length === 0) {
    return new Response(JSON.stringify({
      response: [],
      results: 0,
      error: `No matches for ${apiDate}`,
      lastError: lastError,
      hint: "Go to live-football-api.com/dashboard and check remaining credits. Also copy the CURL from API Docs"
    }), { headers: {"content-type":"application/json","Access-Control-Allow-Origin":"*"} });
  }

  let out = matches.map(item => {
    let id = item.id || item.match_id || String(Math.random()).slice(2);
    let home = item.home_team?.name || item.homeTeam?.name || item.teams?.home?.name || "Home";
    let away = item.away_team?.name || item.awayTeam?.name || item.teams?.away?.name || "Away";
    let league = item.league?.name || item.competition?.name || "League";
    let country = item.league?.country || item.country || "World";
    let kickoff = item.kickoff || item.date || item.start_time || item.time || new Date().toISOString();
    let status = item.status || item.state || "NS";
    // status can be object!
    if (typeof status === 'object') status = status.short || status.name || "NS";
    let sH = item.scores?.home?? item.home_score?? 0;
    let sA = item.scores?.away?? item.away_score?? 0;
    let display = item.score || `${sH}-${sA}`;
    if (String(status).toUpperCase() === 'NS' || display === '0-0') display = item.score || '-:-';

    return {
      fixture: { id, berlinTime: toBerlin(kickoff), status: { short: String(status) } },
      league: { name: league, country, fullName: `${country} - ${league}` },
      teams: { home: { name: home }, away: { name: away } },
      goals: { display }
    };
  });

  return new Response(JSON.stringify({response: out, results: out.length, source: "live-football-api"}), {
    headers: {"content-type":"application/json","Access-Control-Allow-Origin":"*"}
  });
}
