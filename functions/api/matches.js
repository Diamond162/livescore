export async function onRequest(context) {
  const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
  const send = (obj) => new Response(JSON.stringify(obj), { headers });

  try {
    const url = new URL(context.request.url);
    const date = url.searchParams.get("date") || new Date().toISOString().slice(0,10);
    const KEY = context.env.FOOTBALL_API_KEY;

    if (!KEY) {
      return send({ response: [], error: "FOOTBALL_API_KEY not set in Cloudflare" });
    }

    const apiUrl = `https://v3.football.api-sports.io/fixtures?date=${date}`;

    const res = await fetch(apiUrl, {
      headers: { "x-apisports-key": KEY }
    });

    const data = await res.json();

    if (data.errors && Object.keys(data.errors).length > 0) {
      return send({ response: [], error: data.errors });
    }

    let list = data.response || [];

    const out = list.map(f => {
      let berlinTime = "15:00";
      if (f.fixture?.date) {
        berlinTime = new Date(f.fixture.date).toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit", timeZone:"Europe/Berlin" });
      }
      return {
        berlinTime: berlinTime,
        fixture: { date: date, berlinTime: berlinTime, status: { short: f.fixture?.status?.short || "NS" } },
        teams: { home: { name: f.teams?.home?.name || "Home" }, away: { name: f.teams?.away?.name || "Away" } },
        goals: { home: f.goals?.home ?? 0, away: f.goals?.away ?? 0 },
        league: { name: f.league?.name || "League" }
      };
    });

    out.sort((a,b) => a.berlinTime.localeCompare(b.berlinTime));
    return send({ response: out });

  } catch (e) {
    return send({ response: [], error: e.message });
  }
}
