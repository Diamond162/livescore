export async function onRequest(context) {
  const apiKey = context.env.FOOTBALL_API_KEY;
  const reqUrl = new URL(context.request.url);
  const date = reqUrl.searchParams.get('date') || new Date().toISOString().split('T')[0];

  if (!apiKey) {
    return new Response(JSON.stringify({matches:[], error:"No FOOTBALL_API_KEY in Cloudflare", date, count:0}), {
      headers: {"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}
    });
  }

  // live-football-api.com uses?api_key=YOUR_KEY
  const apiUrl = `https://live-football-api.com/api/matches?api_key=${apiKey}&date=${date}&lang=en`;

  try {
    const r = await fetch(apiUrl);
    const text = await r.text();

    let data;
    try { data = JSON.parse(text); }
    catch(e){
      return new Response(JSON.stringify({matches:[], error:"API returned HTML not JSON", raw: text.slice(0,500), apiUrl, date, count:0}), {
        headers: {"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}
      });
    }

    // The API returns {data: {matches: []}} or {matches: []}
    const rawList = data?.data?.matches || data?.matches || data?.data || [];

    const matches = (Array.isArray(rawList)? rawList : []).map(m => ({
      id: m.id || m.match_id || `${m.home?.name}-${m.away?.name}-${date}`,
      league: m.league?.name || m.competition?.name || m.league || "Live",
      home: m.home?.name || m.home_team || m.teams?.home || "Home",
      away: m.away?.name || m.away_team || m.teams?.away || "Away",
      homeLogo: m.home?.logo || m.home?.badge || "",
      awayLogo: m.away?.logo || m.away?.badge || "",
      status: m.status || m.match_status || "NS",
      score: m.score? `${m.score.home?? 0}-${m.score.away?? 0}` : `${m.home_score?? 0}-${m.away_score?? 0}`,
      time: m.kickoff || m.time || m.date || date
    }));

    return new Response(JSON.stringify({matches, date, count: matches.length, debug: data.meta || "ok"}), {
      headers: {
        "Content-Type":"application/json",
        "Access-Control-Allow-Origin":"*",
        "Cache-Control":"public, max-age=300"
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({matches:[], error: err.message, date, count:0}), {
      headers: {"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}
    });
  }
}
