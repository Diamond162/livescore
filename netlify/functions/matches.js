export async function onRequest(context) {
  const url = new URL(context.request.url);
  let dParam = url.searchParams.get('date') || 'today';

  let target = new Date();
  if (dParam === 'yesterday') target.setDate(target.getDate() - 1);
  else if (dParam === 'tomorrow') target.setDate(target.getDate() + 1);
  else if (dParam !== 'today') {
    // accept 2026-10-14 or 20261014
    if (dParam.includes('-')) target = new Date(dParam);
    else target = new Date(dParam.slice(0,4)+'-'+dParam.slice(4,6)+'-'+dParam.slice(6,8));
  }

  const dateStr = target.toISOString().slice(0,10); // 2026-10-14

  // YOUR API KEY from live-football-api.com dashboard
  const API_KEY = context.env.LIVE_FOOTBALL_API_KEY || context.env.API_KEY;

  try {
    // Docs: https://live-football-api.com/api/v1/matches?api_key=YOUR_KEY&date=2026-06-29&lang=en
    const apiUrl = `https://live-football-api.com/api/v1/matches?api_key=${API_KEY}&date=${dateStr}&lang=en`;
    
    const r = await fetch(apiUrl, { headers: { 'Accept': 'application/json' } });
    const j = await r.json();

    if (j.status !== 'success') throw new Error(j.message || 'API error');

    let out = [];
    (j.matches || j.data?.matches || []).forEach(m => {
      // live-football-api format -> convert to your frontend format
      let short = 'NS';
      const s = (m.status || '').toLowerCase();
      if (s.includes('live') || s.includes('1h') || s.includes('2h') || s.includes('ht')) short = '1H';
      if (s.includes('ft') || s.includes('finished') || s.includes('full')) short = 'FT';

      out.push({
        fixture: {
          date: m.date || m.kickoff || new Date().toISOString(),
          status: { 
            short: short, 
            elapsed: m.minute ? m.minute + "'" : short,
            long: m.status
          }
        },
        league: {
          name: m.league?.name || m.competition?.name || 'Football',
          country: m.league?.country || m.country || 'WORLD',
          id: m.league?.id
        },
        teams: {
          home: { name: m.home?.name || m.home_name || 'Home' },
          away: { name: m.away?.name || m.away_name || 'Away' }
        },
        goals: {
          home: m.score?.home ?? m.home_score ?? null,
          away: m.score?.away ?? m.away_score ?? null
        }
      });
    });

    // SORT: Live top, Scheduled middle, FT bottom
    out.sort((a,b)=>{
      const p = (x) => x.fixture.status.short==='1H'?0 : x.fixture.status.short==='NS'?1 : 2;
      return p(a)-p(b);
    });

    return new Response(JSON.stringify({ response: out }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=30'
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ response: [], error: err.message }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
