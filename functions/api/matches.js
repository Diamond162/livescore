export async function onRequest(context) {
  const headers = { "Content-type": "application/json", "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=300" };
  const safe = (o, cacheTime=300) => new Response(JSON.stringify(o), { 
    headers: { ...headers, "Cache-Control": `public, max-age=${cacheTime}` }
  });

  // Fallback so site never empty
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

    // Try cache first - Cloudflare will cache for 5 minutes so you don't waste credits
    const cache = caches.default;
    let cacheKey = new Request(url.toString(), { method: "GET" });
    let cached = await cache.match(cacheKey);
    if (cached) return cached;

    if (!KEY) return safe({ response: FALLBACK.map(m=>({ berlinTime:m.time, fixture:{date:dateStr, berlinTime:m.time, status:{short:"NS"}}, teams:{home:{name:m.home}, away:{name:m.away}}, goals:{home:0,away:0}, league:{name:m.league} })) });

    const apiUrl = `https://live-football-api.com/api/v1/matches?api_key=${KEY}&date=${dateStr}&lang=en`;
    const r = await fetch(apiUrl);
    const text = await r.text();

    if (text.trim().startsWith('<')) {
      // Return fallback but with 60 sec cache
      let resp = safe({ response: FALLBACK.map(m=>({ berlinTime:m.time, fixture:{date:dateStr, berlinTime:m.time, status:{short:"NS"}}, teams:{home:{name:m.home}, away:{name:m.away}}, goals:{home:0,away:0}, league:{name:m.league} })), 60);
      context.waitUntil(cache.put(cacheKey, resp.clone()));
      return resp;
    }

    let data = JSON.parse(text);
    if (data.success === false) {
      // API said Access denied - daily limit - return fallback and tell user
      let resp = safe({ response: FALLBACK.map(m=>({ berlinTime:m.time, fixture:{date:dateStr, berlinTime:m.time, status:{short:"NS"}}, teams:{home:{name:m.home}, away:{name:m.away}}, goals:{home:0,away:0}, league:{name:m.league} }), error: data.message, note: "Daily limit reached - will reset tomorrow" }, 3600);
      context.waitUntil(cache.put(cacheKey, resp.clone()));
      return resp;
    }

    let matches = data.matches || [];
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
    
    let finalResp = safe({ response: out }, 300); // Cache 5 mins
    context.waitUntil(cache.put(cacheKey, finalResp.clone()));
    return finalResp;

  } catch(e){
    return safe({ response: FALLBACK.map(m=>({ berlinTime:m.time, fixture:{date:new Date().toISOString().slice(0,10), berlinTime:m.time, status:{short:"NS"}}, teams:{home:{name:m.home}, away:{name:m.away}}, goals:{home:0,away:0}, league:{name:m.league} })) });
  }
}
