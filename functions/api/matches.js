export async function onRequest(context) {
  const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
  const send = (obj) => new Response(JSON.stringify(obj), { headers });

  try {
    const url = new URL(context.request.url);
    let dateStr = url.searchParams.get("date") || new Date().toISOString().slice(0,10);
    // FotMob needs YYYYMMDD not YYYY-MM-DD
    const fotmobDate = dateStr.replaceAll("-", "");

    // FotMob FREE API - no key needed!
    const apiUrl = `https://www.fotmob.com/api/matches?date=${fotmobDate}`;

    const res = await fetch(apiUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      }
    });

    const data = await res.json();

    // FotMob returns { leagues: [ { name, matches: [...] } ] }
    const leagues = data.leagues || [];
    const out = [];

    for (const league of leagues) {
      const leagueName = league.name || "League";
      const matches = league.matches || [];

      for (const m of matches) {
        // Time - convert UTC to Berlin
        let berlinTime = "15:00";
        try {
          if (m.status?.utcTime) {
            const d = new Date(m.status.utcTime);
            berlinTime = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
          } else if (m.time) {
            berlinTime = m.time.substring(0,5);
          }
        } catch {}

        // Status: FT, LIVE, HT, NS, etc
        const statusShort = m.status?.reason?.short || m.status?.liveTime?.short || "NS";

        // Scores
        let homeScore = 0, awayScore = 0;
        if (m.status?.scoreStr) {
          const parts = m.status.scoreStr.split("-");
          if (parts.length === 2) {
            homeScore = parseInt(parts[0]) || 0;
            awayScore = parseInt(parts[1]) || 0;
          }
        }

        out.push({
          berlinTime: berlinTime,
          fixture: {
            date: dateStr,
            berlinTime: berlinTime,
            status: { short: statusShort }
          },
          teams: {
            home: { name: m.home?.name || "Home" },
            away: { name: m.away?.name || "Away" }
          },
          goals: { home: homeScore, away: awayScore },
          league: { name: leagueName }
        });
      }
    }

    // Sort by time
    out.sort((a,b) => a.berlinTime.localeCompare(b.berlinTime));

    return send({ response: out });

  } catch (e) {
    return send({ response: [], error: e.message });
  }
}
