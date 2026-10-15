export async function onRequest(context) {
  const headers = {
    "Content-type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store"
  };

  // Always return JSON, even on error
  const safeReturn = (obj) => new Response(JSON.stringify(obj), { headers });

  try {
    const url = new URL(context.request.url);
    const dateStr = url.searchParams.get('date') || '2026-10-15';
    const KEY = context.env.LIVE_FOOTBALL_API_KEY;

    if (!KEY) {
      return safeReturn({ response: [], message: "KEY MISSING - Set LIVE_FOOTBALL_API_KEY in Cloudflare" });
    }

    const apiUrl = `https://live-football-api.com/api/v1/matches?api_key=${KEY}&date=${dateStr}&lang=en`;

    const r = await fetch(apiUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    const text = await r.text();

    // If API returns HTML (key invalid / no credits) - DON'T CRASH, return JSON
    if (text.trim().startsWith('<') || text.trim().startsWith('<!')) {
      return safeReturn({ 
        response: [], 
        message: "Your API key returned HTML - check dashboard for credits",
        debug: text.substring(0,200)
      });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return safeReturn({ response: [], message: "API did not return JSON", debug: text.substring(0,200) });
    }

    let matches = data.matches || data.data?.matches || [];

    // FIX TIME - use timestamp -> Europe/Berlin to get 18:45 / 21:00 correctly
    let out = matches.map(m => {
      let berlinTime = "18:45";
      let rawDate = m.date || dateStr;

      if (m.timestamp) {
        let d = new Date(m.timestamp * 1000);
        berlinTime = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
      } else if (m.time) {
        berlinTime = m.time; // API already gives Europe time
      } else if (m.date && m.date.includes('T')) {
        let d = new Date(m.date);
        if (!isNaN(d)) berlinTime = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
      }

      let status = (m.status || "NS").toString();
      let short = "NS";
      if (status.toLowerCase().includes("live")) short = "LIVE";
      else if (status.toLowerCase().includes("fin") || status.toLowerCase().includes("ft")) short = "FT";
      else if (status.toLowerCase().includes("ht")) short = "HT";

      return {
        id: m.id || Math.random(),
        berlinTime: berlinTime,
        fixture: { date: rawDate, berlinTime: berlinTime, status: { short: short } },
        teams: { home: { name: m.home?.name || "Home" }, away: { name: m.away?.name || "Away" } },
        goals: { home: m.score?.home ?? 0, away: m.score?.away ?? 0 },
        league: { name: m.league?.name || "League" }
      };
    });

    return safeReturn({ response: out });

  } catch (e) {
    return safeReturn({ response: [], message: "Server error: " + e.message });
  }
}
