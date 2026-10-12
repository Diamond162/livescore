export async function onRequest(context) {
  const KEY = "1002e16c0cc32859e846908c86dcc97833114b45950612d7cf7adef87f15f8ce";
  const today = new Date().toISOString().split('T')[0];

  try {
    const res = await fetch(`https://www.live-football-api.com/api/v1/matches?api_key=${KEY}&date=${today}&lang=en`);
    const json = await res.json();
    let matches = json.data?.matches || json.data || [];

    if (Array.isArray(matches) && matches[0]?.matches) {
      let flat = [];
      matches.forEach(l => {
        (l.matches||[]).forEach(m => flat.push({...m, _league:l.name||l.league_name, _country:l.country}));
      });
      matches = flat;
    }

    const result = matches.map((m,i)=>{
      const home = m.home_team || m.home?.name || m.match_hometeam_name || m.home_name || "";
      const away = m.away_team || m.away?.name || m.match_awayteam_name || m.away_name || "";
      if(!home || home==="Home") return null;

      let timeBerlin = m.match_time || m.time || "00:00";
      try{
        if(/^\d{2}:\d{2}$/.test(timeBerlin)){
          const d = new Date(`${today}T${timeBerlin}:00Z`);
          timeBerlin = d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'});
        }
      }catch{}

      return {
        fixture:{ id:m.match_id||m.id||i, time:timeBerlin, status:{short:m.match_status||m.status||"UPCOMING", display:m.match_status||timeBerlin} },
        league:{ name:m._league||m.league_name||m.league?.name||"Football", country:m._country||m.country||"" },
        teams:{ home:{name:home}, away:{name:away} },
        goals:{ home:m.match_hometeam_score??m.home_score??null, away:m.match_awayteam_score??m.away_score??null }
      };
    }).filter(Boolean);

    return new Response(JSON.stringify(result), {
      headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Cache-Control":"public, max-age=60"}
    });
  } catch(e){
    return new Response(JSON.stringify({error:e.message}), {headers:{"Access-Control-Allow-Origin":"*"}});
  }
}
