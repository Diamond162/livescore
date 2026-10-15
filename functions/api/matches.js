export async function onRequestGet(context) {
  try {
    // Check BOTH names - API_KEY and FOOTBALL_API_KEY
    const key = context.env.FOOTBALL_API_KEY || context.env.API_KEY || context.env.LIVE_FOOTBALL_API_KEY;

    if (!key) {
      return new Response(JSON.stringify({
        matches: [],
        error: "FOOTBALL_API_KEY not set. Go Cloudflare Pages > Settings > Environment Variables > Add FOOTBALL_API_KEY = your key"
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const urlObj = new URL(context.request.url);
    const date = urlObj.searchParams.get("date") || new Date().toISOString().split("T")[0];
    const lang = urlObj.searchParams.get("lang") || "en";

    const apiUrl = `https://live-football-api.com/api/v1/matches?api_key=${key}&date=${date}&lang=${lang}`;

    const r = await fetch(apiUrl, { headers: { "Accept": "application/json" } });
    const text = await r.text();

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      return new Response(JSON.stringify({
        matches: [],
        raw: text.slice(0,300),
        error: "API returned HTML not JSON - check your key"
      }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // Your API returns {data: [...]} or {matches: [...]} - normalize it
    let rawMatches = json.data || json.matches || json.result || [];
    if (!Array.isArray(rawMatches)) {
      if (rawMatches.matches) rawMatches = rawMatches.matches;
      else rawMatches = Object.values(rawMatches);
    }

    const matches = rawMatches.map(m => ({
      id: m.id || m.match_id,
      date: m.date || m.start_time || m.time || m.kickoff,
      status: m.status || m.match_status || 'NS',
      league: { name: m.league?.name || m.competition?.name || m.league_name || 'League' },
      home: {
        name: m.home_team?.name || m.home?.name || m.home_name || m.teams?.home || 'Home',
        score: m.home_score?? m.score?.home?? m.goals?.home?? 0
      },
      away: {
        name: m.away_team?.name || m.away?.name || m.away_name || m.teams?.away || 'Away',
        score: m.away_score?? m.score?.away?? m.goals?.away?? 0
      },
      score: {
        home: m.home_score?? m.score?.home?? 0,
        away: m.away_score?? m.score?.away?? 0
      }
    }));

    return new Response(JSON.stringify({ matches }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=30"
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ matches: [], error: err.message }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}
