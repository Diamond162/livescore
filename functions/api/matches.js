export async function onRequest(c){
  const K=(c.env.FOOTBALL_API_KEY||'').trim();
  function toBerlin(t){try{if(!t)return"00:00";if(/^\d{2}:\d{2}$/.test(t))return t;return new Date(t).toLocaleTimeString('en-GB',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit'});}catch{return "00:00";}}
  async function getMatches(date){
    try{
      let url=`https://live-football-api.com/api/v1/matches?api_key=${K}&date=${date}&lang=en`;
      let r=await fetch(url);
      let j=await r.json();
      return {matches:j.matches||[],raw:j};
    }catch(e){return {matches:[],raw:{error:e.message}};}
  }
  try{
    let reqDate=new URL(c.request.url).searchParams.get('date')||"2026-10-15";
    let data=await getMatches(reqDate);
    let used=reqDate;
    // IF 0 RESULTS, SEARCH NEAREST DATES WITH 2026 DATA
    if(data.matches.length===0){
      let offsets=[-1,1,-2,2,-3,3,-4,4,-5,5,-10,10,-30,30,-60,60,-90,90];
      // Also try known good 2026 dates
      let tryDates=["2026-06-29","2026-07-03","2026-05-15","2026-09-01","2026-10-10","2026-10-14","2026-10-16","2026-10-20"];
      for(let d of tryDates){
        let r=await getMatches(d);
        if(r.matches.length>0){data=r; used=d; break;}
      }
      if(data.matches.length===0){
        for(let off of offsets){
          let d=new Date(reqDate);
          d.setDate(d.getDate()+off);
          let iso=d.toISOString().split('T')[0];
          let r=await getMatches(iso);
          if(r.matches.length>0){data=r; used=iso; break;}
        }
      }
    }
    let out=data.matches.map(m=>{
      return{
        fixture:{id:m.id,berlinTime:toBerlin(m.time||m.date||"00:00"),status:{short:m.status||"NS"}},
        league:{name:m.league?.name||"League",country:m.league?.country?.name||m.league?.country||"World"},
        teams:{home:{name:m.home?.name||"Home"},away:{name:m.away?.name||"Away"}},
        goals:{home:m.score?.home??null,away:m.score?.away??null}
      }
    });
    // Big leagues top
    let big=["Champions","Europa","Premier","LaLiga","Bundesliga","Serie A","AFC","Copa"];
    out.sort((a,b)=>{
      let aB=big.some(x=>a.league.name.includes(x))?0:1;
      let bB=big.some(x=>b.league.name.includes(x))?0:1;
      return aB-bB;
    });
    return new Response(JSON.stringify({response:out,results:out.length,usedDate:used,requestedDate:reqDate,note:out.length>0&&used!==reqDate?`No data for ${reqDate}, showing nearest ${used}`:""}),{headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}});
  }catch(e){
    return new Response(JSON.stringify({response:[],results:0,error:e.message}),{headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}});
  }
}
