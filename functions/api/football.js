export async function onRequest(context) {
  const url = new URL(context.request.url);
  const date = url.searchParams.get("date") || new Date().toISOString().split("T")[0];
  const needLive = url.searchParams.get("live") === "1";
  const KEY = context.env.FOOTBALL_API_KEY;
  const nowSec = Math.floor(Date.now()/1000);

  try {
    const r = await fetch(`https://live-football-api.com/api/v1/matches?api_key=${KEY}&date=${date}&lang=en`);
    const d = await r.json();
    const raw = d.matches || d.data?.matches || d.data || d.result || [];

    let mapped = raw.map(m => {
      let kickoff = m.kickoff || "12:00";
      let iso = m.date?.includes("T")? m.date : `${date}T${kickoff}:00Z`;
      let ts = Math.floor(new Date(iso).getTime()/1000);

      let st = m.status || {};
      let disp = (st.display || st.status || "").toString();
      let up = disp.toUpperCase();

      let short = "NS";
      if (up.includes("FT") || up.includes("FINISH")) short = "FT";
      else if (up.includes("HT")) short = "HT";
      else if (up.includes("1H") || up.includes("2H") || up==="LIVE" || st.is_live || m.is_live) short = "LIVE";

      // ESTIMATE MINUTE if LIVE and no minute from API
      let elapsed = m.minute?? m.elapsed?? st.minute?? null;
      if (!elapsed && short==="LIVE") {
        let diffMin = Math.floor((nowSec - ts)/60);
        // First half 0-45, if >50 assume second half started after HT
        if (diffMin > 0 && diffMin < 120) {
          if (diffMin > 60) elapsed = diffMin - 15; // remove HT 15min
          else elapsed = diffMin;
          if (elapsed > 90) elapsed = 90;
          if (elapsed < 1) elapsed = 1;
        }
      }
      if (short==="HT") elapsed = null; // keep HT label

      let leagueName = m.league?.name || m.name || "Other";
      let country = m.country || m.league?.country || "";

      return {
        fixture: { id: m.id, date: iso, timestamp: ts, status: { short, long: disp, elapsed } },
        league: { name: leagueName, country, full: country? `${country}: ${leagueName}`: leagueName },
        teams: { home: { name: m.home?.name || "Home" }, away: { name: m.away?.name || "Away" } },
        goals: { home: m.home?.score!=null?parseInt(m.home.score):null, away: m.away?.score!=null?parseInt(m.away.score):null },
        _isLive: short==="LIVE"
      };
    });

    // Try get real minute from details for accuracy (overwrite estimate)
    if (needLive) {
      const lives = mapped.filter(x=>x._isLive).slice(0,10);
      await Promise.all(lives.map(async x=>{
        try{
          const dr = await fetch(`https://live-football-api.com/api/v1/live_match_details?api_key=${KEY}&match_id=${x.id}&lang=en`);
          const dj = await dr.json();
          const info = dj.match || dj.data || dj;
          let min = info?.minute?? info?.elapsed?? info?.time_info?.minute?? info?.status?.minute?? null;
          if(min){ x.fixture.status.elapsed = String(min); return; }
          let d2 = info?.status?.display || "";
          let mm = d2.match(/(\d+)'/);
          if(mm) x.fixture.status.elapsed = mm[1];
        }catch{}
      }));
    }

    const final = mapped.map(({_isLive,...r})=>r);
    return new Response(JSON.stringify({response: final}), {
      headers: {"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Cache-Control":"no-cache"}
    });
  } catch(e){
    return new Response(JSON.stringify({response:[],error:e.message}), {headers: {"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}});
  }
}
