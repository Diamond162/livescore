export async function onRequest(context){
 try{
  const API_KEY = context.env.LIVE_API_KEY || context.env.API_KEY;
  if(!API_KEY){
    return new Response(JSON.stringify({error:"KEY_MISSING", matches:[], count:0}),{headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}});
  }
  const url = new URL(context.request.url);
  // Don't force future date - use today if not provided
  let date = url.searchParams.get('date');
  let apiUrl = `https://live-football-api.com/api/v1/matches?api_key=${API_KEY}`;
  if(date) apiUrl += `&date=${date}`;

  let res = await fetch(apiUrl);
  let data = await res.json();

  if(data.error){
    return new Response(JSON.stringify({error:data.error, details:data, matches:[], count:0}),{headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}});
  }

  let matches = data.matches || [];
  let all = matches.map(m=>{
    let s = (m.status||"").toLowerCase();
    let st = s.includes("live")||s.includes("half")?"LIVE":s.includes("finish")||s.includes("ft")||s.includes("ended")||s.includes("full")?"FINISHED":"UPCOMING";
    return {
      lg: m.league?.name || m.competition || "League",
      h: m.home?.name || "Home",
      a: m.away?.name || "Away",
      hs: m.score?.home?? m.home_score?? 0,
      as: m.score?.away?? m.away_score?? 0,
      st: st,
      tm: m.minute? m.minute+"'" : (m.status || "")
    };
  });

  return new Response(JSON.stringify({source:"live-football-api REAL", date: date||"live", count:all.length, matches:all}),{
    headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Cache-Control":"no-cache"}
  });
 }catch(err){
  return new Response(JSON.stringify({error:err.message, matches:[], count:0}),{headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}});
 }
}
