export async function onRequest(context) {
  const API_KEY = context.env.LIVE_API_KEY || "1002e16c0cc32859e846908c86dcc97833114b45950612d7cf7adef87f15f8ce";
  const today = new Date().toISOString().split('T')[0];

  try {
    // Use www. as shown in your playground
    const urlsToTry = [
      `https://www.live-football-api.com/api/v1/matches?api_key=${API_KEY}&date=${today}&lang=en`,
      `https://www.live-football-api.com/api/v1/matches?api_key=${API_KEY}&lang=en`,
      `https://live-football-api.com/api/v1/matches?api_key=${API_KEY}&date=${today}&lang=en`
    ];

    let raw = [];
    let usedUrl = "";

    for (let url of urlsToTry) {
      try {
        const r = await fetch(url);
        const j = await r.json();
        if (j.success === false) continue; // try next
        let data = j.data || j.matches || j;
        if (!Array.isArray(data)) {
          let flat = [];
          Object.values(data).forEach(v=>{
            if (Array.isArray(v)) flat=flat.concat(v);
            if (v && v.matches) flat=flat.concat(v.matches);
          });
          data = flat;
        }
        if (data.length > 0) { raw = data; usedUrl = url; break; }
      } catch(e){ continue; }
    }

    if (raw.length === 0) throw new Error("No matches - check Request Logs page");

    const matches = raw.slice(0,150).map((m,i)=>{
      // EUROPE TIME FIX - try all fields
      let europeTime = "00:00";
      let dateObj = null;

      if (m.timestamp) dateObj = new Date(m.timestamp*1000);
      else if (m.time && m.time.includes('T')) dateObj = new Date(m.time);
      else if (m.date_time) dateObj = new Date(m.date_time);
      else if (m.datetime) dateObj = new Date(m.datetime);
      else if (m.date && m.time) {
        // m.date = "2026-10-12", m.time = "19:45:00"
        dateObj = new Date(`${m.date}T${m.time}`);
      } else if (m.time && /^\d{2}:\d{2}/.test(m.time)) {
        europeTime = m.time.slice(0,5);
      }

      if (dateObj &&!isNaN(dateObj)) {
        europeTime = dateObj.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit', timeZone:'Europe/Berlin' });
      }

      const st = (m.status || "").toLowerCase();
      const isLive = st.includes('live');
      const isFT = st.includes('finish') || st==='ft';

      return {
        fixture: {
          id: m.id || i,
          time: europeTime,
          status: {
            short: isLive? 'LIVE' : isFT? 'FT' : 'UPCOMING',
            display: isLive? (m.minute? m.minute+"'" : 'LIVE') : isFT? 'FT' : europeTime
          }
        },
        league: { name: m.league?.name || m.league_name || 'Football', country: m.league?.country || m.country || 'WORLD' },
        teams: { home:{name: m.home_team || m.home_name || 'Home'}, away:{name: m.away_team || m.away_name || 'Away'} },
        goals: { home: m.home_score?? m.home_goals?? null, away: m.away_score?? m.away_goals?? null }
      };
    });

    return new Response(JSON.stringify(matches), {
      headers: { "Content-Type":"application/json", "Access-Control-Allow-Origin":"*", "Cache-Control":"public, max-age=600" }
    });

  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), { status:500, headers:{ "Access-Control-Allow-Origin":"*" } });
  }
}
