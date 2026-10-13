export async function onRequest(context) {
  const url = new URL(context.request.url);
  const date = url.searchParams.get("date") || new Date().toISOString().split("T")[0];
  const needLive = url.searchParams.get("live") === "1";
  const KEY = context.env.FOOTBALL_API_KEY;
  const nowSec = Math.floor(Date.now() / 1000);
  function getPriority(name) {
    const n = (name||"").toLowerCase();
    if (n.includes("champions league")) return 1;
    if (n.includes("europa league")) return 2;
    if (n.includes("premier league")) return 3;
    if (n.includes("la liga") || n.includes("laliga")) return 4;
    if (n.includes("bundesliga")) return 5;
    if (n.includes("ligue 1")) return 6;
    if (n.includes("serie a")) return 7;
    if (n.includes("england")) return 10;
    if (n.includes("spain")) return 11;
    if (n.includes("germany")) return 12;
    if (n.includes("france")) return 13;
    if (n.includes("italy")) return 14;
    if (n.includes("europe")) return 20;
    return 50;
  }
  try {
    const r = await fetch(`https://live-football-api.com/api/v1/matches?api_key=${KEY}&date=${date}&lang=en`);
    const d = await r.json();
    const raw = d.matches || d.data?.matches || d.data || d.result || [];
    let mapped = raw.map(m => {
      let kickoff = m.kickoff || "12:00";
      let iso = m.date?.includes("T")? m.date : `${date}T${kickoff}:00Z`;
      let ts = Math.floor(new Date(iso).getTime() / 1000);
      let st = m.status || {};
      let disp = (st.display || st.status || "").toString();
      let up = disp.toUpperCase();
      let short = "NS";
      if (up.includes("FT") || up.includes("FINISH")) short = "FT";
      else if (up.includes("HT")) short = "HT";
      else if (up.includes("1H") || up.includes("2H") || up === "LIVE" || st.is_live || m.is_live) short = "LIVE";
      let elapsed = m.minute?? m.elapsed?? st.minute?? null;
      if (!elapsed && short === "LIVE") {
        let diffMin = Math.floor((nowSec - ts) / 60);
        if (diffMin > 0 && diffMin < 120) {
          if (diffMin > 60) elapsed = diffMin - 15; else elapsed = diffMin;
          if (elapsed > 90) elapsed = 90;
          if (elapsed < 1) elapsed = 1;
        }
      }
      if (short === "HT") elapsed = null;
      let baseName = m.league?.name || m.name || m.competition?.name || "Other";
      let stage = m.stage || m.round || m.phase || m.competition_stage || "";
      if (stage &&!baseName.toLowerCase().includes(stage.toLowerCase())) baseName = baseName + " - " + stage;
      let country = m.country || m.league?.country || m.competition?.country || "";
      let homeName = m.home?.full_name || m.home?.long_name || m.home?.complete_name || m.home?.name || m.home_team || "Home";
      let awayName = m.away?.full_name || m.away?.long_name || m.away?.complete_name || m.away?.name || m.away_team || "Away";
      return {
        fixture: { id: m.id, date: iso, timestamp: ts, status: { short, long: disp, elapsed } },
        league: { name: baseName, country, full: country? `${country}: ${baseName}` : baseName },
        teams: { home: { name: homeName }, away: { name: awayName } },
        goals: { home: m.home?.score!= null? parseInt(m.home.score) : null, away: m.away?.score!= null? parseInt(m.away.score) : null },
        _isLive: short === "LIVE",
        _priority: getPriority(country? `${country}: ${baseName}` : baseName)
      };
    });
    mapped.sort((a,b) => {
      if (a._priority!== b._priority) return a._priority - b._priority;
      if (a._isLive!== b._isLive) return b._isLive - a._isLive;
      return 0;
    });
    if (needLive) {
      const lives = mapped.filter(x => x._isLive).slice(0, 12);
      await Promise.all(lives.map(async x => {
        try {
          const dr = await fetch(`https://live-football-api.com/api/v1/live_match_details?api_key=${KEY}&match_id=${x.fixture.id}&lang=en`);
          const dj = await dr.json();
          const info = dj.match || dj.data || dj;
          let min = info?.minute?? info?.elapsed?? info?.time_info?.minute?? info?.status?.minute?? null;
          if (min) { x.fixture.status.elapsed = String(min); return; }
          let d2 = info?.status?.display || "";
          let mm = d2.match(/(\d+)'/);
          if (mm) x.fixture.status.elapsed = mm[1];
        } catch {}
      }));
    }
    const final = mapped.map(({ _isLive, _priority,...r }) => r);
    return new Response(JSON.stringify({ response: final }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Cache-Control": "no-cache" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ response: [], error: e.message }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}
