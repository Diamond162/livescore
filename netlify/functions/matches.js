exports.handler = async () => {
  const API_KEY = process.env.LIVE_FOOTBALL_API_KEY;

  let allMatches = [];
  let debug = [];

  for(let offset of [-2,-1,0,1]){
    let d=new Date(); d.setDate(d.getDate()+offset);
    let dateStr=d.toISOString().split('T')[0];
    try{
      // Correct auth for live-football-api: Bearer token
      let url=`https://live-football-api.com/api/v1/matches?date=${dateStr}&lang=en`;
      let res=await fetch(url,{
        headers:{
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type':'application/json'
        }
      });
      let json=await res.json();
      debug.push({date:dateStr, status:res.status, count:(json.data?.matches||json.data||[]).length});

      let ms=json.data?.matches||json.data||[];
      if(ms.length>0) allMatches=allMatches.concat(ms);
    }catch(e){ debug.push({date:dateStr, err:e.message}); }
  }

  const clean=allMatches.map(m=>({
    country:m.country?.name||"",
    leagueName:m.league?.name||"",
    home:m.homeTeam?.name||"",
    away:m.awayTeam?.name||"",
    hs:String(m.scores?.home??m.score?.home??"-"),
    as:String(m.scores?.away??m.score?.away??"-"),
    status:m.status?.type||"FT",
    isLive:false,isFT:true
  }));

  return {
    statusCode:200,
    headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'},
    body: JSON.stringify({data:{matches:clean}, _debug:debug})
  };
};
