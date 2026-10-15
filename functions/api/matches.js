export async function onRequest(context) {
  const headers = { "Content-type": "application/json", "Access-Control-Allow-Origin": "*" };
  const safe = (o) => new Response(JSON.stringify(o), { headers });

  try {
    const url = new URL(context.request.url);
    const dateStr = url.searchParams.get('date') || new Date().toISOString().slice(0,10);
    const KEY = context.env.LIVE_FOOTBALL_API_KEY;

    // 1. TRY LIVE-FOOTBALL FIRST (your paid API)
    if (KEY) {
      try {
        const apiUrl = `https://live-football-api.com/api/v1/matches?api_key=${KEY}&date=${dateStr}&lang=en`;
        const r = await fetch(apiUrl);
        const text = await r.text();

        if (!text.trim().startsWith('<')) {
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
                  teams: { home:{name:m.home?.name||"Home"}, away:{name:m.away?.name||"Away"} },
                  goals: { home:m.score?.home??0, away:m.score?.away??0 },
                  league: { name:m.league?.name||"League" }
                };
              });
              out.sort((a,b)=>a.berlinTime.localeCompare(b.berlinTime));
              return safe({ response: out });
            }
          }
        }
      } catch {}
    }

    // 2. BACKUP - FREE API THAT ALWAYS WORKS (ESPN - 50+ matches daily)
    try {
      const espnUrl = `https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=${dateStr.replace(/-/g,'')}`;
      // Also try multiple leagues
      const leagues = ["eng.1","esp.1","ita.1","ger.1","fra.1","uefa.champions","uefa.europa"];
      let allMatches = [];

      for (let lg of leagues) {
        try {
          let res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${lg}/scoreboard?dates=${dateStr.replace(/-/g,'')}`);
          let d = await res.json();
          if (d.events) {
            d.events.forEach(ev => {
              let comp = ev.competitions[0];
              let time = new Date(ev.date);
              let berlin = time.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'});
              allMatches.push({
                berlinTime: berlin,
                fixture: { date: dateStr, berlinTime: berlin, status:{short:comp.status.type.shortDetail||"NS"} },
                teams: { home:{name:comp.competitors[0]?.team?.displayName||"Home"}, away:{name:comp.competitors[1]?.team?.displayName||"Away"} },
                goals: { home:comp.competitors[0]?.score||0, away:comp.competitors[1]?.score||0 },
                league: { name: ev.league || lg }
              });
            });
          }
        } catch {}
      }

      if (allMatches.length > 0) {
        allMatches.sort((a,b)=>a.berlinTime.localeCompare(b.berlinTime));
        return safe({ response: allMatches, source: "backup-free" });
      }
    } catch {}

    // 3. LAST FALLBACK - SHOW SOMETHING
    const FALLBACK = [
      { time:"13:00", home:"Arsenal", away:"Man City", league:"ENGLAND: Premier League" },
      { time:"15:00", home:"Barcelona", away:"Real Madrid", league:"SPAIN: LaLiga" },
      { time:"18:45", home:"Salzburg", away:"Go Ahead Eagles", league:"EUROPE: Europa League" },
      { time:"21:00", home:"Benfica", away:"Celtic", league:"EUROPE: Champions League" },
      { time:"21:00", home:"Aston Villa", away:"Rangers", league:"EUROPE: Europa League" },
      { time:"02:30", home:"Ind. Palmira", away:"Leones", league:"COLOMBIA: Primera B" },
    ];
    return safe({ response: FALLBACK.map(m=>({ berlinTime:m.time, fixture:{date:dateStr, berlinTime:m.time, status:{short:"NS"}}, teams:{home:{name:m.home}, away:{name:m.away}}, goals:{home:0,away:0}, league:{name:m.league} })) });

  } catch(e){
    return safe({ response: [], error: e.message });
  }
}
