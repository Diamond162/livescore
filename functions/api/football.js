export async function onRequest(context) {
  const API_KEY = context.env.FOOTBALL_API_KEY || context.env.API_KEY;
  const H = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=30" };
  if (!API_KEY) return new Response(JSON.stringify({ response: [] }), { headers: H });

  async function getList(url) {
    try {
      const r = await fetch(url);
      const j = await r.json();
      let arr = [];
      if (!j) return [];
      if (j.data) {
        if (Array.isArray(j.data)) {
          arr = j.data;
        } else if (j.data.matches && Array.isArray(j.data.matches)) {
          arr = j.data.matches;
        } else if (typeof j.data === 'object') {
          // data = { "2026-11-14": [...] , "2026-11-15": [...] }
          for (const v of Object.values(j.data)) {
            if (Array.isArray(v)) arr = arr.concat(v);
            else if (v && v.matches) arr = arr.concat(v.matches);
          }
        }
      } else if (j.matches && Array.isArray(j.matches)) {
        arr = j.matches;
      } else if (Array.isArray(j)) {
        arr = j;
      }
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }

  try {
    let matches = await getList(`https://live-football-api.com/api/v1/matches?api_key=${API_KEY}&live=true`);
    if (matches.length === 0) {
      const today = new Date().toISOString().split('T')[0];
      matches = await getList(`https://live-football-api.com/api/v1/matches?api_key=${API_KEY}&date=${today}`);
    }
    if (matches.length === 0) {
      matches = await getList(`https://live-football-api.com/api/v1/matches?api_key=${API_KEY}&date=2026-07-03`);
    }
    if (matches.length === 0) {
      matches = await getList(`https://live-football-api.com/api/v1/matches?api_key=${API_KEY}`);
    }

    if (!Array.isArray(matches)) matches = [];

    const response = matches.slice(0, 50).map((m, i) => {
      const homeName = m?.home?.name || m?.home_name || (typeof m?.home === 'string' ? m.home : null) || 'Home Team';
      const awayName = m?.away?.name || m?.away_name || (typeof m?.away === 'string' ? m.away : null) || 'Away Team';
      return {
        fixture: { id: m?.id || i, date: m?.kickoff || m?.date || new Date().toISOString(), status: { short: m?.status || (m?.is_live ? 'LIVE' : 'FT'), long: m?.status || '', elapsed: m?.minute || null } },
        league: { name: m?.league?.name || m?.competition || 'Football', country: m?.country || '', logo: m?.league?.logo || '', flag: '' },
        teams: {
          home: { name: homeName, logo: m?.home?.logo || '' },
          away: { name: awayName, logo: m?.away?.logo || '' }
        },
        goals: { home: m?.score?.home ?? m?.home_score ?? 0, away: m?.score?.away ?? m?.away_score ?? 0 },
        score: { fulltime: { home: m?.score?.home ?? 0, away: m?.score?.away ?? 0 } }
      };
    });

    return new Response(JSON.stringify({ response }), { headers: H });
  } catch (e) {
    return new Response(JSON.stringify({ response: [], error: e.message, stack: e.stack?.slice(0,200) }), { headers: H });
  }
}
