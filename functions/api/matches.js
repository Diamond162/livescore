export async function onRequest(context) {
  const headers = { "Content-type": "application/json", "Access-Control-Allow-Origin": "*" };
  const safe = (o) => new Response(JSON.stringify(o), { headers });

  try {
    const url = new URL(context.request.url);
    const dateStr = url.searchParams.get('date') || "2026-10-15";
    const KEY = context.env.LIVE_FOOTBALL_API_KEY;

    if (!KEY) {
      return safe({ response: [], error: "No API key" });
    }

    const apiUrl = `https://live-football-api.com/api/v1/matches?api_key=${KEY}&date=${dateStr}&lang=en`;
    const r = await fetch(apiUrl, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" }
    });

    const text = await r.text();

    // FIX YOUR HTML PROBLEM - This is the fix!
    if (text.trim().startsWith('<') || text.trim().startsWith('<!DOCTYPE')) {
      // Return empty JSON, NOT HTML - so your site won't crash
      return safe({ 
        response: [], 
        error: "API limit - blocked, HTML returned. Wait till midnight or reduce refresh rate.",
        raw_preview: text.slice(0,200)
      });
    }

    let data = JSON.parse(text);

    if (data.success === false) {
      return safe({ response: [], error: data.message || "API error", full: data });
    }

    let matches = data.matches || data.data || [];
    
    let out = matches.map(m => {
      let t = m.time ? m.time.substring(0,5) : "15:00";
      if (m.timestamp) {
        let d = new Date(m.timestamp * 1000);
        t = d.toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'});
      }
      return {
        berlinTime: t,
        fixture: { 
          date: m.date || dateStr, 
          berlinTime: t, 
          status: { short: m.status || "NS" } 
        },
        teams: { 
          home: { name: m.home?.name || m.home || "Home" }, 
          away: { name: m.away?.name || m.away || "Away" } 
        },
        goals: { 
          home: m.score?.home ?? m.homeScore
