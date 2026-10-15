export async function onRequest(context) {
  const headers = { 
    "Content-type": "application/json", 
    "Access-Control-Allow-Origin": "*", 
    "Cache-Control": "no-store" 
  };
  const safe = (o) => new Response(JSON.stringify(o), { headers });

  try {
    const url = new URL(context.request.url);
    const todayReal = new Date().toISOString().slice(0,10);
    const dateStr = url.searchParams.get('date') || todayReal;
    const KEY = context.env.LIVE_FOOTBALL_API_KEY;

    if (!KEY) {
      return safe({ response: [], message: "KEY MISSING - Add LIVE_FOOTBALL_API_KEY in Cloudflare" });
    }

    const apiUrl = `https://live-football-api.com/api/v1/matches?api_key=${KEY}&date=${dateStr}&lang=en`;

    const r = await fetch(apiUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    const text = await r.text();

    if (text.trim().startsWith('<') || text.trim().startsWith('<!DOCTYPE')) {
      return safe({ response: [], message: "API returned HTML - key invalid or credits finished" });
    }

    let data;
    try { data = JSON.parse(text); } catch { return safe({ response: [], message: "Invalid JSON from API" }); }

    const matches = data.matches || data.data?.matches || [];

    const out = matches.map(m => {
      let berlinTime = "";
      let rawDate = "";

      // AUTOMATIC TIME - real time from API -> Europe/Berlin
      if (m.timestamp) {
        const d = new Date(m.timestamp * 1000);
        berlinTime = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
        rawDate = d.toISOString();
      } else if (m.time) {
        berlinTime = m.time.toString().substring(0,5);
        rawDate = `${m.date || dateStr}T${berlinTime}:00`;
      } else if (m.date && m.date.includes('T')) {
        const d = new Date(m.date);
        if (!isNaN(d)) {
          berlinTime = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
          rawDate = m.date;
        }
      } else {
        berlinTime = "TBD";
        rawDate = dateStr;
      }

      let s = (m.status || "").toString().toLowerCase();
      let short = "NS";
      if (s.includes("live") || s.includes("1h") || s.includes("2h") || s.includes("progress")) short = "LIVE";
      else if (s.includes("ht")) short = "HT";
      else if (s.includes("ft") || s.includes("fin") || s.includes("full") || s.includes("ended") || s.includes("aet")) short = "FT";

      return {
        id: m.id || Math.random(),
        berlinTime: berlinTime,
        fixture: { date: rawDate, berlinTime: berlinTime, status: { short: short } },
        teams: { home: { name: m.home?.name || m.home_team || "Home" }, away: { name: m.away?.name || m.away_team || "Away" } },
        goals: { home: m.score?.home ?? m.home_score ?? m.homeScore ?? 0, away: m.score?.away ?? m.away_score ?? m.awayScore ?? 0 },
        league: { name: m.league?.name || m.competition || m.league_name || "Other Leagues" }
      };
    });

    // Sort by time automatically like FlashScore
    out.sort((a,b) => (a.berlinTime || "").localeCompare(b.berlinTime || ""));

    return safe({ response: out });

  } catch (e) {
    return safe({ response: [], message: "Server error: " + e.message });
  }
}
