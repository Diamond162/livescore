export async function onRequest(context) {
  const url = new URL(context.request.url);
  const date = url.searchParams.get("date") || new Date().toISOString().split("T")[0];
  const KEY = context.env.FOOTBALL_API_KEY;

  try {
    const r = await fetch(`https://live-football-api.com/api/v1/matches?api_key=${KEY}&date=${date}&lang=en`);
    const d = await r.json();
    const raw = d.matches || d.data?.matches || d.data || d.result || [];

    const fixed = raw.map(m => {
      // --- TIME: API gives "00:00" for finished, but we keep it. For today it will give real time ---
      let timeStr = m.kickoff || m.time || "";
      // If kickoff is "00:00", try use m.date or keep as 00:00
      let kickoffISO = `${date}T${timeStr || "00:00"}:00Z`;
      if (typeof m.kickoff_time === "string" && m.kickoff_time.includes("T")) kickoffISO = m.kickoff_time;
      let timestamp = Math.floor(new Date(kickoffISO).getTime() / 1000);
      // If date field has full ISO, use it
      if (m.date && m.date.includes("T")) {
        kickoffISO = m.date;
        timestamp = Math.floor(new Date(m.date).getTime() / 1000);
      }

      // --- STATUS: from status.display like "FT" ---
      let stObj = m.status || {};
      let display = stObj.display || stObj.status || m.status || "NS";
      let s = String(display).toUpperCase();
      let short = "NS";
      if (s === "FT" || s.includes("FINISH") || s === "FINISHED") short = "FT";
      else if (s.includes("LIVE") || s.includes("1H") || s.includes("2H") || s === "IN_PLAY" || stObj.is_live) short = "LIVE";
      else if (s.includes("HT")) short = "HT";

      // --- SCORE: THIS IS THE FIX!!! ---
      let homeG = m.home?.score?? m.away?.score?? null; // placeholder
      let awayG = null;
      // Correct mapping from your screenshot
      homeG = m.home?.score!= null? parseInt(m.home.score) : null;
      awayG = m.away?.score!= null? parseInt(m.away.score) : null;

      // Also check halftime/fallbacks
      if (homeG == null && m.halftime) homeG = m.halftime.home;
      if (awayG == null && m.halftime) awayG = m.halftime.away;

      // --- LEAGUE: name is top-level "Primera B", country Chile ---
      let leagueName = m.league?.name || m.name || m.competition?.name || "Other";
      // In your raw, name is outside league object, so check m.name
      if (m.name &&!m.home &&!m.league?.name) leagueName = m.name;
      // Actually your structure is weird: league {id}, name, country are siblings of league
      // Let's check: if m has "name" and "country" at top level and also has home/away, then it's league name
      if (m.country && m.home) leagueName = m.name;

      let country = m.country || m.league?.country || "";

      return {
        fixture: {
          id: m.id || Math.random(),
          date: kickoffISO,
          timestamp: timestamp,
          status: { short: short, long: String(display) }
        },
        league: { name: leagueName, country: country },
        teams: {
          home: { name: m.home?.name || "Home" },
          away: { name: m.away?.name || "Away" }
        },
        goals: { home: homeG, away: awayG }
      };
    });

    return new Response(JSON.stringify({ response: fixed }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Cache-Control": "no-cache" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ response: [], error: e.message }), {
      headers: { "Content-Type": "application/json" }
    });
  }
}
