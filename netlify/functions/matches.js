exports.handler = async () => {
  const API_KEY = process.env.LIVE_FOOTBALL_API_KEY;
  let debug = [];

  let all = [];
  for(let offset of [-2,-1,0]){
    let d=new Date(); d.setDate(d.getDate()+offset);
    let dateStr=d.toISOString().split('T')[0];
    try{
      let url=`https://live-football-api.com/api/v1/matches?date=${dateStr}`;
      let res=await fetch(url,{headers:{'X-Api-Key':API_KEY}});
      let text=await res.text();
      let json;
      try{ json=JSON.parse(text); }catch{ json={raw:text}; }
      debug.push({date:dateStr, status:res.status, count:json.data?.matches?.length||json.data?.length||0, sample:JSON.stringify(json).slice(0,300)});

      let ms=json.data?.matches||json.data||[];
      if(Array.isArray(ms) && ms.length>0) all=all.concat(ms);
    }catch(e){ debug.push({date:dateStr, error:e.message}); }
  }

  const clean=all.map(m=>({
    country:m.country?.name||"",
    leagueName:m.league?.name||"",
    home:m.homeTeam?.name||m.home_team?.name||"",
    away:m.awayTeam?.name||m.away_team?.name||"",
    hs:m.scores?.home??"-",
    as:m.scores?.away??"-",
    status:m.status?.type||"FT",
    isLive:false,isFT:true
  }));

  return {
    statusCode:200,
    headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'},
    body: JSON.stringify({data:{matches:clean}, _debug:debug, _keyExists:!!API_KEY, _keyLen:API_KEY?.length})
  };
};
