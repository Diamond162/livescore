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

    if (!KEY) {
      return new Response(JSON.stringify({ response: [], message: "No API key set in Cloudflare env" }), { headers });
    }

    // CORRECT OFFICIAL ENDPOINT - only your API
    const apiUrl = `https://live-football-api.com/api/v1/matches?api_key=${KEY}&date=${dateStr}&lang=en`;

    let r = await fetch(apiUrl, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    let text = await r.text();

    // If still returns HTML, key invalid or no credits
    if (text.trim().startsWith('<') || text.trim().startsWith('<!DOCTYPE')) {
      return new Response(JSON.stringify({
        response: [],
        message: "Your API returned HTML - key invalid or 500 credits finished. Check live-football-api.com dashboard",
        debug: text.slice(0, 300)
      }), { headers });
    }

    let data = JSON.parse(text);

    // API returns { status: "success", matches: [...] }
    let matches = data.matches || data.data?.matches || [];

    if (!matches || matches.length === 0) {
      return new Response(JSON.stringify({ response: [], message: `No matches for ${dateStr} from your API` }), { headers });
    }

    // Convert to your frontend format with berlinTime
    let out = matches.map(m => {
      // m.date or m.time
      let rawDate = m.date || m.kickoff || dateStr + "T" + (m.time || "15:00") + ":00";
      let d = new Date(rawDate);
      let berlinTime = isNaN(d) ? (m.time || "15:00") : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });

      let homeName = m.home?.name || m.home_team || "Home";
      let awayName = m.away?.name || m.away_team || "Away";
      let homeScore = m.score?.home ?? m.home_score ?? 0;
      let awayScore = m.score?.away ?? m.away_score ?? 0;
      let status = m.status || "NS";
      let short = "NS";
      if (typeof status === 'string') {
        if (status.toLowerCase().includes('live') || status.toLowerCase().includes('progress')) short = "LIVE";
        else if (status.toLowerCase().includes('ft') || status.toLowerCase().includes('final')) short = "FT";
        else if (status.toLowerCase().includes('ht')) short = "HT";
        else short = status.toUpperCase().slice(0,4);
      }

      return {
        id: m.id,
        berlinTime: berlinTime,
        fixture: { date: rawDate, berlinTime: berlinTime, status: { short: short } },
        teams: { home: { name: homeName }, away: { name: awayName } },
        goals: { home: homeScore, away: awayScore },
        league: { name: m.league?.name || m.competition || "" },
        status: short
      };
    });

    return new Response(JSON.stringify({ response: out }), { headers });

  } catch (e) {
    return new Response(JSON.stringify({ response: [], message: "Error: " + e.message }), { headers });
  }
}
