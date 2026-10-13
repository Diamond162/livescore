export async function onRequest(context) {
  const url = new URL(context.request.url);
  const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
  const KEY = context.env.FOOTBALL_API_KEY;

  try {
    const apiRes = await fetch(`https://live-football-api.com/api/v1/matches?api_key=${KEY}&date=${date}&lang=en`);
    const data = await apiRes.json();
    const raw = data.matches || data.data?.matches || data.data || data.result || [];

    const fixed = raw.map(m => {
      let kickoff = m.kickoff || m.date || m.time || `${date}T15:00:00Z`;
      if (typeof kickoff === 'number') kickoff = new Date(kickoff * 1000).toISOString();
      if (typeof m.time === 'string' && m.time.length <= 5 && m.time.includes(':')) {
        kickoff = `${date}T${m.time}:00+00:00`;
      }

      // FIX: status can be object
      let statusRaw = m.status;
      if (typeof statusRaw === 'object') statusRaw = statusRaw.name || statusRaw.type || '';
      let s = String(statusRaw || '').toUpperCase();

      let short = "NS";
      if (s.includes("LIVE") || s.includes("INPLAY") || s === "1H" || s === "2H" || s.includes("HALF")) short = "LIVE";
      else if (s.includes("FT") || s.includes("FINISH") || s.includes("ENDED") || s.includes("FT")) short = "FT";

      return {
        fixture: { id: m.id, date: kickoff, status: { short, long: String(statusRaw) } },
        league: { name: m.league?.name || m.competition?.name || "League", country: m.league?.country || "" },
        teams: { home: { name: m.home?.name || m.home_name || "Home" }, away: { name: m.away?.name || m.away_name || "Away" } },
        goals: { home: m.score?.home?? m.home_score?? null, away: m.score?.away?? m.away_score?? null }
      };
    });

    return new Response(JSON.stringify({ response: fixed }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Cache-Control": "no-cache" }
    });

  } catch (e) {
    return new Response(JSON.stringify({ response: [], error: e.message + " + e.stack }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}
