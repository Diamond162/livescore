export async function onRequest(c){
  const KEY=(c.env.HIGHLIGHTLY_API_KEY||'').trim();
  try{
    let date=new URL(c.request.url).searchParams.get('date') || new Date().toISOString().split('T')[0];
    let allMatches=[];

    // Fetch 500 at a time, get ALL pages
    for(let offset=0; offset<2000; offset+=500){
      let url=`https://soccer.highlightly.net/matches?date=${date}&limit=500&offset=${offset}`;
      let r=await fetch(url,{
        headers:{"x-rapidapi-key":KEY,"x-api-key":KEY,"x-rapidapi-host":"soccer.highlightly.net"}
      });
      let j=await r.json();
      let list=j.data||[];
      if(list.length===0) break;
      allMatches.push(...list);
      if(list.length<500) break; // last page
    }

    // Sort BIG leagues first like Flashscore
    const big=["Major League","Premier League","LaLiga","Bundesliga","Serie A","Ligue 1","Champions League","World Cup","Euro","MLS","Championship"];
    allMatches.sort((a,b)=>{
      let aBig=big.some(x=>(a.league?.name||"").includes(x))?0:1;
      let bBig=big.some(x=>(b.league?.name||"").includes(x))?0:1;
      return aBig-bBig;
    });

    let out=allMatches.map(m=>{
      let t="--:--"; try{t=new Date(m.date).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'});}catch{}
      let sc=m.score?.current||""; let gh=null,ga=null;
      if(sc.includes("-")){let p=sc.split("-"); gh=parseInt(p[0]); ga=parseInt(p[1]);}
      return{
        fixture:{id:m.id,berlinTime:t,status:{short:m.state?.description||"NS"}},
        league:{name:m.league?.name||"League",country:m.country?.name||"World"},
        teams:{home:{name:m.homeTeam?.name||"Home"},away:{name:m.awayTeam?.name||"Away"}},
        goals:{home:gh,away:ga,display:sc}
      }
    });

    return new Response(JSON.stringify({response:out,results:out.length,date}),{
      headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*","Cache-Control":"public, max-age=60"}
    });
  }catch(e){
    return new Response(JSON.stringify({response:[],error:e.message}),{headers:{"content-type":"application/json"}});
  }
}
