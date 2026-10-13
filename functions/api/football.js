export async function onRequest(context) {
  const url = new URL(context.request.url);
  const date = url.searchParams.get("date") || new Date().toISOString().split("T")[0];
  const KEY = context.env.FOOTBALL_API_KEY;

  try {
    const r = await fetch(`https://live-football-api.com/api/v1/matches?api_key=${KEY}&date=${date}&lang=en`);
    const d = await r.json();
    const raw = d.matches || d.data?.matches || d.data || d.result || [];

    const fixed = raw.map(m => {
      // --- 1. TIME: API is UTC -> keep as Z for Europe/Berlin conversion ---
      let timeStr = m.kickoff || m.time || m.start_time || m.date || m.startTime || "";
      let kickoffISO = "";
      let timestamp = 0;

      if (typeof timeStr === "string" && timeStr.length <= 5 && timeStr.includes(":")) {
        kickoffISO = `${date}T${timeStr}:00Z`;
        timestamp = Math.floor(new Date(kickoffISO).getTime() / 1000);
      } else if (typeof timeStr === "string" && timeStr.includes("T")) {
        kickoffISO = timeStr;
        timestamp = Math.floor(new Date(timeStr).getTime() / 1000);
      } else if (typeof timeStr === "number") {
        timestamp = timeStr > 10000000000? Math.floor(timeStr/1000) : timeStr;
        kickoffISO = new Date(timestamp * 1000).toISOString();
      } else if (m.date) {
        kickoffISO = m.date;
        timestamp = Math.floor(new Date(m.date).getTime() / 1000);
      }
      if (!timestamp || isNaN(timestamp)) {
        kickoffISO = `${date}T12:00:00Z`;
        timestamp = Math.floor(new Date(kickoffISO).getTime() / 1000);
      }

      // --- 2. STATUS: Robust ---
      let st = m.status || m.state || m.match_status || "NS";
      if (typeof st === "object") st = st.name || st.type || st.short || st.status || "NS";
      let s = String(st).toUpperCase();
      let short = "NS";
      if (s.includes("LIVE") || s.includes("1H") || s.includes("2H") || s.includes("HT") || s.includes("INPLAY") || s === "IN_PLAY") short = "LIVE";
      else if (s.includes("FT") || s.includes("FINISH") || s.includes("ENDED") || s.includes("FULL") || s === "FINISHED" || s === "FT") short = "FT";

      // --- 3. SCORE: Check EVERY possible field name ---
      let homeG = null, awayG = null;
      // direct numbers
      if (m.homeScore!= null) homeG = m.homeScore;
      else if (m.home_score!= null) homeG = m.home_score;
      else if (m.homeGoals!= null) homeG = m.homeGoals;
      else if (m.goals?.home!= null) homeG = m.goals.home;
      else if (m.score?.home!= null) homeG = m.score.home;
      else if (m.scores?.home!= null) homeG = m.scores.home;
      else if (m.result?.home!= null) homeG = m.result.home;

      if (m.awayScore!= null) awayG = m.awayScore;
      else if (m.away_score!= null) awayG = m.away_score;
      else if (m.awayGoals!= null) awayG = m.awayGoals;
      else if (m.goals?.away!= null) awayG = m.goals.away;
      else if (m.score?.away!= null) awayG = m.score.away;
      else if (m.scores?.away!= null) awayG = m.scores.away;
      else if (m.result?.away!= null) awayG = m.result.away;

      // parse string like "2-1" or "2:1"
      if ((homeG == null) && typeof m.score === "string" && m.score.includes("-")) {
        const parts = m.score.split("-");
        homeG = parseInt(parts[0]); awayG = parseInt(parts[1]);
      }
      if ((homeG == null) && typeof m.result === "string" && m.result.includes("-")) {
        const parts = m.result.split("-");
        homeG = parseInt(parts[0]); awayG = parseInt(parts[1]);
      }

      // --- Force FT to have score if API gives FT but no score, mark as FT still ---
      if (short === "FT" && (homeG == null || isNaN(homeG))) {
        // keep as null, frontend will show 0-0 fallback? better keep null to debug
      }

      return {
        fixture: { id: m.id || m.match_id || Math.random(), date: kickoffISO, timestamp: timestamp, status: { short: short, long: String(st) } },
        league: { name: m.league?.name || m.competition?.name || m.league_name || m.competition || "Other", country: m.league?.country || m.country || "" },
        teams: { home: { name: m.home_team || m.home?.name || m.homeTeam?.name || m.teams?.home || m.home || "Home" }, away: { name: m.away_team || m.away?.name || m.awayTeam?.name || m.teams?.away || m.away || "Away" } },
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
