export async function onRequest(context) {
  const url = new URL(context.request.url);
  const date = url.searchParams.get("date") || new Date().toISOString().split("T")[0];
  const KEY = context.env.FOOTBALL_API_KEY;

  try {
    const r = await fetch(`https://live-football-api.com/api/v1/matches?api_key=${KEY}&date=${date}&lang=en`);
    const d = await r.json();
    const raw = d.matches || d.data?.matches || d.data || d.result || [];

    const fixed = raw.map(m => {
      // --- FIXED EUROPE TIME LOGIC ---
      let timeStr = m.kickoff || m.time || m.start_time || m.date || "";
      let kickoffISO = "";
      let timestamp = 0;

      // Case 1: API gives "14:30" only
      if (typeof timeStr === "string" && timeStr.length <= 5 && timeStr.includes(":")) {
        kickoffISO = `${date}T${timeStr}:00+02:00`; // Force Europe/Berlin time
        timestamp = Math.floor(new Date(kickoffISO).getTime() / 1000);
      } 
      // Case 2: API gives full date like "2026-05-13T14:30:00Z"
      else if (typeof timeStr === "string" && timeStr.includes("T")) {
        kickoffISO = timeStr;
        timestamp = Math.floor(new Date(timeStr).getTime() / 1000);
      }
      // Case 3: number (unix)
      else if (typeof timeStr === "number") {
        timestamp = timeStr > 10000000000 ? Math.floor(timeStr/1000) : timeStr;
        kickoffISO = new Date(timestamp * 1000).toISOString();
      }
      // Case 4: fallback to m.date field
      else if (m.date) {
        kickoffISO = m.date;
        timestamp = Math.floor(new Date(m.date).getTime() / 1000);
      }

      // Final safety so NEVER --:--
      if (!timestamp || isNaN(timestamp)) {
        kickoffISO = `${date}T12:00:00+02:00`;
        timestamp = Math.floor(new Date(kickoffISO).getTime() / 1000);
      }

      // Status fix
      let st = m.status;
      if (typeof st === "object" && st !== null) st = st.name || st.type || st.short || "NS";
      let s = String(st || "").toUpperCase();
      let short = "NS";
      if (s.includes("LIVE") || s.includes("1H") || s.includes("2H") || s.includes("HT") || s.includes("HALF")) short = "LIVE";
      else if (s.includes("FT") || s.includes("FINISH") || s.includes("ENDED") || s.includes("FINAL")) short = "FT";

      return {
        fixture: { id: m.id || Math.random(), date: kickoffISO, timestamp: timestamp, status: { short: short, long: String(st) } },
        league: { name: m.league?.name || m.competition?.name || m.league_name || "Other", country: m.competition?.country || m.country || "" },
        teams: { home: { name: m.home_team || m.home?.name || m.teams?.home || m.home || "Home" }, away: { name: m.away_team || m.away?.name || m.teams?.away || m.away || "Away" } },
        goals: { home: m.home_score ?? m.score?.home ?? m.goals?.home ?? null, away: m.away_score ?? m.score?.away ?? m.goals?.away ?? null }
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
