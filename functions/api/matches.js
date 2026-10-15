export async function onRequest(context) {
  const url = new URL(context.request.url);
  let date = url.searchParams.get('date') || '2026-10-14';
  const KEY = (context.env.LIVE_FOOTBALL_API_KEY || '').trim();
  const toBerlin = (iso) => { try{ return new Date(iso).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'});}catch{return '--:--';} };

  if(!KEY) return new Response(JSON.stringify({response:[], error:"No KEY"}), {headers:{"content-type":"application/json"}});

  try{
    // Correct per docs
    let endpoint = `https://live-football-api.com/api/v1/matches?api_key=${KEY}&date=${date}&lang=en`;
    let res = await fetch(endpoint);
    let json = await res.json();
    let matches = json.matches || json.data || [];

    if(matches.length===0){
      // Try live without date filter - get any live matches for today 2026-10-14
      let endpoint2 = `https://live-football-api.com/api/v1/matches?api_key=${KEY}&lang=en`;
      let res2 = await fetch(endpoint2);
      let json2 = await res2.json();
      matches = json2.matches || [];
    }

    let out = matches.map(item=>({
      fixture:{id:item.id, berlinTime:toBerlin(item.kickoff||item.date||date+'T19:00:00Z'), status:{short:String(item.status||'NS')}},
      league:{name:item.league?.name||'League', country:item.league?.country||'World', fullName:`${item.league?.country||'World'} - ${item.league?.name||'League'}`},
      teams:{home:{name:item.home?.name||item.home_team?.name||'Home'}, away:{name:item.away?.name||item.away_team?.name||'Away'}},
      goals:{display: (item.status==='Live'||item.status==='Finished'||item.status==='FT')? `${item.score?.home??0}-${item.score?.away??0}` : '-:-'}
    }));

    return new Response(JSON.stringify({response:out, results:out.length, date, endpoint:date, api_credits:json.credits_left||json.credits||'check dashboard'}), {headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}});
  }catch(e){
    return new Response(JSON.stringify({response:[], error:e.message, date}), {headers:{"content-type":"application/json"}});
  }
}
