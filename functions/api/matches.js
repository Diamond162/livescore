export async function onRequest(context) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };
  const send = (obj) => new Response(JSON.stringify(obj), { headers });

  try {
    const url = new URL(context.request.url);
    const date = url.searchParams.get("date") || new Date().toISOString().slice(0,10);
    const KEY = context.env.LIVE_FOOTBALL_API_KEY;

    if (!KEY) return send({ response: [], error: "LIVE_FOOTBALL_API_KEY missing in Cloudflare" });

    // CORRECT DOMAIN FROM YOUR PLAYGROUND
    const apiUrl = `https://www.live-football-api.com/api/v1/matches?api_key=${KEY}&date=${date}&lang=en`;

    const res = await fetch(apiUrl);
    const rawText = await res.text();
    
    let apiData;
    try {
      apiData = JSON.parse(rawText);
    } catch {
      return send({ response: [], status: res.status, raw: rawText.slice(0,1000) });
    }

    if (!res.ok) {
      return send({ response: [], status: res.status, apiError: apiData });
    }

    // Handle different response shapes
    const list = apiData.data || apiData.matches || apiData.response || [];

    const out = list.map(m => {
      // time handling
      let time = m.time || m.kickoff_time || "15:00";
      if (time.length > 5) time = time.substring(0,5);
      
      // teams
      const homeName = m.home?.name || m.home_team || m.teams?.home?.name || "Home";
      const awayName = m.away?.name || m.away_team || m.teams?.away?.name || "Away";
      
      // league
      const leagueName = m.league?.name || m.competition?.name || m.league || "League";

      return {
        berlinTime: time,
        fixture: {
          date: date,
          berlinTime: time,
          status: { short: m.status?.short || m.status || "NS" }
        },
        teams: {
          home: { name: homeName },
          away: { name: awayName }
        },
        goals: {
          home: m.home?.goals ?? m.home_score ?? 0,
          away: m.away?.goals ?? m.away_score ?? 0
        },
        league: { name: leagueName }
      };
    });

    out.sort((a,b) => a.berlinTime.localeCompare(b.berlinTime));
    return send({ response: out });

  } catch (e) {
    return send({ response: [], error: e.message });
  }
}
