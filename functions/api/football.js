export async function onRequest(context) {
  const url = new URL(context.request.url);
  const date = url.searchParams.get("date") || new Date().toISOString().split("T")[0];
  const KEY = context.env.FOOTBALL_API_KEY;

  try {
    // 1. Get all matches for date
    const r = await fetch(`https://live-football-api.com/api/v1/matches?api_key=${KEY}&date=${date}&lang=en`);
    const d = await r.json();
    let raw = d.matches || d.data?.matches || d.data || d.result || [];

    // 2. For LIVE matches, fetch details to get minute + live score
    // (matches endpoint doesn't give minute, this is why you see 13:30)
    const liveMatches = raw.filter(m => {
      const st = m.status || {};
      const disp = (st.display || st.status || "").toString().toUpperCase();
      return st.is_live || m.is_live || disp.includes("1H") || disp.includes("2H") || disp.includes("HT") || disp === "LIVE";
    });

    // Fetch details in parallel (limit to 20 to save credits)
    let detailsMap = {};
    if (liveMatches.length > 0 && liveMatches.length <= 25) {
      const detailsPromises = liveMatches.slice(0, 20).map(async (m) => {
        try {
          const dr = await fetch(`https://live-football-api.com/api/v1/live_match_details?api_key=${KEY}&match_id=${m.id}&lang=en`);
          // try alternate param names if first fails
          let dj = await dr.json().catch(()=>null);
          if (!dj || dj.error) {
            const dr2 = await fetch(`https://live-football-api.com/api/v1/live_match_details?api_key=${KEY}&id=${m.id}&lang=en`);
            dj = await dr2.json().catch(()=>null);
          }
          return { id: m.id, detail: dj };
        } catch { return { id: m.id, detail: null }; }
      });
      const results = await Promise.all(detailsPromises);
      results.forEach(r => { if (r.detail) detailsMap[r.id] = r.detail; });
    }

    const fixed = raw.map(m => {
      let kickoffTime = m.kickoff || "12:00";
      let kickoffISO = `${date}T${kickoffTime}:00Z`;
      if (m.date?.includes("T")) kickoffISO = m.date;
      let timestamp = Math.floor(new Date(kickoffISO).getTime() / 1000);

      let st = m.status || {};
      let display = st.display || st.status || m.status || "";
      if (typeof display === "object") display = display.display || display.status || "";
      let s = String(display).toUpperCase();
      let isLive = st.is_live || m.is_live || s.includes("1H") || s.includes("2H") || s.includes("HT") || s==="LIVE";

      let short = "NS";
      if (s==="FT"||s.includes("FINISH")) short="FT";
      else if (s.includes("HT")) short="HT";
      else if (isLive) short="LIVE";

      // SCORE from main list
      let homeG = m.home?.score!=null? parseInt(m.home.score): null;
      let awayG = m.away?.score!=null? parseInt(m.away.score): null;

      // MINUTE - try from details first
      let minute = null;
      const det = detailsMap[m.id];
      if (det) {
        const dm = det.match || det.data || det;
        minute = dm?.minute?? dm?.elapsed?? dm?.status?.minute?? dm?.live?.minute?? dm?.time_info?.minute?? null;
        // also update score from details if more accurate
        if (dm?.home?.score!=null) homeG = parseInt(dm.home.score);
        if (dm?.away?.score!=null) awayG = parseInt(dm.away.score);
        if (dm?.score?.home!=null) homeG = dm.score.home;
        if (dm?.score?.away!=null) awayG = dm.score.away;
        if (dm?.status?.display) display = dm.status.display;
        if (dm?.status?.short) s = dm.status.short;
      }
      // fallback minute from main
      if (minute==null) minute = m.minute?? m.elapsed?? st.minute?? st.elapsed?? null;

      let leagueName = (m.country && m.home)? m.name : (m.league?.name || m.name || "Other");
      let country = m.country || m.league?.country || "";

      return {
        fixture: {
          id: m.id,
          date: kickoffISO,
          timestamp,
          status: { short, long: String(display), elapsed: minute }
        },
        league: { name: leagueName, country },
        teams: { home: { name: m.home?.name||m.home_team||"Home" }, away: { name: m.away?.name||m.away_team||"Away" } },
        goals: { home: homeG, away: awayG }
      };
    });

    return new Response(JSON.stringify({ response: fixed }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Cache-Control": "no-cache" }
    });

  } catch (e) {
    return new Response(JSON.stringify({ response: [], error: e.message }), { headers: { "Content-Type": "application/json" } });
  }
}
