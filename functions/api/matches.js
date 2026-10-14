export async function onRequest(context) {
  const KEY = (context.env.LIVE_FOOTBALL_API_KEY || '').trim();
  const reqUrl = new URL(context.request.url);
  const dateParam = (reqUrl.searchParams.get('date') || '').trim();

  if (!KEY) {
    return new Response(JSON.stringify({ response: [], error: "Missing LIVE_FOOTBALL_API_KEY" }), { headers: { "content-type": "application/json" } });
  }

  // dateParam can be 2026-10-14 or today/yesterday/all
  let dates = [];
  const today = new Date();
  const fmt = d => d.toISOString().split('T')[0];
  const add = n => { const d = new Date(today); d.setDate(d.getDate()+n); return fmt(d); };

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    dates = [dateParam];
  } else if (dateParam === 'yesterday') {
    dates = [add(-1)];
  } else if (dateParam === 'today') {
    dates = [add(0)];
  } else if (dateParam === 'tomorrow') {
    dates = [add(1)];
  } else if (dateParam === 'all') {
    dates = [add(-1), add(0), add(1)];
  } else if (dateParam === '') {
    // If frontend sends ISO, use it directly
    dates = [add(0)];
  } else {
    // fallback: if param is like 2026-10-14 from frontend, use it
    const maybeDate = reqUrl.searchParams.get('date');
    if (maybeDate && /^\d{4}-\d{2}-\d{2}$/.test(maybeDate)) dates = [maybeDate];
    else dates = [add(0)];
  }

  // Override: if original param itself is ISO (most important fix for your case)
  const rawDate = reqUrl.searchParams.get('date');
  if (rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    dates = [rawDate];
  }

  try {
    let all = [];
    let logs = [];

    for (const date of dates) {
      const apiUrl = `https://live-football-api.com/api/v1/matches?date=${date}&api_key=${KEY}`;
      const r = await fetch(apiUrl);
      const j = await r.json();
      const matches = j.matches || j.data?.matches || j.data || [];
      logs.push({ date, status: r.status, count: Array.isArray(matches)? matches.length : 0, message: j.message || 'ok' });
      if (Array.isArray(matches)) all = all.concat(matches);
    }

    // dedup
    const seen = new Set();
    all = all.filter(m => { const id = String(m.id); if (seen.has(id)) return false; seen.add(id); return true; });

    const formatted = all.map(m => {
      let kickoff = m.kickoff || m.date || '';
      let berlinTime = '00:00';
      try {
        const d = new Date(kickoff);
        if (!isNaN(d)) berlinTime = d.toLocaleTimeString('en-GB', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', hour12: false });
        else berlinTime = kickoff.slice(11, 16) || '00:00';
      } catch (e) { berlinTime = '00:00'; }

      let hs = m.score?.home?? m.home_score?? null;
      let as = m.score?.away?? m.away_score?? null;
      if (typeof m.score === 'string' && m.score.includes('-')) {
        const p = m.score.split('-'); hs = parseInt(p[0]); as = parseInt(p[1]);
      }

      const st = String(m.status || '').toLowerCase();
      const short = st === 'live'? 'LIVE' : st === 'finished'? 'FT' : 'NS';

      const leagueName = m.league?.name || 'Other';
      const lower = leagueName.toLowerCase();
      let pri = 999;
      if (lower.includes('champions league')) pri = 1;
      else if (lower.includes('europa league')) pri = 2;
      else if (lower.includes('premier league')) pri = 3;
      else if (lower.includes('la liga')) pri = 4;
      else if (lower.includes('bundesliga')) pri = 5;
      else if (lower.includes('serie a')) pri = 6;
      else if (lower.includes('ligue 1')) pri = 7;

      return {
        fixture: { id: m.id, date: kickoff, berlinTime, status: { short, long: m.status }, minute: m.minute || null },
        league: { name: leagueName, country: m.league?.country || '' },
        teams: { home: { name: m.home?.name || 'Home' }, away: { name: m.away?.name || 'Away' } },
        goals: { home: hs, away: as },
        status: m.status,
        priority: pri
      };
    });

    formatted.sort((a, b) => {
      if (a.fixture.status.short === 'LIVE' && b.fixture.status.short!== 'LIVE') return -1;
      if (b.fixture.status.short === 'LIVE' && a.fixture.status.short!== 'LIVE') return 1;
      if (a.priority!== b.priority) return a.priority - b.priority;
      return a.fixture.berlinTime.localeCompare(b.fixture.berlinTime);
    });

    return new Response(JSON.stringify({ response: formatted, results: formatted.length, debug: logs }), {
      headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ response: [], error: e.message }), { headers: { "content-type": "application/json" } });
  }
}
