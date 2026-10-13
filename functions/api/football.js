export async function onRequest(context) {
  const url = new URL(context.request.url);
  const dateParam = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
  const API_KEY = context.env.FOOTBALL_API_KEY || context.env.LIVE_FOOTBALL_API_KEY || context.env.API_KEY || "";
  if (!API_KEY) {
    return new Response(JSON.stringify({ response: [], error: "No API_KEY" }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }
  try {
    const apiUrl = `https://live-football-api.com/api/v1/matches?api_key=${API_KEY}&date=${dateParam}&lang=en`;
    const res = await fetch(apiUrl);
    const json = await res.json();
    if (json.message && json.status!== 'success') {
      return new Response(JSON.stringify({ response: [], error: json.message, raw: json }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }
    const rawMatches = json.matches || json.data?.matches || [];
    let matches = rawMatches.map(m => {
      const statusStr = String(m.status || m.state || '').toLowerCase();
      const isLive = statusStr.includes('live') || m.live === true;
      const isFT = statusStr.includes('finish') || statusStr.includes('ft') || m.status === 3;
      return {
        league: { name: m.league?.name || m.competition?.name || 'Football', country: m.league?.country_code || 'INT', flag: m.league?.country_code || 'INT' },
        teams: {
          home: { name: m.home?.name || m.home_team?.name || 'Home' },
          away: { name: m.away?.name || m.away_team?.name || 'Away' }
        },
        fixture: {
          date: m.kickoff || m.date || new Date().toISOString(),
          status: { short: isLive? 'LIVE' : (isFT? 'FT' : 'NS'), elapsed: m.minute? m.minute + "'" : (m.status || '') }
        },
        goals: { home: m.score?.home?? m.home?.score?? null, away: m.score?.away?? m.away?.score?? null }
      }
    });
    return new Response(JSON.stringify({ response: matches }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=30' } });
  } catch (e) {
    return new Response(JSON.stringify({ response: [], error: e.message + " " + e.stack }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }
}
