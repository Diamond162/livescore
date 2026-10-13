export async function onRequest(context) {
  const url = new URL(context.request.url);
  const date = url.searchParams.get("date") || new Date().toISOString().split("T")[0];
  const needLive = url.searchParams.get("live") === "1";
  const KEY = context.env.FOOTBALL_API_KEY;

  try {
    const r = await fetch(`https://live-football-api.com/api/v1/matches?api_key=${KEY}&date=${date}&lang=en`);
    const d = await r.json();
    const raw = d.matches || d.data?.matches || d.data || d.result || [];

    // MAP to collect country properly
    let mapped = raw.map(m => {
      let kickoff = m.kickoff || "12:00";
      let iso = m.date?.includes("T")? m.date : `${date}T${kickoff}:00Z`;
      let ts = Math.floor(new Date(iso).getTime()/1000);

      let st = m.status || {};
      let disp = (st.display || st.status || m.status || "").toString();
      let up = disp.toUpperCase();

      let short = "NS";
      if (up.includes("FT") || up.includes("FINISH")) short = "FT";
      else if (up.includes("HT")) short = "HT";
      else if (up.includes("1H") || up.includes("2H") || up === "LIVE" || st.is_live || m.is_live) short = "LIVE";

      // FIX COUNTRY NAME - api gives it in 3 places
      let leagueName = m.league?.name || m.name || m.competition?.name || "Other";
      let country = m.country || m.league?.country || m.competition?.country || m.league_country || "";
      // Clean leagueName if it contains country
      if (country && leagueName.toLowerCase().startsWith(country.toLowerCase())) {
        // keep as is, will show "Italy: Serie C"
      }

      return {
        id: m.id,
        fixture: { id: m.id, date: iso, timestamp: ts, status: { short, long: disp, elapsed: null } },
        league: { name: leagueName, country: country || "", full: country? `${country}: ${leagueName}` : leagueName },
        teams: { home: { name: m.home?.name || m.home_team || "Home" }, away: { name: m.away?.name || m.away_team || "Away" } },
        goals: { home: m.home?.score!=null?parseInt(m.home.score):null, away: m.away?.score!=null?parseInt(m.away.score):null },
        _isLive: short==="LIVE" || short==="HT"
      };
    });

    // IF LIVE TAB - fetch minutes for live games (max 12 to save credits)
    if (needLive) {
      const lives = mapped.filter(x=>x._isLive).slice(0,12);
      const details = await Promise.all(lives.map(async x=>{
        try{
          const dr = await fetch(`https://live-football-api.com/api/v1/live_match_details?api_key=${KEY}&match_id=${x.id}&lang=en`);
          const dj = await dr.json();
          const info = dj.match || dj.data || dj.data?.match || dj;
          // minute can be in many places
          let min = info?.minute?? info?.elapsed?? info?.time_info?.minute?? info?.status?.minute?? info?.live?.minute?? null;
          if (min) return { id: x.id, minute: String(min) };
          // try parse from status display like "34'"
          let disp = info?.status?.display || "";
          let mMatch = disp.match(/(\d+)'/);
          if (mMatch) return { id: x.id, minute: mMatch[1] };
        }catch{}
        return null;
      }));
      details.forEach(d=>{
        if(d){
          let it = mapped.find(m=>m.id===d.id);
          if(it) it.fixture.status.elapsed = d.minute;
        }
      });
    }

    // final shape for frontend
    const finalResponse = mapped.map(({_isLive,...rest})=>rest);

    return new Response(JSON.stringify({response: finalResponse}), {
      headers: { "Content-Type":"application/json","Access-Control-Allow-Origin":"*","Cache-Control":"no-cache" }
    });

  } catch(e){
    return new Response(JSON.stringify({response:[],error:e.message}), {headers: {"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}});
  }
}
