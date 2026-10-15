export async function onRequest(c){
  const url=new URL(c.request.url);
  const date=url.searchParams.get('date') || "2025-10-15";
  const KEY=(c.env.HIGHLIGHTLY_API_KEY||'').trim();
  if(!KEY) return new Response(JSON.stringify({response:[],results:0}),{headers:{"content-type":"application/json"}});
  try{
    let allMatches=[];
    for(let page=0; page<2; page++){
      let r=await fetch(`https://soccer.highlightly.net/matches?date=${date}&limit=100&offset=${page*100}`,{
        headers:{"x-rapidapi-key":KEY,"x-rapidapi-host":"soccer.highlightly.net","x-api-key":KEY}
      });
      let j={}; try{ j=JSON.parse(await r.text()); }catch{ continue; }
      let list=j.data||j.matches||[];
      if(!list.length) break;
      allMatches=allMatches.concat(list);
    }
    allMatches=allMatches.slice(0,150);
    let out=allMatches.map(m=>{
      let t="--:--"; try{ t=new Date(m.date).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'});}catch{}
      return{fixture:{id:m.id,berlinTime:t,status:{short:m.state?.description||"NS"}},league:{name:m.league?.name||"League",country:m.country?.name||"World"},teams:{home:{name:m.homeTeam?.name||"Home"},away:{name:m.awayTeam?.name||"Away"}},goals:{display:m.score?.current||"-:-"}}
    });
    return new Response(JSON.stringify({response:out,results:out.length,date}),{headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}});
  }catch(e){
    return new Response(JSON.stringify({response:[],results:0,error:e.message}),{headers:{"content-type":"application/json"}});
  }
}
