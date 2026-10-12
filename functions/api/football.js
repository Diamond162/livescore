export async function onRequest(context) {
  const KEY = context.env.LIVE_API_KEY || "1002e16c0cc32859e846908c86dcc97833114b45950612d7cf7adef87f15f8ce";
  const today = new Date().toISOString().split('T')[0];

  try {
    const apiUrl = `https://live-football-api.com/api/v1/matches?api_key=${KEY}&date=${today}&lang=en`;
    const res = await fetch(apiUrl, { headers: { "Accept": "application/json" } });
    const json = await res.json();

    let raw = json.data || json.matches || json.result || [];
    // If data is { matches: [...] } or grouped by league
    if (raw && raw.matches) raw = raw.matches;
    if (!Array.isArray(raw)) {
      let flat = [];
      Object.values(raw).forEach(v => {
        if (Array.isArray(v)) flat = flat.concat(v);
        else if (v && Array.isArray(v.matches)) flat = flat.concat(v.matches);
      });
      raw = flat;
    }

    const toEurope = (m) => {
      // Try all possible time fields
      let t = m.kickoff_time || m.time || m.start_time || m.utcTime || m.date_time || m.datetime || m.match_time || "";
      let d = m.date || m.match_date || today;

      // If t is full ISO like 2026-10-12T15:00:00Z
      if (t && t.includes('T')) {
        const dateObj = new Date(t);
        return dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
      }
      // If t is "15:00" or "15:00:00"
      if (t && /^\d{2}:\d{2}/.test(t)) return t.slice(0,5);

      // If m has timestamp
      if (m.timestamp) {
        const dateObj = new Date(m.timestamp * 1000);
        return dateObj.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit', timeZone:'Europe/Berlin' });
      }

      // Try to build from date + time
      if (d && t) {
        try {
          const dateObj = new Date(`${d}T${t}`);
          if (!isNaN(dateObj)) return dateObj.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit', timeZone:'Europe/Berlin' });
        } catch(e){}
      }

      // Fallback: use scheduled or utcTime
      if (m.scheduled) return m.scheduled.slice(0,5);
      if (m.utcTime) {
        try {
          return new Date(m.utcTime).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit', timeZone:'Europe/Berlin' });
        } catch(e){}
      }

      return t || "15:00"; // default not 00:00
    };

    const matches = raw.slice(0,200).map((m,i)=>{
      const statusRaw = (m.status || m.match_status || m.state || "").toString().toLowerCase();
      const isLive = statusRaw.includes('live') || statusRaw==='in_play' || m.live || m.minute;
      const isFT = statusRaw.includes('finish') || statusRaw==='ft' || statusRaw==='finished' || statusRaw==='3';

      const europeTime = toEurope(m);
      let short = isLive? 'LIVE' : isFT? 'FT' : 'UPCOMING';
      let display = isLive? (m.minute? `${m.minute}'` : 'LIVE') : isFT? 'FT' : europeTime;

      // Scores - check every field
      const homeScore = m.home_score?? m.home_goals?? m.homeScore?? m.score?.home?? m.goals?.home?? m.teams?.home?.score?? null;
      const awayScore = m.away_score?? m.away_goals?? m.awayScore?? m.score?.away?? m.goals?.away?? m.teams?.away?.score?? null;

      return {
        fixture: { id: m.id || m.match_id || i, time: europeTime, status: { short, display } },
        league: { name: m.league?.name || m.league_name || m.competition?.name || m.tournament || 'Football', country: m.league?.country || m.country || m.ccode || 'WORLD' },
        teams: { home: { name: m.home_team || m.home_name || m.home?.name || m.teams?.home?.name || 'Home' }, away: { name: m.away_team || m.away_name || m.away?.name || m.teams?.away?.name || 'Away' } },
        goals: { home: homeScore, away: awayScore }
      };
    });

    matches.sort((a,b)=> a.fixture.status.short==='LIVE'? -1 : 1);

    return new Response(JSON.stringify(matches), {
      headers: { "Content-Type":"application/json", "Access-Control-Allow-Origin":"*", "Cache-Control":"no-cache" }
    });

  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), { status:500, headers:{ "Access-Control-Allow-Origin":"*" } });
  }
}
