export async function onRequest(c){
  const url=new URL(c.request.url);
  const date=url.searchParams.get('date') || new Date().toISOString().split('T')[0];
  const KEY=(c.env.HIGHLIGHTLY_API_KEY||'').trim();

  if(!KEY){
    return new Response(JSON.stringify({response:[],results:0,error:"NO_KEY_SET"}),{headers:{"content-type":"application/json"}});
  }

  try{
    // CORRECT endpoint for your key type
    let apiUrl=`https://soccer.highlightly.net/matches?date=${date}&limit=500`;

    let r=await fetch(apiUrl,{
      headers:{
        "x-api-key": KEY,
        "Content-Type": "application/json"
      }
    });

    let txt=await r.text();
    let j={};
    try{ j=JSON.parse(txt); }catch(e){ j={parseError:txt.substring(0,500)}; }

    // Highlightly returns {data: [...]} or {matches: [...]}
    let list=j.data || j.matches || [];

    let out=list.map(m=>{
      let t="--:--";
      try{ t=new Date(m.date).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'}); }catch{}
      return{
        fixture:{id:m.id,berlinTime:t,status:{short:m.state?.description||m.status||"NS"}},
        league:{name:m.league?.name||"League",country:m.country?.name||"World"},
        teams:{home:{name:m.homeTeam?.name||"Home"},away:{name:m.awayTeam?.name||"Away"}},
        goals:{display:m.score?.current||m.score||"-:-"}
      }
    });

    return new Response(JSON.stringify({
      response:out,
      results:out.length,
      date,
      debug:{status:r.status, used: list.length>0}
    }),{headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}});

  }catch(e){
    return new Response(JSON.stringify({response:[],results:0,date,error:e.message}),{headers:{"content-type":"application/json"}});
  }
}
