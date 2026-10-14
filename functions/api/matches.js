export async function onRequest(context) {
  const url = new URL(context.request.url);
  let dateParam = url.searchParams.get('date') || 'today';
  const todayStr = new Date().toISOString().split('T')[0];
  function toYYYYMMDD(d){return d.toISOString().split('T')[0];}
  let targetDate = todayStr;
  if(dateParam==='yesterday'){let d=new Date();d.setDate(d.getDate()-1);targetDate=toYYYYMMDD(d);}
  else if(dateParam==='tomorrow'){let d=new Date();d.setDate(d.getDate()+1);targetDate=toYYYYMMDD(d);}
  else if(/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) targetDate=dateParam;
  else if(dateParam==='today') targetDate=todayStr;
  else targetDate=todayStr;

  const API_KEY = context.env.API_FOOTBALL_KEY || context.env.FOOTBALL_API_KEY || '';

  async function fetchAPI(u){
    const r = await fetch(u,{headers:{'x-apisports-key':API_KEY}});
    const j = await r.json();
    return j;
  }

  let finalResponse = [];
  let debug = {keySet:!!API_KEY, targetDate};

  if(!API_KEY){
    return new Response(JSON.stringify({response:[], error:"API_KEY not set in Cloudflare env"}),{headers:{"Content-Type":"application/json"}});
  }

  // 1. Try date
  let j1 = await fetchAPI(`https://v3.football.api-sports.io/fixtures?date=${targetDate}`);
  debug.dateCount = (j1.response||[]).length;
  debug.api_errors = j1.errors;
  finalResponse = j1.response||[];

  // 2. If empty, try LIVE
  if(finalResponse.length===0){
    let jLive = await fetchAPI(`https://v3.football.api-sports.io/fixtures?live=all`);
    debug.liveCount = (jLive.response||[]).length;
    finalResponse = jLive.response||[];
  }

  const norm = finalResponse.map(f=>{
    const fix=f.fixture||{}; const sts=fix.status||{};
    return {
      fixture:{id:fix.id,date:fix.date,status:{short:sts.short||'NS',long:sts.long||'Not Started',elapsed:sts.elapsed??null}},
      league:{name:f.league?.name||'League',country:f.league?.country||'WORLD'},
      teams:{home:{name:f.teams?.home?.name||'Home'},away:{name:f.teams?.away?.name||'Away'}},
      goals:{home:f.goals?.home??null,away:f.goals?.away??null}
    };
  });

  return new Response(JSON.stringify({response:norm, debug:debug}),{
    headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Cache-Control":"public, max-age=15"}
  });
}
