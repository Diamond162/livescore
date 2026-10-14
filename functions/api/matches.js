export async function onRequest(context) {
  const KEY = (context.env.LIVE_FOOTBALL_API_KEY || '').trim();
  const reqUrl = new URL(context.request.url);
  let filter = (reqUrl.searchParams.get('date') || 'all').toLowerCase();

  const today = new Date();
  const fmt = d => d.toISOString().split('T')[0];
  const getDate = (off) => { const d = new Date(today); d.setDate(d.getDate()+off); return fmt(d); };

  let dates = filter === 'all'? [getDate(-1), getDate(0), getDate(1)] :
              filter === 'yesterday'? [getDate(-1)] :
              filter === 'tomorrow'? [getDate(1)] :
              filter === 'today'? [getDate(0)] :
              /^\d{4}-\d{2}-\d{2}$/.test(filter)? [filter] : [getDate(0)];

  const TOP = ['champions league','europa league','premier league','la liga','bundesliga','serie a','ligue 1','championship','pro league','uefa','afc'];

  const priority = (name) => {
    const n = (name||'').toLowerCase();
    for(let i=0;i<TOP.length;i++) if(n.includes(TOP[i])) return i;
    if(n.includes('europe:')) return 1;
    if(n.includes('england:')) return 5;
    return 999;
  };

  try {
    const allData = await Promise.all(dates.map(async date => {
      const r = await fetch(`https://live-football-api.com/api/v1/matches?date=${date}&api_key=${KEY}`);
      const j = await r.json();
      return j.matches || [];
    }));

    let flat = [].concat(...allData);
    const seen = new Set();
    flat = flat.filter(m => { const id=String(m.id); if(seen.has(id)) return false; seen.add(id); return true; });

    let formatted = flat.map(m => {
      const st = String(m.status||'').toLowerCase();
      const short = st==='live'?'LIVE': st==='finished'?'FT': 'NS';

      // FIX TIME - live-football gives kickoff like "2026-05-13T19:00:00Z"
      let kickoff = m.kickoff || m.date || m.time || '';
      let berlinTime = '21:00';
      try {
        if(kickoff){
          const d = new Date(kickoff);
          if(!isNaN(d)) berlinTime = d.toLocaleTimeString('en-GB', {timeZone:'Europe/Berlin', hour:'2-digit', minute:'2-digit'});
        }
      } catch(e){}

      // FIX SCORE - check all possible fields
      let hs = m.score?.home?? m.scores?.home?? m.home_score?? m.homeScore?? m.goals?.home?? null;
      let as = m.score?.away?? m.scores?.away?? m.away_score?? m.awayScore?? m.goals?.away?? null;
      // Sometimes score is string "2-1"
      if(typeof m.score === 'string' && m.score.includes('-')){
        const parts = m.score.split('-'); hs = parseInt(parts[0]); as = parseInt(parts[1]);
      }

      return {
        fixture: { id: m.id, date: kickoff, berlinTime, status: { short, long: m.status }, minute: m.minute || null },
        league: { name: m.league?.name || 'Other', country: m.league?.country || '', logo: m.league?.logo || '' },
        teams: { home: { name: m.home?.name || 'Home' }, away: { name: m.away?.name || 'Away' } },
        goals: { home: hs, away: as },
        status: m.status,
        priority: priority(m.league?.name || ''),
        _rawDate: m._fetchDate
      };
    });

    formatted.sort((a,b) => {
      if(a.fixture.status.short==='LIVE' && b.fixture.status.short!=='LIVE') return -1;
      if(b.fixture.status.short==='LIVE' && a.fixture.status.short!=='LIVE') return 1;
      if(a.priority!==b.priority) return a.priority - b.priority;
      return a.fixture.berlinTime.localeCompare(b.fixture.berlinTime);
    });

    // If yesterday filter, keep only FT. If tomorrow, keep only NS.
    return new Response(JSON.stringify({ response: formatted, results: formatted.length }),
      { headers: { "content-type": "application/json", "Access-Control-Allow-Origin":"*" } });
  } catch(e){
    return new Response(JSON.stringify({ response: [], error: e.message }), { headers: { "content-type": "application/json" } });
  }
}
