export async function onRequest(c){
  const url=new URL(c.request.url);
  const date=url.searchParams.get('date') || new Date().toISOString().split('T')[0];
  const KEY=(c.env.HIGHLIGHTLY_API_KEY||'').trim();
  if(!KEY) return new Response(JSON.stringify({response:[],results:0}),{headers:{"content-type":"application/json"}});
  try{
    let all=[];
    for(let p=0;p<3;p++){
      let r=await fetch(`https://soccer.highlightly.net/matches?date=${date}&limit=100&offset=${p*100}`,{headers:{"x-rapidapi-key":KEY,"x-rapidapi-host":"soccer.highlightly.net","x-api-key":KEY}});
      let t=await r.text(); let j={}; try{j=JSON.parse(t);}catch{continue;}
      let list=j.data||j.matches||[]; if(!list.length) break; all=all.concat(list);
    }
    all.sort((a,b)=>new Date(a.date)-new Date(b.date));
    let out=all.map(m=>{
      let berlin="--:--"; try{berlin=new Date(m.date).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'});}catch{}
      return{fixture:{id:m.id,berlinTime:berlin,status:{short:m.state?.description||"NS"}},league:{name:m.league?.name||"League",country:m.country?.name||"World",fullName:`${m.country?.name||'World'} - ${m.league?.name||'League'}`},teams:{home:{name:m.homeTeam?.name||"Home"},away:{name:m.awayTeam?.name||"Away"}},goals:{display:m.score?.current||"-:-"}};
    });
    return new Response(JSON.stringify({response:out,results:out.length,date}),{headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}});
  }catch(e){
    return new Response(JSON.stringify({response:[],results:0,error:e.message}),{headers:{"content-type":"application/json"}});
  }
}
