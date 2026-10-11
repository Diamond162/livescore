exports.handler = async () => {
  const API_KEY = process.env.LIVE_FOOTBALL_API_KEY;
  let all = [];

  for(let offset of [-2,-1,0]){
    let d=new Date(); d.setDate(d.getDate()+offset);
    let dateStr=d.toISOString().split('T')[0];
    try{
      let url=`https://live-football-api.com/api/v1/matches?date=${dateStr}`;
      let res=await fetch(url,{
        headers:{ 'Authorization': `Bearer ${API_KEY}` }
      });
      let json=await res.json();
      let ms=json.data?.matches || json.data || json.matches || [];
      if(Array.isArray(ms) && ms.length) all=all.concat(ms);
    }catch(e){}
  }

  const clean=all.map(m=>{
    // Try EVERY possible field name your API might use
    let home = m.homeTeam?.name || m.home_team?.name || m.home?.name || m.teams?.home?.name || m.homeTeam || m.home_team || m.home || "";
    let away = m.awayTeam?.name || m.away_team?.name || m.away?.name || m.teams?.away?.name || m.awayTeam || m.away_team || m.away || "";

    let hs = m.scores?.home?? m.score?.home?? m.homeTeam?.score?? m.home_score?? m.homeScore?? "-";
    let as = m.scores?.away?? m.score?.away?? m.awayTeam?.score?? m.away_score?? m.awayScore?? "-";

    let league = m.league?.name || m.competition?.name || m.leagueName || m.tournament || "Unknown League";
    let country = m.country?.name || m.area?.name || m.country || "";

    let statusRaw = m.status?.type || m.status || "FT";
    let isLive = ["LIVE","IN_PLAY","1H","2H","HT"].includes(statusRaw);
    let isFT = statusRaw==="FT" || statusRaw==="FINISHED";

    return {
      country, leagueName: league,
      home: String(home), away: String(away),
      hs: String(hs), as: String(as),
      status: String(statusRaw),
      isLive, isFT
    };
  }).filter(x=>x.home && x.away); // remove empty

  return {
    statusCode:200,
    headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'},
    body: JSON.stringify({data:{matches:clean}})
  };
};
