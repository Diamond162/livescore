export async function onRequest(context) {
  const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
  const send = (obj) => new Response(JSON.stringify(obj), { headers });
  try {
    const reqUrl = new URL(context.request.url);
    const dateStr = reqUrl.searchParams.get("date") || "2026-10-15";
    const KEY = context.env.LIVE_FOOTBALL_API_KEY;
    if (!KEY) return send({ response: [], error: "KEY MISSING" });

    // LIVE FOOTBALL API - direct method with api_key
    const apiUrl = `https://live-football-api1.p.rapidapi.com/api/v1/matches?date=${dateStr}&api_key=${KEY}`;
    
    const res = await fetch(apiUrl);
    const text = await res.text();
    
    let data;
    try { data = JSON.parse(text); } catch { return send({ response: [], status: res.status, raw: text.slice(0,2000) }); }
    
    if (!res.ok) return send({ response: [], status: res.status, error: data });

    const list = data.data || data.matches || data.response || [];
    const out = list.map(m => {
      let t = "15:00";
      if (m.time) t = m.time.substring(0,5);
      if (m.timestamp) t = new Date(m.timestamp*1000).toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit", timeZone:"Europe/Berlin" });
      return {
        berlinTime: t,
        fixture: { date: dateStr, berlinTime: t, status: { short: "NS" } },
        teams: { home: { name: m.home?.name || m.homeTeam?.name || "Home" }, away: { name: m.away?.name || m.awayTeam?.name || "Away" } },
        goals: { home: 0, away: 0 },
        league: { name: m.league?.name || "League" }
      };
    });
    
    out.sort((a,b) => a.berlinTime.localeCompare(b.berlinTime));
    return send({ response: out });
    
  } catch (e) {
    return send({ response: [], error: e.message });
  }
}
