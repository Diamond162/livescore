export async function onRequest(context){
 try{
  // Get key from Cloudflare secret - NOT from code
  const API_KEY = context.env.LIVE_API_KEY || context.env.API_KEY;

  if(!API_KEY){
    return new Response(JSON.stringify({
      error:"API key not set in Cloudflare. Go Settings > Environment variables > Add LIVE_API_KEY",
      matches:[],
      count:0
    }),{headers:{"Content-Type":"application/json"}});
  }

  const url = new URL(context.request.url);
  const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];

  let apiUrl = `https://live-football-api.com/api/v1/matches?api_key=${API_KEY}&date=${date}`;

  let res = await fetch(apiUrl);
  let data = await res.json();

  if(!data.matches || data.matches.length==0){
    return new Response(JSON.stringify({
      source:"live-football-api",
      date:date,
      count:0,
      matches:[]
    }),{headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}});
  }

  let all = data.matches.map(m=>{
    let status = (m.status||"").toLowerCase();
    let st = "UPCOMING";
    if(status.includes("live") || status.includes("half")) st="LIVE";
    else if(status.includes("finish") || status.includes("ft") || status.includes("ended")) st="FINISHED";

    return {
      lg: m.league?.name || m.competition || "Football",
      h: m.home?.name || "Home",
      a: m.away?.name || "Away",
      hs: m.score?.home?? 0,
      as: m.score?.away?? 0,
      st: st,
      tm: m.minute? m.minute+"'" : m.status || "LIVE"
    };
  });

  return new Response(JSON.stringify({
    source:"live-football-api.com - REAL",
    date:date,
    count:all.length,
    matches:all
  }),{
    headers:{
      "Content-Type":"application/json",
      "Access-Control-Allow-Origin":"*",
      "Cache-Control":"max-age=20"
    }
  });

 }catch(err){
  return new Response(JSON.stringify({error:err.message,matches:[],count:0}),{headers:{"Content-Type":"application/json"}});
 }
}
