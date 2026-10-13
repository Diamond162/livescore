export async function onRequest(context) {
  const url = new URL(context.request.url);
  const date = url.searchParams.get("date") || new Date().toISOString().split("T")[0];
  const KEY = context.env.FOOTBALL_API_KEY;

  try {
    const res = await fetch(`https://live-football-api.com/api/v1/matches?api_key=${KEY}&date=${date}&lang=en`);
    const data = await res.json();
    const raw = data.matches || data.data?.matches || data.data || data.result || [];

    const fixed = raw.map(m => {
      // ---------- 1. TIME ----------
      let kickoffTime = m.kickoff || "12:00";
      let kickoffISO = `${date}T${kickoffTime}:00Z`;
      if (m.date && m.date.includes("T")) kickoffISO = m.date;
      let timestamp = Math.floor(new Date(kickoffISO).getTime() / 1000);

      // ---------- 2. MINUTE (for LIVE) ----------
      let st = m.status || {};
      let display = st.display || st.status || m.status || "";
      if (typeof display === "object") display = display.display || display.status || "";

      let minute =
        m.minute??
        m.elapsed??
        m.live_minute??
        m.current_minute??
        m.time_info?.minute??
        m.live?.minute??
        st.minute??
        st.elapsed??
        st.display_minute??
        null;

      // ---------- 3. STATUS ----------
      let isLive = st.is_live || m.is_live || false;
      let s = String(display).toUpperCase();
      let short = "NS";

      if (s === "FT" || s.includes("FINISH") || s === "FINISHED") short = "FT";
      else if (s.includes("HT") || s === "HALFTIME") short = "HT";
      else if (isLive || minute!= null || s.includes("1H") || s.includes("2H") || s === "LIVE" || s.includes("IN PLAY")) short = "LIVE";
      else if (s.includes("NS") || s.includes("NOT START") || s.includes("SCHEDULED") || kickoffTime!== "00:00") short = "NS";

      // ---------- 4. SCORE (FIX from your screenshot: home.score / away.score) ----------
      let homeG = null, awayG = null;

      // Your actual API structure: home: { score: "2" }
      if (m.home?.score!= null && m.home.score!== "") homeG = parseInt(m.home.score);
      if (m.away?.score!= null && m.away.score!== "") awayG = parseInt(m.away.score);

      // Fallbacks for other structures
      if (homeG == null) homeG = m.homeScore?? m.home_score?? m.score?.home?? m.scores?.home?? m.goals?.home?? null;
      if (awayG == null) awayG = m.awayScore?? m.away_score?? m.score?.away?? m.scores?.away?? m.goals?.away?? null;

      if (homeG!= null) homeG = parseInt(homeG);
      if (awayG!= null) awayG = parseInt(awayG);
      if (isNaN(homeG)) homeG = null;
      if (isNaN(awayG)) awayG = null;

      // ---------- 5. LEAGUE ----------
      // Your API: { id, name: "Primera B", country: "Chile", league: {id}, home, away }
      let leagueName = "Other";
      if (m.league?.name) leagueName = m.league.name;
      else if (m.country && m.home && m.name) leagueName = m.name; // name is league name in your API
      else if (m.competition?.name) leagueName = m.competition.name;
      else if (m.name &&!m.home) leagueName = m.name;

      let country = m.country || m.league?.country || "";

      return {
        fixture: {
          id: m.id || Math.random(),
          date: kickoffISO,
          timestamp: timestamp,
          status: {
            short: short, // NS, LIVE, HT, FT
            long: String(display || st.status || short),
            elapsed: minute // 34, 67, 90+2 etc -> for LIVE tab
          }
        },
        league: {
          name: leagueName,
          country: country
        },
        teams: {
          home: { name: m.home?.name || m.home_team || "Home" },
          away: { name: m.away?.name || m.away_team || "Away" }
        },
        goals: {
          home: homeG, // now 2, not null
          away: awayG // now 2, not null
        }
      };
    });

    return new Response(JSON.stringify({ response: fixed }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache"
      }
    });

  } catch (e) {
    return new Response(JSON.stringify({ response: [], error: e.message }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}
