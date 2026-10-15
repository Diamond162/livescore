export async function onRequest(context) {
  const headers = { "Content-type": "application/json", "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" };
  const safe = (o) => new Response(JSON.stringify(o), { headers });

  try {
    const url = new URL(context.request.url);
    const todayReal = new Date().toISOString().slice(0,10);
    const dateStr = url.searchParams.get('date') || todayReal;
    const KEY = context.env.LIVE_FOOTBALL_API_KEY;

    if (!KEY) return safe({ response: [] });

    const apiUrl = `https://live-football-api.com/api/v1/matches?api_key=${KEY}&date=${dateStr}&lang=en`;
    const r = await fetch(apiUrl);
    const text = await r.text();

    // CRITICAL: If API returns HTML, return empty JSON - NEVER crash
    if (text.trim().startsWith('<')) {
      return safe({ response: [] });
    }

    let data;
    try { data = JSON.parse(text); } catch { return safe({ response: [] }); }

    let matches = data.matches || [];

    let out = matches.map(m => {
      let berlinTime = null;

      // AUTOMATIC TIME - check everything
      if (m.timestamp) {
        let d = new Date(m.timestamp > 10000000000? m.timestamp : m.timestamp * 1000);
        berlinTime = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
      } else if (m.time) {
        berlinTime = m.time.toString().substring(0,5);
      } else if (m.date && m.date.includes('T')) {
        let d = new Date(m.date);
        if (!isNaN(d)) berlinTime = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
      }

      if (!berlinTime) berlinTime = "-";

      let s = (m.status || "").toLowerCase();
      let short = "NS";
      if (s.includes("live")) short = "LIVE";
      else if (s.includes("ft") || s.includes("fin") || s.includes("end")) short = "FT";

      return {
        id: m.id || Math.random(),
        berlinTime: berlinTime,
        fixture: { date: m.date || dateStr, berlinTime: berlinTime, status: { short: short } },
        teams: { home: { name: m.home?.name || "Home" }, away: { name: m.away?.name || "Away" } },
        goals: { home: m.score?.home?? 0, away: m.score?.away?? 0 },
        league: { name: m.league?.name || "League" }
      };
    });

    out.sort((a,b) => a.berlinTime.localeCompare(b.berlinTime));
    return safe({ response: out });

  } catch (e) {
    return safe({ response: [] });
  }
}
