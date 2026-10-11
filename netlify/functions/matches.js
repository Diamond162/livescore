exports.handler = async () => {
  const API_KEY = process.env.LIVE_FOOTBALL_API_KEY;
  let all = [];

  for(let offset of [-2,-1,0]){
    let d=new Date(); d.setDate(d.getDate()+offset);
    let dateStr=d.toISOString().split('T')[0];
    try{
      let res=await fetch(`https://live-football-api.com/api/v1/matches?date=${dateStr}`,{
        headers:{ 'Authorization': `Bearer ${API_KEY}` }
      });
      let json=await res.json();
      let ms=json.data?.matches || json.data || json.matches || [];
      if(ms.length) all=all.concat(ms);
    }catch(e){}
  }

  const toStr = (v) => {
    if(!v) return "";
    if(typeof v === "string") return v;
    if(typeof v === "object") return v.name || v.short_name || v.shortName || v.displayName || "";
    return String(v);
  };

  const clean=all.map(m=>{
    let homeObj = m.homeTeam || m.home_team || m.home || m.teams?.home;
    let awayObj = m.awayTeam || m.away_team || m.away || m.teams?.away;

    let home = toStr(homeObj);
    let away = toStr(awayObj);

    // Scores - try EVERY path
    let hs = "-"; let as = "-";
    if(m.scores){ hs = m.scores.home?? m.scores.homeScore?? m.scores.scoreHome?? "-"; as = m.scores.away?? m.scores.awayScore?? m.scores.scoreAway?? "-"; }
    if(hs=="-" && m.score){ hs = m.score.home?? m.score.home_score?? "-"; as = m.score.away?? m.score.away_score?? "-"; }
    if(hs=="-" && m.result){ hs = m.result.home?? "-"; as = m.result.away?? "-"; }
    if(hs=="-" && m.homeTeam?.score!==undefined){ hs = m.homeTeam.score; as = m.awayTeam.score; }
    if(hs=="-" && typeof m.home_score!=="undefined"){ hs = m.home_score; as = m.away_score; }

    let league = toStr(m.league) || m.league?.name || m.competition?.name || "Unknown";
    let country = toStr(m.country) || m.area?.name || "";

    let status = m.status?.type || m.status || m.state || "FT";

    return {
      country, leagueName: league,
      home, away,
      hs: String(hs), as: String(as),
      status, isLive: ["LIVE","IN_PLAY","1H","2H"].includes(status), isFT: status==="FT"
    };
  }).filter(x=>x.home);

  return {
    statusCode:200,
    headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'},
    body: JSON.stringify({data:{matches:clean}})
  };
};
