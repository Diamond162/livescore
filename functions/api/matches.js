export async function onRequest(context) {
  const KEY = context.env.LIVE_FOOTBALL_API_KEY || context.env.FOOTBALL_API_KEY || context.env.API_FOOTBALL_KEY;
  if (!KEY) return new Response(JSON.stringify({ response: [], error: "Set LIVE_FOOTBALL_API_KEY" }), { headers: { "content-type": "application/json" } });

  const urlObj = new URL(context.request.url);
  const filter = (urlObj.searchParams.get('date') || 'all').toLowerCase();

  const today = new Date();
  const fmt = d => d.toISOString().split('T')[0];
  const datesToFetch = [];

  if (filter === 'all') {
    let d1 = new Date(today); d1.setDate(d1.getDate()-1);
    let d2 = new Date(today);
    let d3 = new Date(today); d3.setDate(d3.getDate()+1);
    datesToFetch.push(fmt(d1), fmt(d2), fmt(d3));
  } else if (filter === 'yesterday') {
    let d = new Date(today); d.setDate(d.getDate()-1); datesToFetch.push(fmt(d));
  } else if (filter === 'tomorrow') {
    let d = new Date(today); d.setDate(d.getDate()+1); datesToFetch.push(fmt(d));
  } else if (filter === 'today') {
    datesToFetch.push(fmt(today));
  } else if (filter.match(/^\d{4}-\d{2}-\d{2}$/)) {
    datesToFetch.push(filter);
  } else {
    // for live/finished etc, we fetch 3 days and filter later
    let d1 = new Date(today); d1.setDate(d1.getDate()-1);
    let d2 = new Date(today);
    let d3 = new Date(today); d3.setDate(d3.getDate()+1);
    datesToFetch.push(fmt(d1), fmt(d2), fmt(d3));
  }

  try {
    const fetches = datesToFetch.map(date =>
      fetch(`https://live-football-api.com/api/v1/matches?date=${date}`, {
        headers: {
          'x-api-key': KEY,
          'X-API-Key': KEY,
          'apikey': KEY,
          'Authorization': KEY
        }
      }).then(r => r.json()).then(j => ({ date, data: j })).catch(e => ({ date, data: { matches: [] }, err: e.message }))
    );

    const results = await Promise.all(fetches);
    let all = [];
    let debug = [];
    results.forEach(r => {
      const matches = r.data.matches || r.data.data?.matches || r.data.response || r.data.data || [];
      debug.push({ date: r.date, count: matches.length, keys: Object.keys(r.data).slice(0,5) });
      all = all.concat(matches);
    });

    // Deduplicate
    const map = new Map();
    all.forEach(m => { const id = String(m.id || m.match_id || Math.random()); if(!map.has(id)) map.set(id, m); });
    all = Array.from(map.values());

    // Filter if user asked live/finished/scheduled
    if (filter === 'live') all = all.filter(m => (m.status||'').toLowerCase() === 'live');
    if (filter === 'finished' || filter === 'ft') all = all.filter(m => (m.status||'').toLowerCase() === 'finished');
    if (filter === 'scheduled') all = all.filter(m => (m.status||'').toLowerCase() === 'scheduled');

    // Convert to your frontend format
    const formatted = all.map(m => ({
      fixture: {
        id: m.id,
        date: m.kickoff || m.date || new Date().toISOString(),
        status: {
          short: (m.status||'').toLowerCase()==='live'? 'LIVE' : (m.status||'').toLowerCase()==='finished'? 'FT' : 'NS',
          elapsed: m.minute || null,
          long: m.status
        },
        minute: m.minute || null
      },
      league: { name: m.league?.name || 'League', country: m.league?.country || '', logo: m.league?.logo || '' },
      teams: {
        home: { name: m.home?.name || 'Home', logo: m.home?.logo || '' },
        away: { name: m.away?.name || 'Away', logo: m.away?.logo || '' }
      },
      goals: { home: m.score?.home?? null, away: m.score?.away?? null },
      score: m.score,
      status: m.status,
      minute: m.minute,
      _raw: m
    }));

    formatted.sort((a,b) => (a.fixture.status.short==='LIVE'?-1:1));

    return new Response(JSON.stringify({
      response: formatted,
      results: formatted.length,
      date: filter,
      rawCount: formatted.length,
      debug: debug
    }), { headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" } });

  } catch (e) {
    return new Response(JSON.stringify({ response: [], error: e.message }), { headers: { "content-type": "application/json" } });
  }
}
