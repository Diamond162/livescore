export async function onRequest(context) {
  const KEY = (context.env.LIVE_FOOTBALL_API_KEY || '').trim();
  const reqUrl = new URL(context.request.url);
  const filter = (reqUrl.searchParams.get('date') || 'all').toLowerCase();

  const today = new Date();
  const fmt = d => d.toISOString().split('T')[0];
  const getDate = (offset) => { const d = new Date(today); d.setDate(d.getDate()+offset); return fmt(d); };

  let dates = filter === 'all'? [getDate(-1), getDate(0), getDate(1)] :
              filter === 'yesterday'? [getDate(-1)] :
              filter === 'tomorrow'? [getDate(1)] :
              filter === 'today'? [getDate(0)] :
              /^\d{4}-\d{2}-\d{2}$/.test(filter)? [filter] : [getDate(0)];

  try {
    const allData = await Promise.all(dates.map(async date => {
      const res = await fetch(`https://live-football-api.com/api/v1/matches?date=${date}&api_key=${KEY}`);
      const json = await res.json();
      return { date, matches: json.matches || [] };
    }));

    let allMatches = [];
    allData.forEach(r => allMatches = allMatches.concat(r.matches.map(m => ({...m, _fetchDate: r.date }))));

    // Deduplicate
    const seen = new Set(); allMatches = allMatches.filter(m => { const id=String(m.id); if(seen.has(id)) return false; seen.add(id); return true; });

    // TOP LEAGUES ORDER - These will be at TOP
    const TOP_LEAGUES = [
      'UEFA Champions League', 'Champions League',
      'UEFA Europa League', 'Europa League',
      'Premier League', 'England: Premier League',
      'La Liga', 'Spain: La Liga',
      'Bundesliga', 'Germany: Bundesliga',
      'Serie A', 'Italy: Serie A',
      'Ligue 1', 'France: Ligue 1',
      'AFC Champions League', 'UEFA Conference League',
      'Championship', 'Saudi Pro League'
    ];

    const getLeaguePriority = (name) => {
      const idx = TOP_LEAGUES.findIndex(t => name.toLowerCase().includes(t.toLowerCase()));
      return idx === -1? 999 : idx;
    };

    const safeLower = v => String(v||'').toLowerCase();

    // Convert + Sort
    let formatted = allMatches.map(m => {
      const st = safeLower(m.status);
      let short = st === 'live'? 'LIVE' : st === 'finished'? 'FT' : 'NS';
      let elapsed = m.minute || null;

      // FIX SCORE - live-football sometimes has score in different fields
      let homeScore = m.score?.home?? m.home_score?? m.homeScore?? null;
      let awayScore = m.score?.away?? m.away_score?? m.awayScore?? null;

      // Berlin time - format 21:00
      let berlinTime = '';
      try {
        const dt = new Date(m.kickoff || m.date);
        berlinTime = dt.toLocaleTimeString('en-GB', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' });
      } catch(e) { berlinTime = '21:00'; }

      return {
        fixture: { id: m.id, date: m.kickoff, _fetchDate: m._fetchDate, status: { short, elapsed, long: m.status }, berlinTime },
        league: { name: m.league?.name || 'Other', country: m.league?.country || '', logo: m.league?.logo || '' },
        teams: { home: { name: m.home?.name || 'Home', logo: m.home?.logo||'' }, away: { name: m.away?.name||'Away', logo: m.away?.logo||'' } },
        goals: { home: homeScore, away: awayScore },
        score: { home: homeScore, away: awayScore },
        status: m.status,
        minute: elapsed,
        priority: getLeaguePriority(m.league?.name || '')
      };
    });

    // Sort: 1. LIVE first, 2. Top Leagues first, 3. by Time
    formatted.sort((a,b) => {
      if (a.fixture.status.short === 'LIVE' && b.fixture.status.short!== 'LIVE') return -1;
      if (b.fixture.status.short === 'LIVE' && a.fixture.status.short!== 'LIVE') return 1;
      if (a.priority!== b.priority) return a.priority - b.priority;
      return new Date(a.fixture.date) - new Date(b.fixture.date);
    });

    return new Response(JSON.stringify({ response: formatted, results: formatted.length }),
      { headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" } });
  } catch(e) {
    return new Response(JSON.stringify({ response: [], error: e.message }), { headers: { "content-type": "application/json" } });
  }
}
