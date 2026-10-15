export async function onRequest(context) {
  const url = new URL(context.request.url);
  const date = url.searchParams.get('date') || '2026-10-15';
  const KEY = context.env.LIVE_FOOTBALL_API_KEY;

  const headers = { "Content-type": "application/json", "Access-Control-Allow-Origin": "*" };

  // Fallback matches for TODAY so site never empty
  const fallback = [
    { id: 1, home_team: "Arsenal", away_team: "Man City", home_score: 1, away_score: 1, status: "LIVE", league: { name: "Premier League" } },
    { id: 2, home_team: "Real Madrid", away_team: "Barcelona", home_score: 2, away_score: 0, status: "FT", league: { name: "La Liga" } },
    { id: 3, home_team: "Bayern Munich", away_team: "Dortmund", home_score: 0, away_score: 0, status: "NS", league: { name: "Bundesliga" } }
  ];

  if (!KEY) {
    return new Response(JSON.stringify({ response: fallback, message: "No API key - showing demo for " + date }), { headers });
  }

  try {
    // Try official endpoint
    const ep = `https://api.live-football-api.com/v1/matches?api_key=${KEY}&date=${date}&lang=en`;
    let res = await fetch(ep);
    let text = await res.text();
    if (text.trim().startsWith('<')) {
      // API returned HTML - key invalid / credits finished - return fallback
      return new Response(JSON.stringify({ 
        response: fallback, 
        message: `API returned HTML (key invalid or no credits for ${date}) - showing demo`,
        debug: text.slice(0,200)
      }), { headers });
    }
    let json = JSON.parse(text);
    let matches = json.data?.matches || json.matches || json.data || [];

    if (!matches || matches.length === 0) {
      return new Response(JSON.stringify({ response: fallback, message: `No live data for ${date} from provider - showing demo` }), { headers });
    }

    let out = matches.map(m => ({
      id: m.id,
      fixture: { date: m.date, status: { short: m.status } },
      teams: { home: { name: m.home_team || m.home?.name }, away: { name: m.away_team || m.away?.name } },
      goals: { home: m.home_score ?? 0, away: m.away_score ?? 0 },
      league: { name: m.league?.name || "" }
    }));

    return new Response(JSON.stringify({ response: out, count: out.length, date: date, message: "OK" }), { headers });

  } catch (e) {
    return new Response(JSON.stringify({ response: fallback, message: "Error " + e.message + " - showing demo for " + date }), { headers });
  }
}
