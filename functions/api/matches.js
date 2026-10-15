export async function onRequest(context){
  const H={
    "Content-Type":"application/json",
    "Access-Control-Allow-Origin":"*",
    "Cache-Control":"public, max-age=300"
  };
  const S=o=>new Response(JSON.stringify(o),{headers:H});
  try{
    const u=new URL(context.request.url);
    const date=u.searchParams.get("date")||new Date().toISOString().slice(0,10);
    const KEY=context.env.FOOTBALL_API_KEY;
    if(!KEY) return S({response:[],error:"FOOTBALL_API_KEY not set in Cloudflare Dashboard > Settings > Variables"});

    // Use Cloudflare cache to save credits
    const cacheKey=new Request(u.toString(), context.request);
    const cache=caches.default;
    let cached=await cache.match(cacheKey);
    if(cached){
      let txt=await cached.text();
      return new Response(txt,{headers:H});
    }

    const r=await fetch(`https://v3.football.api-sports.io/fixtures?date=${date}`,{
      headers:{"x-apisports-key":KEY}
    });
    const t=await r.text();
    let d;
    try{d=JSON.parse(t)}catch(e){
      return S({response:[],error:"API did not return JSON",full:t.slice(0,500)});
    }

    // Handle API errors cleanly - NEVER return object
    if(d.errors && Object.keys(d.errors).length>0){
      let errStr=JSON.stringify(d.errors);
      // If rate limit, tell user to wait
      if(errStr.toLowerCase().includes("rate")){
        return S({response:[],error:"Rate limit - free plan allows 1 request per minute. Please wait 60 seconds! Cache will prevent this next time.",full:d});
      }
      return S({response:[],error:errStr,full:d});
    }

    const out=(d.response||[]).map(f=>{
      let bt="15:00";
      try{bt=new Date(f.fixture.date).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",timeZone:"Europe/Berlin"})}catch{}
      return{
        berlinTime:bt,
        fixture:{status:{short:f.fixture?.status?.short||"NS"}},
        teams:{home:{name:f.teams?.home?.name||"Home"},away:{name:f.teams?.away?.name||"Away"}},
        goals:{home:f.goals?.home??0,away:f.goals?.away??0},
        league:{name:f.league?.name||"League"}
      };
    });
    out.sort((a,b)=>a.berlinTime.localeCompare(b.berlinTime));
    const res=S({response:out});
    // Save to cache for 5 mins - this saves your 474 credits!
    context.waitUntil(cache.put(cacheKey,res.clone()));
    return res;
  }catch(e){
    return S({response:[],error:e.message||"Unknown error"});
  }
}
