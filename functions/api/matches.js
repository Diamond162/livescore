export async function onRequest(c){
  const K=(c.env.FOOTBALL_API_KEY||'').trim();
  function toBerlin(iso){
    try{
      if(!iso) return "00:00";
      if(/^\d{2}:\d{2}$/.test(iso)) return iso; // already 20:00
      return new Date(iso).toLocaleTimeString('en-GB',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit',hour12:false});
    }catch{ return "00:00"; }
  }
  try{
    let reqDate=new URL(c.request.url).searchParams.get('date')||new Date().toISOString().split('T')[0];
    let apiUrl=`https://live-football-api.com/api/v1/matches?api_key=${K}&date=${reqDate}&lang=en`;
    let r=await fetch(apiUrl);
    let j=await r.json();
    let list=j.matches||[];
    let out=list.map(m=>{
      let timeStr=m.time||m.date||m.datetime||"";
      let berlin=toBerlin(timeStr);
      let country=m.league?.country?.name||m.league?.country||m.country?.name||m.country||m.league?.name||"World";
      let leagueName=m.league?.name||m.competition?.name||m.competition||"League";
      let gh=m.score?.home??m.home_score??null;
      let ga=m.score?.away??m.away_score??null;
      let status=m.status||"NS";
      return{
        fixture:{id:m.id,berlinTime:berlin,status:{short:status},date:reqDate},
        league:{name:leagueName,country:country},
        teams:{home:{name:m.home?.name||"Home"},away:{name:m.away?.name||"Away"}},
        goals:{home:gh,away:ga}
      }
    });
    // BIG LEAGUES TOP
    let big=["Champions","Europa","Premier","LaLiga","Bundesliga","Serie A","Ligue 1","Copa","AFC","UEFA"];
    out.sort((a,b)=>{
      let aB=big.some(x=>a.league.name.includes(x))?0:1;
      let bB=big.some(x=>b.league.name.includes(x))?0:1;
      return aB-bB;
    });
    return new Response(JSON.stringify({response:out,results:out.length,usedDate:reqDate}),{headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}});
  }catch(e){
    return new Response(JSON.stringify({response:[],error:e.message}),{headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}});
  }
}
