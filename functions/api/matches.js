export async function onRequest(c){
  const K=(c.env.FOOTBALL_API_KEY||'').trim();
  const toBerlin=(u)=>{try{return new Date(u).toLocaleTimeString('en-GB',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit',hour12:false});}catch{return "00:00"}};
  try{
    let urlObj=new URL(c.request.url);
    let date=urlObj.searchParams.get('date')||new Date().toISOString().split('T')[0];
    let apiUrl=`https://live-football-api.com/api/v1/matches?api_key=${K}&date=${date}&lang=en`;
    let r=await fetch(apiUrl);
    let j=await r.json();
    let list=j.matches||j.data?.matches||[];
    let out=list.map(m=>{
      let st=typeof m.status==='string'?m.status:(m.status?.name||m.status?.short||"NS");
      return{
        fixture:{id:m.id,berlinTime:m.time||toBerlin(m.date||m.datetime),status:{short:st},minute:m.minute||""},
        league:{name:m.league?.name||m.competition||"League",country:m.league?.country||""},
        teams:{home:{name:m.home?.name||"Home"},away:{name:m.away?.name||"Away"}},
        goals:{home:m.score?.home??m.home_score??null,away:m.score?.away??m.away_score??null}
      }
    });
    return new Response(JSON.stringify({response:out,results:out.length,api_raw:date}),{headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}});
  }catch(e){
    return new Response(JSON.stringify({response:[],results:0,error:e.message}),{headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}});
  }
}
