export async function onRequest(context) {
  const url = new URL(context.request.url);
  let date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
  const KEY = (context.env.LIVE_FOOTBALL_API_KEY || '').trim();

  if (!KEY) {
    return new Response(JSON.stringify({response:[], error:"No LIVE_FOOTBALL_API_KEY set"}), {headers:{"content-type":"application/json"}});
  }

  const toBerlin = (iso) => {
    try { return new Date(iso).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'}); }
    catch { return '--:--'; }
  };

  // If user phone is on future date like 2026-10-15, use TODAY for real data
  let apiDate = date;
  if (new Date(date) > new Date(Date.now() + 86400000*2)) {
    apiDate = new Date().toISOString().split('T')[0];
  }

  try {
    // Official endpoint from live-football-api-js docs
    const endpointsToTry = [
      `https://api.live-football-api.com/matches?date=${apiDate}&language=en`,
      `https://api.live-football-api.com/matches?date=${apiDate}`,
      `https://api.live-football-api.com/live`
    ];

    let matches = [];
    for (let endpoint of endpointsToTry) {
      let res = await fetch(endpoint, {
        headers: { 'x-api-key': KEY }
      });
      let text = await res.text();
      let json;
      try { json = JSON.parse(text); } catch(e) { continue; }

      // Extract matches - can be in data.matches or data or matches
      let m = json.data?.matches || json.data || json.matches || json.response || [];
      if (Array.isArray(m) && m.length > 0) {
        matches = m;
        break;
      }
    }

    // If still empty, try live-matches endpoint
    if (matches.length === 0) {
      try {
        let res = await fetch(`https://api.live-football-api.com/live-matches`, {
          headers: { 'x-api-key': KEY }
        });
        let json = JSON.parse(await res.text());
        matches = json.data?.matches || json.data || json.matches || [];
      } catch {}
    }

    if (matches.length === 0) {
      return new Response(JSON.stringify({response:[], results:0, message:`No matches found for ${apiDate}. Your API returns empty for that date.`}), {
        headers: {"content-type":"application/json","Access-Control-Allow-Origin":"*"}
      });
    }

    let out = matches.map(item => {
      let id = item.id || item.match_id || Math.random().toString(36).substr(2);
      let home = item.home_team?.name || item.home?.name || item.teams?.home?.name || "Home";
      let away = item.away_team?.name || item.away?.name || item.teams?.away?.name || "Away";
      let leagueName = item.league?.name || item.competition?.name || "League";
      let country = item.league?.country || item.country?.name || "World";
      let kickoff = item.kickoff || item.date || item.start_time || item.time || new Date().toISOString();
      let status = item.status || item.state || "NS";
      let scoreHome = item.scores?.home?? item.score?.home?? item.home_score?? 0;
      let scoreAway = item.scores?.away?? item.score?.away?? item.away_score?? 0;
      let display = "-:-";
      if (item.score && typeof item.score === 'string') display = item.score;
      else if (status === 'FT' || status === 'LIVE' || status === 'INPLAY' || status === 'HT') display = `${scoreHome}-${scoreAway}`;

      return {
        fixture: { id: id, berlinTime: toBerlin(kickoff), status: { short: status } },
        league: { name: leagueName, country: country, fullName: `${country} - ${leagueName}` },
        teams: { home: { name: home }, away: { name: away } },
        goals: { display: display, home: scoreHome, away: scoreAway }
      };
    });

    out.sort((a,b) => a.fixture.berlinTime.localeCompare(b.fixture.berlinTime));

    return new Response(JSON.stringify({response: out, results: out.length, source: "live-football-api", apiDate: apiDate, requestedDate: date}), {
      headers: {"content-type":"application/json","Access-Control-Allow-Origin":"*"}
    });

  } catch (e) {
    return new Response(JSON.stringify({response:[], error: e.message}), {
      headers: {"content-type":"application/json"}
    });
  }
}
