export async function onRequest(c){
  const url=new URL(c.request.url);
  const date=url.searchParams.get('date') || new Date().toISOString().split('T')[0];
  const KEY=(c.env.HIGHLIGHTLY_API_KEY||'').trim();
  const hasKey=!!KEY;

  if(url.searchParams.get('debug')){
    return new Response(JSON.stringify({hasKey,date,keyLength:KEY.length}),{headers:{"content-type":"application/json"}});
  }

  if(!hasKey){
    return new Response(JSON.stringify({response:[],results:0,date,error:"NO_API_KEY - Set HIGHLIGHTLY_API_KEY in Cloudflare Variables"}),{headers:{"content-type":"application/json"}});
  }

  try{
    let r=await fetch(`https://soccer.highlightly.net/matches?date=${date}&limit=500`,{
      headers:{"x-rapidapi-key":KEY,"x-api-key":KEY}
    });
    let txt=await r.text();
    let j={}; try{j=JSON.parse(txt)}catch{j={raw:txt.substring(0,300)}};
    let list=j.data||[];

    let out=list.map(m=>{
      let t="--:--"; try{t=new Date(m.date).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'});}catch{}
      return{
        fixture:{id:m.id,berlinTime:t,status:{short:m.state?.description||"NS"}},
        league:{name:m.league?.name||"League",country:m.country?.name||"World"},
        teams:{home:{name:m.homeTeam?.name||"Home"},away:{name:m.awayTeam?.name||"Away"}},
        goals:{display:m.score?.current||"-:-"}
      }
    });

    return new Response(JSON.stringify({response:out,results:out.length,date,debug:{status:r.status,rawLength:txt.length}}),{headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}});
  }catch(e){
    return new Response(JSON.stringify({response:[],results:0,date,error:e.message}),{headers:{"content-type":"application/json"}});
  }
}
