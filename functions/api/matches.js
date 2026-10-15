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
    if(!KEY) return S({response:[],error:"FOOTBALL_API_KEY not set - Go Cloudflare Dashboard > Settings > Variables"});

    const cacheKey=new Request(u.toString(), context.request);
    const cache=caches.default;
    let cached=await cache.match(cacheKey);
    if(cached){
      return new Response(await cached.text(),{headers:H});
    }

    const r=await fetch(`https://v3.football.api-sports.io/fixtures?date=${date}`,{
      headers:{"x-apisports-key":KEY}
    });
    const t=await r.text();
    let d;
    try{d=JSON.parse(t)}catch(e){
      return S({response:[],error:"API bad response",full:t.slice(0,500)});
    }

    if(d.errors && Object.keys(d.errors).length>0){
      let errStr=JSON.stringify(d.errors);
      if(errStr.toLowerCase().includes("rate")){
        return S({response:[],error:"Rate limit - wait 60 sec (free plan 1/min). Cache active now!",full:d});
      }
      return S({response:[],error:errStr,full:d});
    }

    const out=(d.response||[]).map(f=>{
      let bt="15:00";
      try{
        bt=new Date(f.fixture.date).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",timeZone:"Africa/Lagos"});
      }catch{}
      return{
        time:bt,
        fixture:{status:{short:f.fixture?.status?.short||"NS"}},
        teams:{home:{name:f.teams?.home?.name||"Home"},away:{name:f.teams?.away?.name||"Away"}},
        goals:{home:f.goals?.home??0,away:f.goals?.away??0},
        league:{name:f.league?.name||"League"}
      };
    });
    out.sort((a,b)=>a.time.localeCompare(b.time));
    const res=S({response:out});
    context.waitUntil(cache.put(cacheKey,res.clone()));
    return res;
  }catch(e){
    return S({response:[],error:e.message});
  }
}
