export async function onRequest(c){
  const url=new URL(c.request.url);
  const date=url.searchParams.get('date') || "2025-10-15";
  const KEY=(c.env.HIGHLIGHTLY_API_KEY||'').trim();

  if(!KEY){
    return new Response(JSON.stringify({response:[],results:0,error:"NO_KEY"}),{headers:{"content-type":"application/json"}});
  }

  try{
    let r=await fetch(`https://soccer.highlightly.net/matches?date=${date}&limit=500`,{
      headers:{
        "x-rapidapi-key": KEY,
        "x-rapidapi-host": "soccer.highlightly.net",
        "x-api-key": KEY
      }
    });

    let txt=await r.text();
    let j={}; try{ j=JSON.parse(txt); }catch{ j={raw:txt} }
    let list=j.data||j.matches||[];

    let out=list.map(m=>{
      let t="--:--"; try{ t=new Date(m.date).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'});}catch{}
      return{
        fixture:{id:m.id,berlinTime:t,status:{short:m.state?.description||"NS"}},
        league:{name:m.league?.name||"League",country:m.country?.name||"World"},
        teams:{home:{name:m.homeTeam?.name||"Home"},away:{name:m.awayTeam?.name||"Away"}},
        goals:{display:m.score?.current||"-:-"}
      }
    });

    return new Response(JSON.stringify({response:out,results:out.length,date,debug:{status:r.status,raw:txt.substring(0,250)}}),{
      headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}
    });
  }catch(e){
    return new Response(JSON.stringify({response:[],results:0,error:e.message}),{headers:{"content-type":"application/json"}});
  }
}
