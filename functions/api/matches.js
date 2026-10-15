export async function onRequest(context) {
  const headers = {
    "Content-type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };

  const send = (obj) => {
    return new Response(JSON.stringify(obj), { headers });
  };

  try {
    const reqUrl = new URL(context.request.url);
    const dateStr = reqUrl.searchParams.get("date") || "2026-10-15";
    const KEY = context.env.LIVE_FOOTBALL_API_KEY;

    if (!KEY) {
      return send({ response: [] });
    }

    const apiUrl = "https://live-football-api.com/api/v1/matches?api_key=" + KEY + "&date=" + dateStr + "&lang=en";

    const res = await fetch(apiUrl);
    const txt = await res.text();

    if (txt.trim().startsWith("<")) {
      return send({ response: [], note: "blocked html" });
    }

    const data = JSON.parse(txt);
    const list = data.matches || data.data || [];

    const out = [];
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      let t = "15:00";
      if (m.time) t = m.time.substring(0, 5);
      if (m.timestamp) {
        const d = new Date(m.timestamp * 1000);
        t = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
      }
      out.push({
        berlinTime: t,
        fixture: { date: dateStr, berlinTime: t, status: { short: "NS" } },
        teams: { home: { name: (m.home && m.home.name)? m.home.name : "Home" }, away: { name: (m.away && m.away.name)? m.away.name : "Away" } },
        goals: { home: 0, away: 0 },
        league: { name: (m.league && m.league.name)? m.league.name : "League" }
      });
    }

    out.sort(function(a, b) { return a.berlinTime.localeCompare(b.berlinTime); });

    return send({ response: out });

  } catch (e) {
    return send({ response: [] });
  }
}
