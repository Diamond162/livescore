export async function onRequest(context) {
  const KEY = (context.env.LIVE_FOOTBALL_API_KEY || context.env.FOOTBALL_API_KEY || '').trim();
  if (!KEY) {
    return new Response(JSON.stringify({ response: [], error: "Set LIVE_FOOTBALL_API_KEY in Cloudflare" }), { headers: { "content-type": "application/json" } });
  }

  const reqUrl = new URL(context.request.url);
  const filter = (reqUrl.searchParams.get('date') || 'all').toLowerCase();
  const today = new Date();
  const fmt = d => d.toISOString().split('T')[0];

  let dates = [];
  if (filter === 'all') {
    const d1 = new Date(today); d1.setDate(d1.getDate() - 1);
    const d2 = new Date(today);
    const d3 = new Date(today); d3.setDate(d3.getDate() + 1);
    dates = [fmt(d1), fmt(d2), fmt(d3)];
  } else if (filter === 'today') dates = [fmt(today)];
  else if (filter === 'yesterday') { const d = new Date(today); d.setDate(d.getDate()-1); dates=[fmt(d)]; }
  else if (filter === 'tomorrow') { const d = new Date(today); d.setDate(d.getDate()+1); dates=[fmt(d)]; }
  else if (/^\d{4}-\d{2}-\d{2}$/.test(filter)) dates=[filter];
  else dates = [fmt(today)];

  try {
    const allFetches = await Promise.all(dates.map(async (date) => {
      const apiUrl = `https://live-football-api.com/api/v1/matches?date=${date}&api_key=${KEY}`;
      try {
        const res = await fetch(apiUrl);
        const json = await res.json();
        return { date, json };
      } catch (e) {
        return { date, json: { matches: [], error: e.message } };
      }
    }));

    let allMatches = [];
    let debug = [];

    allFetches.forEach(r => {
      const j = r.json;
      const matches = j.matches || j.data?.matches || j.data || j.response || [];
      const msg = j.message || j.error || '';
      debug.push({ date: r.date, count: Array.isArray(matches)? matches.length : 0, message: msg, sample: JSON.stringify(j).substring(0,200) });
      if (Array.isArray(matches)) allMatches = allMatches.concat(matches);
    });

    // Deduplicate
    const seen = new Set();
    const unique = [];
    for (const m of allMatches) {
      const id = String(m.id || m.match_id || '');
      if (!seen.has(id) && id) { seen.add(id); unique.push(m); }
    }
    allMatches = unique.length? unique : allMatches;

    // Filter safe
    const safeLower = (v) => String(v || '').toLowerCase();
    if (filter === 'live') allMatches = allMatches.filter(m => safeLower(m.status) === 'live');
    if (filter === 'finished') allMatches = allMatches.filter(m => safeLower(m.status) === 'finished');
    if (filter === 'scheduled') allMatches = allMatches.filter(m => safeLower(m.status) === 'scheduled');

    const formatted = allMatches.map(m => {
      const st = safeLower(m.status);
      let short = 'NS';
      if (st === 'live') short = 'LIVE';
      else if (st === 'finished') short = 'FT';
      else if (st === 'scheduled') short = 'NS';
      return {
        fixture: {
          id: m.id,
          date: m.kickoff || m.date || new Date().toISOString(),
          status: { short: short, elapsed: m.minute || null, long: m.status },
          minute: m.minute || null
        },
        league: { name: m.league?.name || 'League', country: m.league?.country || '', logo: m.league?.logo || '' },
        teams: {
          home: { name: m.home?.name || 'Home', logo: m.home?.logo || '' },
          away: { name: m.away?.name || 'Away', logo: m.away?.logo || '' }
        },
        goals: { home: m.score?.home?? null, away: m.score?.away?? null },
        score: m.score,
        status: m.status
      };
    });

    formatted.sort((a,b) => (a.fixture.status.short === 'LIVE'? -1 : 1));

    return new Response(JSON.stringify({
      response: formatted,
      results: formatted.length,
      date: filter,
      rawCount: formatted.length,
      debug: debug
    }), { headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" } });

  } catch (e) {
    return new Response(JSON.stringify({ response: [], error: e.message + ' ' + e.stack }), { headers: { "content-type": "application/json" } });
  }
}
