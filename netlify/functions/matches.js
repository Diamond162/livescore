exports.handler = async () => {
  const H={'Content-Type':'application/json','Access-Control-Allow-Origin':'*'};
  try{
    const K=process.env.LIVE_FOOTBALL_API_KEY;
    if(!K) return {statusCode:200, headers:H, body:'{"data":{"matches":[]}}'};
    let all=[];
    for(let o of [-1,0,1]){
      let d=new Date(); d.setDate(d.getDate()+o);
      let dt=d.toISOString().split('T')[0];
      try{
        let r=await fetch(`https://live-football-api.com/api/v1/matches?date=${dt}`,{headers:{Authorization:`Bearer ${K}`}});
        let j=await r.json();
        let m=j.data?.matches||j.data||j.matches||[];
        if(Array.isArray(m)) all=all.concat(m);
      }catch(e){}
    }
    const S=v=>typeof v==='string'?v: (v&&v.name)||'';
    let clean=all.map(m=>({
      country:S(m.country||m.area), leagueName:S(m.league)||'League',
      home:S(m.homeTeam||m.home_team||m.home), away:S(m.awayTeam||m.away_team||m.away),
      hs:String(m.home_score??m.scores?.home??'-'), as:String(m.away_score??m.scores?.away??'-'),
      status:m.status||'FT', isLive:false, isFT:true
    })).filter(x=>x.home&&x.away);
    return {statusCode:200, headers:H, body:JSON.stringify({data:{matches:clean}})};
  }catch(e){
    return {statusCode:200, headers:H, body:'{"data":{"matches":[]}}'};
  }
};
