exports.handler = async () => {
  const headers = {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'};
  try{
    const KEY = process.env.LIVE_FOOTBALL_API_KEY;
    if(!KEY) return {statusCode:200, headers, body: JSON.stringify({data:{matches:[]}, error:"No API_KEY set"})};
    let all=[];
    for(let off of [-1,0,1]){
      let d=new Date(); d.setDate(d.getDate()+off);
      let date=d.toISOString().split('T')[0];
      try{
        let r=await fetch(`https://live-football-api.com/api/v1/matches?date=${date}`,{headers:{'Authorization':`Bearer ${KEY}`}});
        let txt=await r.text();
        let j=JSON.parse(txt);
        let ms=j.data?.matches || j.data || j.matches || [];
        if(Array.isArray(ms)) all=all.concat(ms);
      }catch(e){}
    }
    const s=v=>{ if(!v) return ""; if(typeof v==="string") return v; if(typeof v==="object") return v.name||v.shortName||v.displayName||""; return String(v); };
    const clean=all.map(m=>{
      let home=s(m.homeTeam||m.home_team||m.home);
      let away=s(m.awayTeam||m.away_team||m.away);
      let hs=m.home_score??m.homeScore??m.scores?.home??m.score?.home??"-";
      let as=m.away_score??m.awayScore??m.scores?.away??m.score?.away??"-";
      return {country:s(m.country||m.area), leagueName:s(m.league)||"League", home, away, hs:String(hs), as:String(as), status:m.status||"FT", isLive:false, isFT:true};
    }).filter(x=>x.home);
    return {statusCode:200, headers, body: JSON.stringify({data:{matches:clean}})};
  }catch(err){
    return {statusCode:200, headers, body: JSON.stringify({data:{matches:[]}, error: err.message})};
  }
};
