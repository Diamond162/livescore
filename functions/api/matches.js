export async function onRequest(context) {
  const url = new URL(context.request.url);
  // FIX: Today is 15 Oct 2026, not 14th
  const date = url.searchParams.get('date') || '2026-10-15';
  const KEY = context.env.LIVE_FOOTBALL_API_KEY;

  if (!KEY) {
    return new Response(JSON.stringify({ error: "NO API KEY SET IN CLOUDFLARE" }), {
      headers: { "Content-type": "application/json" }
    });
  }

  try {
    // 1. Try with today's date
    let endpoint = `https://live-football-api.com/api/matches?api_key=${KEY}&date=${date}&lang=en`;
    let res = await fetch(endpoint);
    let json = await res.json();
    let matches = json.matches || json.data || [];

    // 2. If empty, try WITHOUT date (get all live)
    if (!matches || matches.length === 0) {
      let endpoint2 = `https://live-football-api.com/api/matches?api_key=${KEY}&lang=en&status=live`;
      let res2 = await fetch(endpoint2);
      let json2 = await res2.json();
      matches = json2.matches || json2.data || [];
    }

    // 3. If still empty, try yesterday and tomorrow too
    if (!matches || matches.length === 0) {
      let endpoint3 = `https://live-football-api.com/api/matches?api_key=${KEY}&lang=en`;
      let res3 = await fetch(endpoint3);
      let json3 = await res3.json();
      matches = json3.matches || json3.data || [];
    }

    let out = matches.map(item => ({
      id: item.id,
      home: item.home_team || item.home?.name || "Home",
      away: item.away_team || item.away?.name || "Away",
      score: `${item.home_score ?? 0}-${item.away_score ?? 0}`,
      status: item.status || "Live",
      time: item.time || item.minute || "",
      league: item.league?.name || ""
    }));

    return new Response(JSON.stringify({ 
      matches: out, 
      count: out.length, 
      date: date,
      message: out.length === 0 ? "No matches found for today" : "OK"
    }), {
      headers: { "Content-type": "application/json", "Access-Control-Allow-Origin": "*" }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { "Content-type": "application/json" }
    });
  }
}
