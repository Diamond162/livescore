export async function onRequest(context) {
  const KEY = context.env.LIVE_FOOTBALL_API_KEY || context.env.FOOTBALL_API_KEY || context.env.FOOTBALL_API_KEY2 || context.env.API_FOOTBALL_KEY;
  if (!KEY) return new Response(JSON.stringify({ response: [], error: "Set LIVE_FOOTBALL_API_KEY" }), { headers: { "content-type": "application/json" } });

  const reqUrl = new URL(context.request.url);
  const filter = (reqUrl.searchParams.get('date') || reqUrl.searchParams.get('filter') || 'all').toLowerCase();

  const today = new Date();
  const fmt = (d) => d.toISOString().split('T')[0];
  const dates = {
    yesterday: new Date(today.getTime() - 86400000),
    today: today,
    tomorrow: new Date(today.getTime() + 86400000),
  };

  // Build URLs to fetch - we fetch ALL
  let urls = [];
  if (filter === 'all' || filter === 'today' || filter === 'allgames') {
    urls.push(`https://live-football-api.com/api/v1/matches?api_key=${KEY}&date=${fmt(dates.today)}`);
    urls.push(`https://live-football-api.com/api/v1/matches?api_key=${KEY}&date=${fmt(dates.yesterday)}`);
    urls.push(`https://live-football-api.com/api/v1/matches?api_key=${KEY}&date=${fmt(dates.tomorrow)}`);
    urls.push(`https://live-football-api.com/api/v1/matches?api_key=${KEY}&status=live`);
    urls.push(`https://live-football-api.com/api/v1/matches?api_key=${KEY}&status=finished`);
    urls.push(`https://live-football-api.com/api/v1/matches?api_key=${KEY}&status=scheduled`);
  } else if (filter === 'live') {
    urls.push(`https://live-football-api.com/api/v1/matches?api_key=${KEY}&status=live`);
  } else if (filter === 'finished' || filter === 'ft') {
    urls.push(`https://live-football-api.com/api/v1/matches?api_key=${KEY}&status=finished`);
  } else if (filter === 'scheduled') {
    urls.push(`https://live-football-api.com/api/v1/matches?api_key=${KEY}&status=scheduled`);
  } else {
    // specific date like 2026-10-14
    urls.push(`https://live-football-api.com/api/v1/matches?api_key=${KEY}&date=${filter}`);
  }

  try {
    const results = await Promise.all(urls.map(u => fetch(u).then(r => r.json()).catch(() => ({matches: []}))));
    let allMatches = [];
    results.forEach(data => {
      const ms = data.matches || data.response || data.data || [];
      allMatches = allMatches.concat(ms);
    });

    // Deduplicate by id
    const map = new Map();
    allMatches.forEach(m => { if (m.id &&!map.has(String(m.id))) map.set(String(m.id), m); });
    allMatches = Array.from(map.values());

    // Convert to format your frontend expects (api-football style)
    const formatted = allMatches.map(m => {
      const statusRaw = (m.status || '').toLowerCase();
      let short = 'NS';
      let elapsed = null;
      if (statusRaw === 'live') { short = 'LIVE'; elapsed = m.minute || m.time || null; }
      else if (statusRaw === 'finished') short = 'FT';
      else if (statusRaw === 'scheduled') short = 'NS';

      // If minute exists like "67"
      if (m.minute) elapsed = m.minute;

      return {
        fixture: {
          id: m.id,
          date: m.kickoff || m.date || new Date().toISOString(),
          status: { short: short, elapsed: elapsed, long: m.status },
          minute: m.minute || null
        },
        league: {
          id: m.league?.id || 0,
          name: m.league?.name || 'Unknown',
          country: m.league?.country || '',
          logo: m.league?.logo || ''
        },
        teams: {
          home: { id: m.home?.id, name: m.home?.name || m.home_team_name, logo: m.home?.logo || m.home_team_logo },
          away: { id: m.away?.id, name: m.away?.name || m.away_team_name, logo: m.away?.logo || m.away_team_logo }
        },
        goals: {
          home: m.score?.home?? m.homeScore?? m.goals?.home?? null,
          away: m.score?.away?? m.awayScore?? m.goals?.away?? null
        },
        score: m.score || { home: m.homeScore, away: m.awayScore },
        status: m.status,
        minute: m.minute,
        _raw: m
      };
    });

    // Sort: live first, then scheduled, then finished
    formatted.sort((a,b) => {
      if (a.fixture.status.short === 'LIVE' && b.fixture.status.short!== 'LIVE') return -1;
      if (b.fixture.status.short === 'LIVE' && a.fixture.status.short!== 'LIVE') return 1;
      return new Date(a.fixture.date) - new Date(b.fixture.date);
    });

    return new Response(JSON.stringify({
      response: formatted,
      results: formatted.length,
      date: filter,
      rawCount: formatted.length
    }), { headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" } });

  } catch (e) {
    return new Response(JSON.stringify({ response: [], error: e.message }), { headers: { "content-type": "application/json" } });
  }
}
