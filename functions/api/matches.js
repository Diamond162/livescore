export async function onRequest(context) {
  const url = new URL(context.request.url);
  let dParam = url.searchParams.get('date') || 'today';
  let target = new Date();
  if (dParam === 'yesterday') target.setDate(target.getDate() - 1);
  else if (dParam === 'tomorrow') target.setDate(target.getDate() + 1);
  else if (dParam!== 'today' && dParam.includes('-')) target = new Date(dParam);
  const dateStr = target.toISOString().split('T')[0];
  const API_KEY = context.env.FOOTBALL_API_KEY || context.env.LIVE_FOOTBALL_API_KEY;
  try {
    const apiUrl = `https://live-football-api.com/api/v1/matches?api_key=${API_KEY}&date=${dateStr}&lang=en`;
    const r = await fetch(apiUrl, { cf: { cacheEverything: true, cacheTtl: 30 } });
    const d = await r.json();
    const list = d.data?.matches || d.data || d.matches || d.result || [];
    let out = (Array.isArray(list)?list:[]).map(m => {
      let st = (m.status || m.phase || "").toString().toUpperCase();
      let short = "NS";
      if (st.includes("FINISH") || st === "FT") short = "FT";
      else if (st.includes("HT")) short = "HT";
      else if (st.includes("1H") || st.includes("2H") || m.is_live || st === "LIVE") short = "LIVE";
      return {
        fixture: { id: m.id, date: m.date? `${m.date}T${m.kickoff||"12:00"}:00Z`: new Date().toISOString(), timestamp: Date.now()/1000, status: { short, elapsed: short==="LIVE"?(m.minute?m.minute+"'":"LIVE"):null } },
        league: { name: m.league?.name || m.competition?.name || m.name || "Other", country: m.league?.country||"", flag:"" },
        teams: { home: { name: m.home?.full_name || m.home?.name || "Home", logo:"" }, away: { name: m.away?.full_name || m.away?.name || "Away", logo:"" } },
        goals: { home: m.home_score?? null, away: m.away_score?? null }
      };
    });
    return new Response(JSON.stringify({ response: out }), { headers: { "Content-Type":"application/json","Access-Control-Allow-Origin":"*" } });
  } catch(e){
    return new Response(JSON.stringify({ response:[], error:e.message }), { headers: { "Content-Type":"application/json","Access-Control-Allow-Origin":"*" } });
  }
}
