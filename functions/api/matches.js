export async function onRequest(context) {
  const headers = { "Content-type": "application/json", "Access-Control-Allow-Origin": "*" };
  const safe = (o) => new Response(JSON.stringify(o), { headers });

  const FALLBACK = [
    { time:"18:45", home:"Salzburg", away:"Go Ahead Eagles", league:"EUROPE: Europa League" },
    { time:"18:45", home:"Bologna", away:"Maccabi Tel Aviv", league:"EUROPE: Europa League" },
    { time:"21:00", home:"Benfica", away:"Celtic", league:"EUROPE: Champions League" },
    { time:"21:00", home:"Aston Villa", away:"Genoa", league:"EUROPE: Europa League" },
    { time:"02:30", home:"Ind. Palmira", away:"Leones FC", league:"COLOMBIA: Primera B" },
  ];

  try {
    const url = new URL(context.request.url);
    const dateStr = url.searchParams.get('date') || new Date().toISOString().slice(0,10);
    const KEY = context.env.LIVE_FOOTBALL_API_KEY;

    if (!KEY) {
      return safe({ response: FALLBACK.map(m=>({ 
        berlinTime:m.time, 
        fixture:{date:dateStr, berlinTime:m.time, status:{short:"NS"}}, 
        teams:{home:{name:m.home}, away:{name:m.away}}, 
        goals:{home:0,away:0}, 
        league:{name:m.league} 
      })) });
    }

    const apiUrl = `https://live-football-api.com/api/v1/matches?api_key=${KEY}&date=${dateStr}&lang=en`;
    const r = await fetch(apiUrl);
    const text = await r.text();

    if (text.trim().startsWith('<')) {
      return safe({ response: FALLBACK.map(m=>({ berlinTime:m.time, fixture:{date:dateStr, berlinTime:m.time, status:{short:"NS"}}, teams:{home:{name:m.home}, away:{name:m.away}}, goals:{home:0,away:0}, league:{name:m.league} })) });
    }

    let data = JSON.parse(text);
    
    // If Access denied - daily limit
    if (data.success === false) {
      return safe({ 
        response: FALLBACK.map(m=>({ berlinTime:m.time, fixture:{date:dateStr, berlinTime:m.time, status:{short:"NS"}}, teams:{home:{name:m.home}, away:{name:m.away}}, goals:{home:0,away:0}, league:{name:m.league} })),
        warning: data.message 
      });
    }

    let matches = data.matches || [];
    if (matches.length === 0) {
      return safe({ response: FALLBACK.map(m=>({ berlinTime:m.time, fixture:{date:dateStr, berlinTime:m.time, status:{short:"NS"}}, teams:{home:{name:m.home}, away:{name:m.away}}, goals:{home:0,away:0}, league:{name:m.league} })) });
    }

    let out = matches.map(m => {
      let t = m.time ? m.time.substring(0,5) : "18:45";
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

  } catch(e){
    return safe({ response: FALLBACK.map(m=>({ berlinTime:m.time, fixture:{date:new Date().toISOString().slice(0,10), berlinTime:m.time, status:{short:"NS"}}, teams:{home:{name:m.home}, away:{name:m.away}}, goals:{home:0,away:0}, league:{name:m.league} })) });
  }
}
