export async function onRequest(context) {
  const MY_KEY = "1002e16c0cc32859e846908c86dcc97833114b45950612d7cf7adef87f15f8ce";
  const API_KEY = context.env.LIVE_API_KEY || MY_KEY;

  const today = new Date().toISOString().split('T')[0];

  try {
    // Try with today's date first, then without date
    const urls = [
      `https://live-football-api.com/api/v1/matches?api_key=${API_KEY}&date=${today}&lang=en`,
      `https://live-football-api.com/api/v1/matches?api_key=${API_KEY}&lang=en`
    ];

    let raw = [];
    for (let url of urls) {
      try {
        const r = await fetch(url);
        const j = await r.json();
        let d = j.data || j.matches || j;
        if (!Array.isArray(d)) {
          let flat = [];
          if (d && typeof d === 'object') {
            Object.values(d).forEach(v => {
              if (Array.isArray(v)) flat = flat.concat(v);
              else if (v?.matches) flat = flat.concat(v.matches);
            });
          }
          d = flat.length > 0? flat : [];
        }
        if (d.length > 0) { raw = d; break; }
      } catch(e) { continue; }
    }

    if (raw.length === 0) throw new Error("No matches");

    // Convert time to EUROPE / Lagos time
    const toEuropeTime = (m) => {
      // API gives timestamp or date like "2026-10-12 14:00:00" or ISO
      let dateObj = null;
      if (m.timestamp) dateObj = new Date(m.timestamp * 1000);
      else if (m.date) dateObj = new Date(m.date.replace(' ', 'T'));
      else if (m.time && m.time.includes(':')) {
        // If only time, assume today
        const [h, min] = m.time.split(':');
        dateObj = new Date();
        dateObj.setHours(parseInt(h), parseInt(min||0), 0);
      }
      if (!dateObj || isNaN(dateObj)) return m.time || "00:00";

      // Format to Europe/Lagos time (WAT is UTC+1, CEST is UTC+2)
      // Show both in user's local
      return dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
    };

    const matches = raw.slice(0, 200).map((m, i) => {
      const st = (m.status || m.match_status || '').toString().toLowerCase();
      const isLive = st.includes('live') || st === '1' || st === 'in_progress' || m.minute || m.live;
      const isFinished = st.includes('finish') || st.includes('ft') || st === '3' || st === 'finished' || st === 'ft';

      let short = 'UPCOMING';
      if (isLive) short = 'LIVE';
      else if (isFinished) short = 'FT';

      // Europe time
      const europeTime = toEuropeTime(m);
      const display = isLive? (m.minute? `${m.minute}'` : 'LIVE') : (isFinished? 'FT' : europeTime);

      // Scores - check all possible fields
      const homeScore = m.home_score?? m.home_goals?? m.goals?.home?? m.score?.home?? m.result?.home?? null;
      const awayScore = m.away_score?? m.away_goals?? m.goals?.away?? m.score?.away?? m.result?.away?? null;

      // Europe first sort
      const country = (m.league?.country || m.country || '').toUpperCase();
      const isEurope = ['ENGLAND','SPAIN','ITALY','GERMANY','FRANCE','NETHERLANDS','PORTUGAL','TURKEY','ENGLAND'].includes(country) || ['GB','ES','IT','DE','FR'].includes(country);

      return {
        fixture: { id: m.id || i, time: europeTime, status: { short: short, display: display }, isEurope: isEurope },
        league: { name: m.league?.name || m.competition?.name || m.league_name || 'Football', country: m.league?.country || m.country || 'WORLD' },
        teams: { home: { name: m.home_team || m.home?.name || m.home_name || 'Home' }, away: { name: m.away_team || m.away?.name || m.away_name || 'Away' } },
        goals: { home: homeScore, away: awayScore }
      };
    });

    // Sort: Live first, then Europe leagues, then rest
    matches.sort((a,b)=>{
      if(a.fixture.status.short==='LIVE' && b.fixture.status.short!=='LIVE') return -1;
      if(b.fixture.status.short==='LIVE' && a.fixture.status.short!=='LIVE') return 1;
      if(a.fixture.isEurope &&!b.fixture.isEurope) return -1;
      if(b.fixture.isEurope &&!a.fixture.isEurope) return 1;
      return 0;
    });

    return new Response(JSON.stringify(matches), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=20" }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Access-Control-Allow-Origin": "*" } });
  }
}
