export async function onRequest(context) {
  const API_KEY = context.env.LIVE_API_KEY || "1002e16c0cc32859e846908c86dcc97833114b45950612d7cf7adef87f15f8ce";
  const today = new Date().toISOString().split('T')[0];

  try {
    const url = `https://www.live-football-api.com/api/v1/matches?api_key=${API_KEY}&date=${today}&lang=en`;
    const res = await fetch(url);
    const json = await res.json();

    let raw = json.data || json.matches || [];
    if (!Array.isArray(raw)) {
      let flat = [];
      Object.values(raw).forEach(v=>{
        if (Array.isArray(v)) flat=flat.concat(v);
        if (v && v.matches) flat=flat.concat(v.matches);
      });
      raw = flat;
    }

    if (raw.length===0) {
      return new Response(JSON.stringify({ msg:"No matches today", raw: json }), {
        headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}
      });
    }

    const matches = raw.slice(0,150).map((m,i)=>{
      // FIX: status can be number, so force to string
      const statusStr = String(m.status?? "").toLowerCase();
      const isLive = statusStr.includes('live') || statusStr==='1';
      const isFT = statusStr.includes('finish') || statusStr==='3' || statusStr==='ft';

      // Europe Time
      let europeTime = "00:00";
      try {
        if (m.timestamp) {
          const d = new Date(m.timestamp*1000);
          europeTime = d.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit', timeZone:'Europe/Berlin' });
        } else if (m.time) {
          if (m.time.includes('T')) {
            const d = new Date(m.time);
            europeTime = d.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit', timeZone:'Europe/Berlin' });
          } else {
            europeTime = String(m.time).slice(0,5);
            if (m.date) {
              const d = new Date(`${m.date}T${m.time}`);
              if (!isNaN(d)) europeTime = d.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit', timeZone:'Europe/Berlin' });
            }
          }
        }
      } catch(e){}

      return {
        fixture: {
          id: m.id || i,
          time: europeTime,
          status: { short: isLive?'LIVE':isFT?'FT':'UPCOMING', display: isLive? (m.minute? m.minute+"'" : 'LIVE') : isFT? 'FT' : europeTime }
        },
        league: { name: m.league?.name || m.league_name || 'Football', country: m.league?.country || m.country || 'WORLD' },
        teams: { home:{name: m.home_team || m.home?.name || 'Home'}, away:{name: m.away_team || m.away?.name || 'Away'} },
        goals: { home: m.home_score?? m.home_goals?? null, away: m.away_score?? m.away_goals?? null }
      };
    });

    return new Response(JSON.stringify(matches), {
      headers: { "Content-Type":"application/json", "Access-Control-Allow-Origin":"*", "Cache-Control":"public, max-age=600" }
    });

  } catch(e) {
    return new Response(JSON.stringify({ error: e.message, stack: e.stack }), { status:500, headers:{ "Access-Control-Allow-Origin":"*" } });
  }
}
