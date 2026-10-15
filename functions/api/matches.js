export async function onRequest(context) {
  const headers = { "Content-type": "application/json", "Access-Control-Allow-Origin": "*" };
  const safe = (o) => new Response(JSON.stringify(o), { headers });

  try {
    const url = new URL(context.request.url);
    const dateStr = url.searchParams.get('date') || "2026-10-15";
    const dateNum = dateStr.replace(/-/g,'');
    const KEY = context.env.LIVE_FOOTBALL_API_KEY;

    // 1. TRY YOUR VERIFIED 500 CREDIT KEY FIRST (MORE LEAGUES)
    if (KEY) {
      try {
        const apiUrl = `https://live-football-api.com/api/v1/matches?api_key=${KEY}&date=${dateStr}&lang=en`;
        const r = await fetch(apiUrl, { headers: { "Accept": "application/json" } });
        const text = await r.text();

        // FIX HTML PROBLEM: Check if na HTML, not JSON
        if (!text.trim().startsWith('<') &&!text.trim().startsWith('<!DOCTYPE')) {
          let data = JSON.parse(text);
          if (data.success!== false) {
            let matches = data.matches || data.data || [];
            if (matches.length > 0) {
              let out = matches.map(m => {
                let t = m.time? m.time.substring(0,5) : "15:00";
                if (m.timestamp) {
                  let d = new Date(m.timestamp*1000);
                  t = d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'});
                }
                return {
                  berlinTime: t,
                  fixture: { date: m.date||dateStr, berlinTime: t, status:{short:"NS"} },
                  teams: { home:{name:m.home?.name||m.home||"Home"}, away:{name:m.away?.name||m.away||"Away"} },
                  goals: { home: m.score?.home??0, away: m.score?.away??0 },
                  league: { name: m.league?.name||m.league||"League" }
                };
              });
              out.sort((a,b)=>a.berlinTime.localeCompare(b.berlinTime));
              return safe({ response: out, source: "live-football-verified", count: out.length });
            }
          }
        }
      } catch(e) {
        // If HTML error, continue to backup - no crash
      }
    }

    // 2. BACKUP - FREE ESPN (NEVER RETURNS HTML ERROR)
    let allMatches = [];
    const leagues = ["uefa.europa","uefa.europa.conf","uefa.champions","eng.1","esp.1","ita.1","ger.1","fra.1","ned.1","por.1"];
    for (let lg of leagues) {
      try {
        let res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${lg}/scoreboard?dates=${dateNum}`);
        let d = await res.json();
        if (d.events) {
          d.events.forEach(ev => {
            let comp = ev.competitions[0];
            let time = new Date(ev.date);
            let berlin = time.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'});
            allMatches.push({
              berlinTime: berlin,
              berlinSort: time.getTime(),
              fixture: { date: dateStr, berlinTime: berlin, status:{short:"NS"} },
              teams: { home:{name:comp.competitors[0]?.team?.displayName}, away:{name:comp.competitors[1]?.team?.displayName} },
              goals: { home:0, away:0 },
              league: { name: lg.toUpperCase() }
            });
          });
        }
      } catch {}
    }
    if (allMatches.length > 0) {
      allMatches.sort((a,b)=>a.berlinSort-b.berlinSort);
      return safe({ response: allMatches, source: "backup-free", count: allMatches.length });
    }

    return safe({ response: [], count: 0 });

  } catch(e) {
    return safe({ response: [], error: e.message });
  }
}
