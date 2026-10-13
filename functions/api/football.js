export async function onRequest(context) {
  const url = new URL(context.request.url);
  const date = url.searchParams.get("date") || new Date().toISOString().split("T")[0];
  const debug = url.searchParams.has("debug");
  const KEY = context.env.FOOTBALL_API_KEY;
  const r = await fetch(`https://live-football-api.com/api/v1/matches?api_key=${KEY}&date=${date}&lang=en`);
  const d = await r.json();
  const raw = d.matches || d.data?.matches || d.data || d.result || [];

  // DEBUG: show first match raw structure
  if (debug) {
    return new Response(JSON.stringify({ first_match_raw: raw[0] || null, total: raw.length }, null, 2), {
      headers: { "Content-Type": "application/json" }
    });
  }

  const fixed = raw.map(m => {
    let timeStr = m.kickoff || m.time || m.start_time || m.date || m.startTime || "";
    let kickoffISO = `${date}T${timeStr}:00Z`;
    if (typeof timeStr === "string" && timeStr.includes("T")) kickoffISO = timeStr;
    let timestamp = Math.floor(new Date(kickoffISO).getTime() / 1000);

    let st = m.status || m.state || "NS";
    if (typeof st === "object") st = st.name || st.type || st.short || "NS";
    let s = String(st).toUpperCase();
    let short = s.includes("FT") || s.includes("FINISH") || s.includes("ENDED")? "FT" : s.includes("LIVE")? "LIVE" : "NS";

    // try all score fields
    let homeG = m.homeScore?? m.home_score?? m.score?.home?? m.scores?.home?? m.goals?.home?? null;
    let awayG = m.awayScore?? m.away_score?? m.score?.away?? m.scores?.away?? m.goals?.away?? null;
    if (homeG == null && m.result) {
      const str = typeof m.result === "string"? m.result : `${m.result.home||""}-${m.result.away||""}`;
      if (str.includes("-")) { const p=str.split("-"); homeG=parseInt(p[0]); awayG=parseInt(p[1]); }
    }

    return {
      fixture: { id: m.id || Math.random(), date: kickoffISO, timestamp, status: { short, long: String(st) } },
      league: { name: m.league?.name || m.competition?.name || "Other", country: "" },
      teams: { home: { name: m.home_team || m.home?.name || m.homeTeam?.name || "Home" }, away: { name: m.away_team || m.away?.name || m.awayTeam?.name || "Away" } },
      goals: { home: homeG, away: awayG }
    };
  });
  return new Response(JSON.stringify({ response: fixed }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Cache-Control": "no-cache" } });
}
