let cache=null, cacheTime=0;
exports.handler = async () => {
  if(cache && Date.now()-cacheTime < 300000){
    return {statusCode:200, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}, body: JSON.stringify(cache)};
  }
  const API_KEY = process.env.LIVE_FOOTBALL_API_KEY;
  let all=[];
  for(let off of [-2,-1,0]){
    let d=new Date(); d.setDate(d.getDate()+off);
    try{
      let r=await fetch(`https://live-football-api.com/api/v1/matches?date=${d.toISOString().split('T')[0]}`,{headers:{'Authorization':`Bearer ${API_KEY}`}});
      let j=await r.json();
      let ms=j.data?.matches || j.data || j.matches || [];
      if(ms.length) all=all.concat(ms);
    }catch(e){}
  }
  const toS=(v)=>{ if(!v) return ""; if(typeof v==="string") return v; if(typeof v==="object") return v.name||v.shortName||""; return String(v); };
  const clean=all.map(m=>{
    let home=toS(m.homeTeam||m.home_team||m.home||m.teams?.home);
    let away=toS(m.awayTeam||m.away_team||m.away||m.teams?.away);
    let hs="-", as="-";
    if(m.scores){ hs=m.scores.home??m.scores.homeScore??"-"; as=m.scores.away??m.scores.awayScore??"-"; }
    if(hs=="-"&&m.score){ hs=m.score.home??"-"; as=m.score.away??"-"; }
    if(hs=="-"&&m.home_score!==undefined){ hs=m.home_score; as=m.away_score; }
    if(hs=="-"&&m.homeTeam?.score!==undefined){ hs=m.homeTeam.score; as=m.awayTeam.score; }
    let league=toS(m.league)||m.leagueName||"League";
    let country=toS(m.country)||m.area?.name||"";
    let st=m.status?.type||m.status||"FT";
    return {country, leagueName:league, home, away, hs:String(hs), as:String(as), status:st, isLive:["LIVE","1H","2H","IN_PLAY"].includes(st), isFT:st==="FT"};
  }).filter(x=>x.home&&x.away);
  cache={data:{matches:clean}}; cacheTime=Date.now();
  return {statusCode:200, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}, body: JSON.stringify(cache)};
};
