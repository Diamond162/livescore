export async function onRequest(context) {
  const url = new URL(context.request.url);
  const date = url.searchParams.get('date') || '2026-10-15';
  const KEY = context.env.LIVE_FOOTBALL_API_KEY;

  const headers = {
    "Content-type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };

  if (!KEY) {
    return new Response(JSON.stringify({ response: [], message: "NO API KEY SET" }), { headers });
  }

  try {
    // Use correct domain - try api. subdomain
    let endpoints = [
      `https://live-football-api.com/api/matches?api_key=${KEY}&date=${date}`,
      `https://api.live-football-api.com/matches?api_key=${KEY}&date=${date}`,
      `https://live-football-api.com/api/matches?key=${KEY}&date=${date}&lang=en`
    ];

    let matches = [];
    let lastError = "";

    for (let ep of endpoints) {
      try {
        let res = await fetch(ep);
        let text = await res.text();
        // If it starts with < it's HTML - skip
        if (text.trim().startsWith('<')) {
          lastError = "API returned HTML: " + text.slice(0,100);
          continue;
        }
        let json = JSON.parse(text);
        matches = json.matches || json.data || json.response || [];
        if (matches.length > 0) break;
      } catch (e) {
        lastError = e.message;
      }
    }

    let out = matches.map(item => ({
      id: item.id || Math.random(),
      fixture: {
        date: item.date || date,
        status: { short: item.status || "NS" }
      },
      teams: {
        home: { name: item.home_team || item.home?.name || "Home" },
        away: { name: item.away_team || item.away?.name || "Away" }
      },
      goals: {
        home: item.home_score ?? item.score?.home ?? 0,
        away: item.away_score ?? item.score?.away ?? 0
      },
      league: { name: item.league?.name || "" }
    }));

    return new Response(JSON.stringify({
      response: out,
      count: out.length,
      date: date,
      message: out.length === 0 ? `No matches for ${date} - API says: ${lastError}` : "OK"
    }), { headers });

  } catch (e) {
    return new Response(JSON.stringify({ response: [], message: "Error: " + e.message }), { headers });
  }
}
