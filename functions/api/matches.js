export async function onRequest(context) {
  const url = new URL(context.request.url);
  let date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
  const KEY = (context.env.LIVE_FOOTBALL_API_KEY || '').trim();

  if (!KEY) {
    return new Response(JSON.stringify({response:[], error:"No LIVE_FOOTBALL_API_KEY"}), {headers:{"content-type":"application/json"}});
  }

  const toBerlin = (iso) => {
    try { return new Date(iso).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'}); }
    catch { return '--:--'; }
  };

  // Your phone is on 2026-10-15 (future), use today for real data
  let apiDate = date;
  if (new Date(date) > new Date(Date.now() + 86400000*2)) {
    apiDate = new Date().toISOString().split('T')[0];
  }

  try {
    // CORRECT per docs:?api_key=KEY&date=YYYY-MM-DD
    let endpoint = `https://live-football-api.com/api/v1/matches?api_key=${KEY}&date=${apiDate}&lang=en`;

    let res = await fetch(endpoint);
    let json = await res.json();

    // Response format: { status: "success", matches: [...] }
    let matches = json.matches || json.data?.matches || json.data || [];

    if (!matches || matches.length === 0) {
      // Try without date to get live matches
      let endpoint2 = `https://live-football-api.com/api/v1/matches?api_key=${KEY}&lang=en`;
      let res2 = await fetch(endpoint2);
      let json2 = await res2.json();
      matches = json2.matches || [];
    }

    if (matches.length === 0) {
      return new Response(JSON.stringify({
        response: [],
        results: 0,
        api_response: json,
        endpoint: endpoint,
        credits: json.credits_used || json.credits_left || "check dashboard"
      }), {headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}});
    }

    let out = matches.map(item => {
      let id = item.id;
      let home = item.home?.name || item.home_team?.name || "Home";
      let away = item.away?.name || item.away_team?.name || "Away";
      let league = item.league?.name || item.competition?.name || "League";
      let country = item.league?.country || item.country || "World";
      let kickoff = item.kickoff || item.date || item.time || new Date().toISOString();
      let status = item.status || "NS";
      let scoreHome = item.score?.home?? 0;
      let scoreAway = item.score?.away?? 0;
      let display = "-:-";
      if (status === "Live" || status === "Finished" || status === "FT") {
        display = `${scoreHome}-${scoreAway}`;
      } else if (item.score && typeof item.score === 'string') {
        display = item.score;
      }

      return {
        fixture: { id, berlinTime: toBerlin(kickoff), status: { short: String(status) } },
        league: { name: league, country, fullName: `${country} - ${league}` },
        teams: { home: { name: home }, away: { name: away } },
        goals: { display }
      };
    });

    return new Response(JSON.stringify({response: out, results: out.length, source: "live-football-api", apiDate}), {
      headers: {"content-type":"application/json","Access-Control-Allow-Origin":"*"}
    });

  } catch (e) {
    return new Response(JSON.stringify({response:[], error: e.message}), {headers:{"content-type":"application/json"}});
  }
}
