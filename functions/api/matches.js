export async function onRequest(c){
  const KEY=(c.env.HIGHLIGHTLY_API_KEY||'').trim();
  function toBerlin(t){try{if(!t)return"00:00";if(/^\d{2}:\d{2}/.test(t))return t.slice(0,5);return new Date(t).toLocaleTimeString('en-GB',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit'});}catch{return"00:00";}}
  try{
    let date=new URL(c.request.url).searchParams.get('date')||"2026-06-11";
    let r=await fetch(`https://soccer.highlightly.net/matches?date=${date}`,{headers:{"x-api-key":KEY}});
    let j=await r.json();
    let list=j.data||j.matches||j||[];
    if(!Array.isArray(list)) list=Object.values(j).find(v=>Array.isArray(v))||[];
    let out=list.map(m=>({fixture:{id:m.id,berlinTime:toBerlin(m.date||m.time||""),status:{short:m.status||"NS"}},league:{name:m.league?.name||"League",country:m.league?.country||"World"},teams:{home:{name:m.homeTeam?.name||m.home?.name||"Home"},away:{name:m.awayTeam?.name||m.away?.name||"Away"}},goals:{home:m.homeTeam?.score??null,away:m.awayTeam?.score??null}}));
    let big=["Premier","LaLiga","Bundesliga","Serie A","Champions","World Cup","Europa"];
    out.sort((a,b)=>{let sa=big.some(x=>a.league.name.includes(x))?0:1;let sb=big.some(x=>b.league.name.includes(x))?0:1;return sa-sb;});
    return new Response(JSON.stringify({response:out,results:out.length,usedDate:date}),{headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}});
  }catch(e){return new Response(JSON.stringify({response:[],results:0,error:e.message}),{headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}});}
}
