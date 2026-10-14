export async function onRequest(context) {
  const KEY = (context.env.LIVE_FOOTBALL_API_KEY || '').trim();
  if (!KEY) return new Response(JSON.stringify({ response: [], error: "No KEY" }), { headers: { "content-type": "application/json" } });

  const urlObj = new URL(context.request.url);
  const filter = (urlObj.searchParams.get('date') || 'all').toLowerCase();
  const today = new Date();
  const fmt = d => d.toISOString().split('T')[0];

  const dates = [];
  if (filter === 'all') {
    let d1 = new Date(today); d1.setDate(d1.getDate()-1);
    let d2 = new Date(today);
    let d3 = new Date(today); d3.setDate(d3.getDate()+1);
    dates.push(fmt(d1), fmt(d2), fmt(d3));
  } else if (filter === 'today') dates.push(fmt(today));
  else if (filter.match(/^\d{4}-\d{2}-\d{2}$/)) dates.push(filter);
  else dates.push(fmt(today));

  try {
    const results = await Promise.all(dates.map(async (date) => {
      // TRY 3 DIFFERENT AUTH METHODS
      const url1 = `https://live-football-api.com/api/v1/matches?api_key=${KEY}&date=${date}`;
      const url2 = `https://live-football-api.com/api/v1/matches?key=${KEY}&date=${date}`;
      const url3 = `https://live-football-api.com/api/v1/matches?date=${date}`;

      let data = null;
      let usedUrl = '';

      // Try method 1
      try {
        const r1 = await fetch(url1);
        data = await r1.json();
        usedUrl = 'api_key param';
        if (data.matches || (data.data && data.data.matches) || (data.success && data.data)) return { date, data, usedUrl };
      } catch(e) {}

      // Try method 2 with header
      try {
        const r2 = await fetch(url3, { headers: { 'api-key': KEY, 'x-api-key': KEY, 'X-API-Key': KEY } });
        const d2 = await r2.json();
        if (d2.matches) { data = d2; usedUrl = 'header api-key'; return { date, data, usedUrl }; }
        if (!data ||!data.matches) data = d2;
      } catch(e) {}

      return { date, data, usedUrl: usedUrl || 'failed' };
    }));

    let all = [];
    let fullDebug = [];
    results.forEach(r => {
      const matches = r.data?.matches || r.data?.data?.matches || r.data?.data || r.data?.response || [];
      const msg = r.data?.message || r.data?.error || r.data?.msg || JSON.stringify(r.data).slice(0,300);
      fullDebug.push({ date: r.date, count: matches.length, message: msg, used: r.usedUrl, fullKeys: Object.keys(r.data||{}) });
      all = all.concat(matches);
    });

    const formatted = all.map(m => ({
      fixture: { id: m.id, date: m.kickoff || m.date, status: { short: (m.status||'').toLowerCase()==='live'?'LIVE':(m.status||'').toLowerCase()==='finished'?'FT':'NS', elapsed: m.minute||null, long: m.status }, minute: m.minute },
      league: { name: m.league?.name||'League', logo: m.league?.logo||'' },
      teams: { home: { name: m.home?.name||'Home', logo: m.home?.logo||'' }, away: { name: m.away?.name||'Away', logo: m.away?.logo||'' } },
      goals: { home: m.score?.home??null, away: m.score?.away??null },
      status: m.status
    }));

    return new Response(JSON.stringify({ response: formatted, results: formatted.length, date: filter, rawCount: formatted.length, debug: fullDebug }), { headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" } });
  } catch (e) {
    return new Response(JSON.stringify({ response: [], error: e.message }), { headers: { "content-type": "application/json" } });
  }
}
