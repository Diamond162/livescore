export async function onRequest(c){
  const url=new URL(c.request.url);
  // Use TODAY, not 2025-10-15
  const today = new Date().toISOString().split('T')[0];
  const date=url.searchParams.get('date') || today;
  const KEY=(c.env.HIGHLIGHTLY_API_KEY||'').trim();

  if(!KEY) return new Response(JSON.stringify({response:[],results:0}),{headers:{"content-type":"application/json"}});

  try{
    let allMatches=[];
    // Fetch 300 = FULL Europa + Conference + All
    for(let page=0; page<3; page++){
      let r=await fetch(`https://soccer.highlightly.net/matches?date=${date}&limit=100&offset=${page*100}`,{
        headers:{"x-rapidapi-key":KEY,"x-rapidapi-host":"soccer.highlightly.net","x-api-key":KEY}
      });
      let j={}; try{ j=JSON.parse(await r.text()); }catch{ continue; }
      let list=j.data||j.matches||[];
      if(!list.length) break;
      allMatches=allMatches.concat(list);
    }

    // SORT by time - like Flashscore 18:45 first, then 21:00
    allMatches.sort((a,b)=> new Date(a.date) - new Date(b.date));

    let out=allMatches.map(m=>{
      // FIX TIME: Use Lagos time to match Flashscore.mobi
      let lagosTime="--:--", berlinTime="--:--";
      try{
        let d=new Date(m.date);
        lagosTime = d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Africa/Lagos'});
        berlinTime = d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'});
      }catch{}
      return{
        fixture:{
          id:m.id,
          berlinTime: lagosTime, // Show Lagos time like Flashscore.mobi
          realBerlinTime: berlinTime,
          status:{short:m.state?.description||"NS"},
          timestamp: new Date(m.date).getTime()
        },
        league:{
          name: m.league?.name || m.competition?.name || "League",
          country: m.country?.name || m.league?.country || "World",
          fullName: `${m.country?.name||'World'} - ${m.league?.name||'League'}`
        },
        teams:{
          home:{name:m.homeTeam?.name||"Home"},
          away:{name:m.awayTeam?.name||"Away"}
        },
        goals:{display:m.score?.current||"-:-"}
      }
    });

    return new Response(JSON.stringify({response:out,results:out.length,date}),{
      headers:{
        "content-type":"application/json",
        "Access-Control-Allow-Origin":"*",
        "Cache-Control": "public, max-age=60" // cache 1 min to save free plan
      }
    });
  }catch(e){
    return new Response(JSON.stringify({response:[],results:0,error:e.message}),{headers:{"content-type":"application/json"}});
  }
}
