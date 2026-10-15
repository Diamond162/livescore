export async function onRequest(context) {
  const url = new URL(context.request.url);
  const date = url.searchParams.get('date') || '2026-10-15';
  const KEY = context.env.LIVE_FOOTBALL_API_KEY;

  const headers = {
    "Content-type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };

  if (!KEY) {
    return new Response(JSON.stringify({ response: [], message: "NO API KEY SET IN CLOUDFLARE" }), { headers });
  }

  try {
    // Try today's date
    let endpoint = `https://live-football-api.com/api/matches?api_key=${KEY}&date=${date}&lang=en`;
    let res = await fetch(endpoint);
    let json = await res.json();
    let matches = json.matches || json.data || json.response || [];

    // If empty, try without date (get all)
    if (!matches || matches.length === 0) {
      let endpoint2 = `https://live-football-api.com/api/matches?api_key=${KEY}&lang=en`;
      let res2 = await fetch(endpoint2);
      let json2 = await res2.json();
      matches = json2.matches || json2.data || json2.response || [];
    }

    let out = matches.map(item => ({
      id: item.id,
      fixture: {
        date: item.date || date,
        status: { short: item.status || "Live" }
      },
      teams: {
        home: { name: item.home_team || item.home?.name || "Home" },
        away: { name: item.away_team || item.away?.name || "Away" }
      },
      goals: {
        home: item.home_score ?? 0,
        away: item.away_score ?? 0
      },
      league: { name: item.league?.name || "" },
      status: item.status || "Live",
      time: item.time || item.minute || "",
      home: item.home_team || item.home?.name || "Home",
      away: item.away_team || item.away?.name || "Away",
      score: `${item.home_score ?? 0}-${item.away_score ?? 0}`
    }));

    // RETURN BOTH formats so frontend no go confuse again
    return new Response(JSON.stringify({
      response: out,      // for index.html
      matches: out,       // backup
      count: out.length,
      date: date,
      message: out.length === 0 ? `No matches for ${date} - checking other dates...` : "OK",
      debug: `Checked date ${date}, found ${out.length}`
    }), { headers });

  } catch (e) {
    return new Response(JSON.stringify({ response: [], matches: [], error: e.message, message: "Error: " + e.message }), { headers });
  }
}
