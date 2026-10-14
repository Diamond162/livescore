export async function onRequest(context) {
  const url = new URL(context.request.url);
  let dateParam = url.searchParams.get('date') || 'today';
  const todayStr = new Date().toISOString().split('T')[0];
  function toYYYYMMDD(d){return d.toISOString().split('T')[0];}
  let targetDate = todayStr;
  if(dateParam==='yesterday'){let d=new Date();d.setDate(d.getDate()-1);targetDate=toYYYYMMDD(d);}
  else if(dateParam==='tomorrow'){let d=new Date();d.setDate(d.getDate()+1);targetDate=toYYYYMMDD(d);}
  else if(/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) targetDate=dateParam;

  const API_KEY = context.env.API_FOOTBALL_KEY || context.env.FOOTBALL_API_KEY || '';

  if(!API_KEY){
    return new Response(JSON.stringify({response:[], error:"NO KEY - Add API_FOOTBALL_KEY in Cloudflare Pages > Settings > Env variables"}),{headers:{"Content-Type":"application/json"}});
  }

  async function callAPI(apiUrl){
    const res = await fetch(apiUrl,{headers:{'x-apisports-key':API_KEY}});
    const json = await res.json();
    return json;
  }

  // TRY DATE FIRST
  let data = await callAPI(`https://v3.football.api-sports.io/fixtures?date=${targetDate}`);
  let list = data.response||[];

  // IF TODAY EMPTY (like your screenshot 2026-10-14) → GET LIVE GAMES
  if(list.length===0){
    let liveData = await callAPI(`https://v3.football.api-sports.io/fixtures?live=all`);
    list = liveData.response||[];
    // If live also empty, try current real date 2026-05-13
    if(list.length===0){
      let realToday = new Date().toISOString().split('T')[0];
      let realData = await callAPI(`https://v3.football.api-sports.io/fixtures?date=${realToday}`);
      list = realData.response||[];
    }
  }

  const norm = list.map(f=>{
    const fix=f.fixture||{}; const sts=fix.status||{};
    return {
      fixture:{id:fix.id,date:fix.date,status:{short:sts.short||'NS',long:sts.long||'Not Started',elapsed:sts.elapsed??null}},
      league:{name:f.league?.name||'League',country:f.league?.country||'WORLD'},
      teams:{home:{name:f.teams?.home?.name||'Home'},away:{name:f.teams?.away?.name||'Away'}},
      goals:{home:f.goals?.home??null,away:f.goals?.away??null}
    };
  });

  return new Response(JSON.stringify({response:norm, results:norm.length, date:targetDate, usedLive:norm.length>0 && data.response?.length===0}),{
    headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Cache-Control":"no-cache"}
  });
}
