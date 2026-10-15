export async function onRequest(context) {
  const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
  const send = (obj) => new Response(JSON.stringify(obj), { headers });
  try {
    const reqUrl = new URL(context.request.url);
    const dateStr = reqUrl.searchParams.get("date") || "2026-10-15";
    const KEY = context.env.LIVE_FOOTBALL_API_KEY;
    if (!KEY) return send({ response: [], error: "KEY MISSING IN CLOUDFLARE" });

    // CORRECT DOMAIN from your screenshot
    const apiUrl = `https://www.live-football-api.com/api/v1/matches?api_key=${KEY}&date=${dateStr}&lang=en`;

    const res = await fetch(apiUrl);
    const txt = await res.text();
    let data;
    try { data = JSON.parse(txt); } catch { return send({ response: [], status: res.status, raw: txt.slice(0,2000) }); }

    if (!res.ok) return send({ response: [], status: res.status, data });

    // This API returns { data: [...] } or { matches: [...] }
    const list = data.data || data.matches || [];
    
    const out = list.map(m => {
      let t = m.time || "15:00";
      if (t.length > 5) t = t.substring(0,5);
      return {
        berlinTime: t,
        fixture: { date: dateStr, berlinTime: t, status: m.status || { short: "NS" } },
        teams: { 
          home: { name: m.home?.name || m.homeTeam || "Home" }, 
          away: { name: m.away?.name || m.awayTeam || "Away" } 
        },
        goals: { home: m.home?.goals ?? 0, away: m.away?.goals ?? 0 },
        league: { name: m.league?.name || m.competition || "League" }
      };
    });

    out.sort((a,b) => a.berlinTime.localeCompare(b.berlinTime));
    return send({ response: out });

  } catch (e) {
    return send({ response: [], error: e.message });
  }
}
