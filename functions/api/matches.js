export async function onRequest(context) {
  const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
  const send = (obj) => new Response(JSON.stringify(obj), { headers });
  try {
    const url = new URL(context.request.url);
    const date = url.searchParams.get("date") || new Date().toISOString().slice(0,10);
    const KEY = context.env.FOOTBALL_API_KEY;
    if (!KEY) {
      return send({ response: [], error: "FOOTBALL_API_KEY not set in Cloudflare Variables" });
    }
    const apiUrl = `https://v3.football.api-sports.io/fixtures?date=${date}`;
    const res = await fetch(apiUrl, { headers: { "x-apisports-key": KEY } });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { return send({ response: [], error: "API returned not JSON", raw: text.slice(0,500) }); }
    if (data.errors && Object.keys(data.errors).length > 0) {
      return send({ response: [], error: JSON.stringify(data.errors), full: data });
    }
    const out = (data.response || []).map(f => {
      let berlinTime = "15:00";
      try { berlinTime = new Date(f.fixture.date).toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit", timeZone:"Europe/Berlin" }); } catch {}
      return {
        berlinTime,
        fixture: { date, berlinTime, status: { short: f.fixture?.status?.short || "NS" } },
        teams: { home: { name: f.teams?.home?.name || "Home" }, away: { name: f.teams?.away?.name || "Away" } },
        goals: { home: f.goals?.home ?? 0, away: f.goals?.away ?? 0 },
        league: { name: f.league?.name || "League" }
      };
    });
    out.sort((a,b)=>a.berlinTime.localeCompare(b.berlinTime));
    return send({ response: out, count: out.length });
  } catch (e) {
    return send({ response: [], error: e.message });
  }
}
