export async function onRequest(c){
  const KEY=(c.env.HIGHLIGHTLY_API_KEY||'').trim();
  try{
    let date=new URL(c.request.url).searchParams.get('date') || new Date().toISOString().split('T')[0];

    // Try soccer host first, then sports host
    let urls=[
      `https://soccer.highlightly.net/matches?date=${date}&limit=500`,
      `https://sports.highlightly.net/football/matches?date=${date}&limit=500`
    ];

    let all=[];
    for(let u of urls){
      let r=await fetch(u,{
        headers:{
          "x-rapidapi-key":KEY,
          "x-api-key":KEY,
          "x-rapidapi-host":"soccer.highlightly.net"
        }
      });
      let j=await r.json();
      let list=j.data||[];
      if(list.length>0){ all=list; break; }
    }

    let out=all.map(m=>{
      let t="--:--"; try{t=new Date(m.date).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'});}catch{}
      let sc=m.score?.current||"";
      let gh=null,ga=null;
      if(sc.includes("-")){let p=sc.split("-"); gh=parseInt(p[0]); ga=parseInt(p[1]);}
      return{
        fixture:{id:m.id,berlinTime:t,status:{short:m.state?.description||"NS"}},
        league:{name:m.league?.name||"League",country:m.country?.name||"World"},
        teams:{home:{name:m.homeTeam?.name||"Home"},away:{name:m.awayTeam?.name||"Away"}},
        goals:{home:gh,away:ga,display:sc}
      }
    });

    return new Response(JSON.stringify({response:out,results:out.length,date}),{
      headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}
    });
  }catch(e){
    return new Response(JSON.stringify({response:[],error:e.message}),{headers:{"content-type":"application/json"}});
  }
}
