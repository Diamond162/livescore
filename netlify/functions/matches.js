exports.handler = async () => {
  const API_KEY = process.env.LIVE_FOOTBALL_API_KEY;
  let realMatches = [];

  // 1) Try your paid live-football-api (you have 443 credits)
  try{
    for(let offset of [-1,0,1]){
      let d=new Date(); d.setDate(d.getDate()+offset);
      let date=d.toISOString().split('T')[0];
      let res=await fetch(`https://live-football-api.com/api/v1/matches?date=${date}&lang=en`,{headers:{'X-Api-Key':API_KEY}});
      let json=await res.json();
      let ms=json.data?.matches||json.data||[];
      if(ms.length>0){ realMatches=realMatches.concat(ms); break; }
    }
  }catch(e){}

  // 2) If still 0 at 1:58 AM (normal), get REAL from ESPN free - no key
  if(realMatches.length===0){
    try{
      let date=new Date(Date.now()-86400000).toISOString().split('T')[0].replace(/-/g,'');
      let res=await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=${date}`);
      let json=await res.json();
      (json.events||[]).forEach(ev=>{
        let comp=ev.competitions[0];
        let home=comp.competitors.find(c=>c.homeAway==='home');
        let away=comp.competitors.find(c=>c.homeAway==='away');
        realMatches.push({
          country:{name:"ENGLAND"},
          league:{name:"PREMIER LEAGUE"},
          homeTeam:{name:home.team.displayName},
          awayTeam:{name:away.team.displayName},
          scores:{home:home.score, away:away.score},
          status:{type:"FT"}
        });
      });
    }catch(e){}
  }

  const clean=realMatches.map(m=>({
    country:m.country?.name||"ENGLAND",
    leagueName:m.league?.name||"PREMIER LEAGUE",
    home:m.homeTeam?.name||m.home_team?.name||"Home",
    away:m.awayTeam?.name||m.away_team?.name||"Away",
    hs:m.scores?.home??"-",
    as:m.scores?.away??"-",
    status:m.status?.type||"FT",
    isLive:false, isFT:true
  }));

  return {
    statusCode:200,
    headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'},
    body: JSON.stringify({data:{matches:clean}})
  };
};
