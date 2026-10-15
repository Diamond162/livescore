export async function onRequest(c){
  const KEY=(c.env.HIGHLIGHTLY_API_KEY||'').trim();
  try{
    let dateParam=new URL(c.request.url).searchParams.get('date');
    // If user asks 2026-06-11 but no data, try TODAY
    let date=dateParam||new Date().toISOString().split('T')[0];
    let url=`https://soccer.highlightly.net/matches?date=${date}&limit=50`;

    // Highlightly needs BOTH headers (works for direct + RapidAPI)
    let r=await fetch(url,{
      headers:{
        "x-rapidapi-key":KEY,
        "x-api-key":KEY
      }
    });
    let text=await r.text();
    let j;
    try{ j=JSON.parse(text); }catch{ j={raw:text}; }

    // If empty, try yesterday (more games)
    if((!j.data||j.data.length===0) && date===dateParam){
      let y=new Date(); y.setDate(y.getDate()-1);
      let date2=y.toISOString().split('T')[0];
      let r2=await fetch(`https://soccer.highlightly.net/matches?date=${date2}&limit=50`,{headers:{"x-rapidapi-key":KEY,"x-api-key":KEY}});
      let j2=await r2.json();
      if(j2.data&&j2.data.length>0){ j=j2; date=date2; }
    }

    let list=j.data||j.matches||[];
    let out=list.map(m=>{
      // From docs: m.date, m.country.name, m.league.name, m.homeTeam.name, m.state, m.score.current
      let t="00:00"; try{ t=new Date(m.date).toLocaleTimeString('en-GB',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit'}); }catch{}
      let score=m.score?.current||""; let gh=null,ga=null;
      if(score && score.includes("-")){ let p=score.split("-"); gh=parseInt(p[0].trim()); ga=parseInt(p[1].trim()); }
      return{
        fixture:{id:m.id,berlinTime:t,status:{short:m.state?.description||"NS"}},
        league:{name:m.league?.name||"League",country:m.country?.name||m.league?.name||"World"},
        teams:{home:{name:m.homeTeam?.name||"Home"},away:{name:m.awayTeam?.name||"Away"}},
        goals:{home:gh,away:ga,display:score}
      }
    });

    return new Response(JSON.stringify({response:out,results:out.length,usedDate:date,debug:{status:r.status,total:j.pagination?.totalCount||0}}),{headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}});
  }catch(e){
    return new Response(JSON.stringify({response:[],results:0,error:e.message}),{headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}});
  }
}
