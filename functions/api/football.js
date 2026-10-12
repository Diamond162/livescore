export async function onRequest(context){
  const url=new URL(context.request.url);
  const dateInput=url.searchParams.get('date')||new Date().toISOString().slice(0,10);
  // FotMob needs YYYYMMDD
  const yyyymmdd=dateInput.replace(/-/g,'');
  try{
    const res=await fetch(`https://www.fotmob.com/api/data/matches?date=${yyyymmdd}`,{
      headers:{
        'User-Agent':'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        'Accept':'application/json',
        'Referer':'https://www.fotmob.com/'
      }
    });
    const data=await res.json();
    // data.leagues = [{name, ccode, matches:[{id,time,home,away,status}] }]
    let flat=[];
    if(data.leagues){
      data.leagues.forEach(lg=>{
        (lg.matches||[]).forEach(m=>{
          flat.push({
            fixture:{
              id:m.id,
              date:m.status?.utcTime||new Date().toISOString(),
              status:{
                short:m.status?.finished?'FT':(m.status?.started?'LIVE':'NS'),
                elapsed:m.status?.liveTime?.short||null
              }
            },
            league:{
              id:lg.primaryId,
              name:lg.name,
              country:lg.ccode||'INT',
              flag:lg.ccode
            },
            teams:{
              home:{id:m.home?.id,name:m.home?.name||m.home?.longName,logo:`https://images.fotmob.com/image_resources/logo/teamlogo/${m.home?.id}.png`},
              away:{id:m.away?.id,name:m.away?.name||m.away?.longName,logo:`https://images.fotmob.com/image_resources/logo/teamlogo/${m.away?.id}.png`}
            },
            goals:{
              home:m.home?.score!=null?m.home.score:null,
              away:m.away?.score!=null?m.away.score:null
            },
            score:{fulltime:{home:m.home?.score,away:m.away?.score}},
            status:m.status
          });
        });
      });
    }
    // If FotMob returns empty, keep flat empty -> index will show fallback screenshot style
    return new Response(JSON.stringify({response:flat, date:dateInput, source:'fotmob'}),{
      headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Cache-Control":"no-cache"}
    });
  }catch(e){
    return new Response(JSON.stringify({response:[], error:e.message}),{
      headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}
    });
  }
}
