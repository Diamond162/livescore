export async function onRequest(c){
  const K=(c.env.FOOTBALL_API_KEY||'').trim();
  try{
    let date=new URL(c.request.url).searchParams.get('date')||new Date().toISOString().split('T')[0];
    let apiUrl=`https://live-football-api.com/api/v1/matches?api_key=${K}&date=${date}&lang=en`;
    let r=await fetch(apiUrl);
    let j=await r.json();
    let list=j.matches||[];
    let out=list.map(m=>{
      // TIME FIX - API already gives "20:00", don't convert to Invalid Date
      let rawTime=m.time||"";
      let berlinTime=rawTime;
      if(m.date && m.date.includes('T')){ // if full datetime
        try{ berlinTime=new Date(m.date).toLocaleTimeString('en-GB',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit'});}catch{berlinTime=rawTime;}
      }
      // Country + League
      let countryName=m.league?.country?.name||m.league?.country||m.country?.name||m.country||"World";
      let countryFlag=m.league?.country?.flag||"🌍";
      // Score fix
      let gh=m.score?.home;
      if(gh==null) gh=m.scores?.home??m.home_score??null;
      let ga=m.score?.away;
      if(ga==null) ga=m.scores?.away??m.away_score??null;

      return{
        fixture:{id:m.id,berlinTime:berlinTime||"00:00",status:{short:m.status||"NS"}},
        league:{name:m.league?.name||m.competition||"Cup",country:countryName,flag:countryFlag,isTop:0},
        teams:{home:{name:m.home?.name||"Home"},away:{name:m.away?.name||"Away"}},
        goals:{home:gh,away:ga}
      }
    });

    // BIG LEAGUES AT TOP
    let bigLeagues=["Premier League","LaLiga","Bundesliga","Serie A","Ligue 1","Champions League","Europa League","Copa Libertadores","Copa do Brasil","World Cup"];
    out.sort((a,b)=>{
      let aBig=bigLeagues.some(x=>a.league.name.includes(x))?-1:1;
      let bBig=bigLeagues.some(x=>b.league.name.includes(x))?-1:1;
      return aBig-bBig;
    });

    return new Response(JSON.stringify({response:out,results:out.length}),{headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}});
  }catch(e){
    return new Response(JSON.stringify({response:[],error:e.message}),{headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}});
  }
}
