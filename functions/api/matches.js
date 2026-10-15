export async function onRequest(context) {
  const headers = {
    "Content-type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store"
  };

  try {
    const url = new URL(context.request.url);
    const dateStr = url.searchParams.get('date') || '2026-10-15';
    const KEY = context.env.LIVE_FOOTBALL_API_KEY;

    const apiUrl = `https://live-football-api.com/api/v1/matches?api_key=${KEY}&date=${dateStr}&lang=en`;

    let r = await fetch(apiUrl);
    let text = await r.text();
    if (text.trim().startsWith('<')) {
      return new Response(JSON.stringify({ response: [], message: "API key invalid or credits finished" }), { headers });
    }
    let data = JSON.parse(text);
    let matches = data.matches || [];

    let out = matches.map(m => {
      // YOUR API gives: m.time = "18:45" , m.date = "2026-10-15" and m.timestamp (UTC)
      // Use timestamp if available - it's the REAL time
      let timeStr = "15:00";
      let berlinTime = "15:00";
      let rawDateISO = "";

      if (m.timestamp) {
        // timestamp is UTC seconds - convert to Europe/Berlin
        let d = new Date(m.timestamp * 1000);
        berlinTime = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
        rawDateISO = d.toISOString();
      } else if (m.date && m.time) {
        // date + time already in Europe time per API
        timeStr = m.time;
        berlinTime = m.time; // DON'T convert again
        rawDateISO = `${m.date}T${m.time}:00`;
      } else if (m.time) {
        berlinTime = m.time;
        rawDateISO = `${dateStr}T${m.time}:00`;
      } else if (m.date) {
        // date may contain time like "2026-10-15T18:45:00"
        let d = new Date(m.date);
        if (!isNaN(d)) {
          berlinTime = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
          rawDateISO = m.date;
        }
      }

      let short = "NS";
      let s = (m.status || "").toString().toLowerCase();
      if (s.includes("live")) short = "LIVE";
      else if (s.includes("ft") || s.includes("finished") || s.includes("final")) short = "FT";
      else if (s.includes("ht")) short = "HT";

      return {
        id: m.id,
        berlinTime: berlinTime,
        fixture: { date: rawDateISO, berlinTime: berlinTime, status: { short: short } },
        teams: { home: { name: m.home?.name || m.home_team || "Home" }, away: { name: m.away?.name || m.away_team || "Away" } },
        goals: { home: m.score?.home ?? m.home_score ?? 0, away: m.score?.away ?? m.away_score ?? 0 },
        league: { name: m.league?.name || m.competition || "Other" },
        country: m.country || m.league?.country || ""
      };
    });

    return new Response(JSON.stringify({ response: out }), { headers });
  } catch (e) {
    return new Response(JSON.stringify({ response: [], message: e.message }), { headers });
  }
}
