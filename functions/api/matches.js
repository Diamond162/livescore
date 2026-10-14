export async function onRequest(context) {
  const KEY = (context.env.LIVE_FOOTBALL_API_KEY || '').trim();
  if (!KEY) {
    return new Response(JSON.stringify({ response: [], error: "Missing LIVE_FOOTBALL_API_KEY in Cloudflare" }), { headers: { "content-type": "application/json" } });
  }

  const url = new URL(context.request.url);
  const dateParam = (url.searchParams.get('date') || 'today').toLowerCase();

  const today = new Date();
  const fmt = (d) => d.toISOString().split('T')[0];
  const addDays = (n) => { const d = new Date(today); d.setDate(d.getDate()+n); return fmt(d); };

  let dates = [];
  if (dateParam === 'all') dates = [addDays(-1), addDays(0), addDays(1)];
  else if (dateParam === 'yesterday') dates = [addDays(-1)];
  else if (dateParam === 'today') dates = [addDays(0)];
  else if (dateParam === 'tomorrow') dates = [addDays(1)];
  else if (dateParam.match(/^\d{4}-\d{2}-\d{2}$/)) dates = [dateParam];
  else dates = [addDays(0)];

  try {
    const fetches = await Promise.all(dates.map(async (date) => {
      const apiUrl = `https://live-football-api.com/api/v1/matches?date=${date}&api_key=${KEY}`;
      const r = await fetch(apiUrl);
      const j = await r.json();
      return { date, data: j, matches: j.matches || [] };
    }));

    let all = [];
    let debug = [];
    fetches.forEach(f => {
      debug.push({ date: f.date, count: f.matches.length, message: f.data.message || 'ok', keys: Object.keys(f.data) });
      all = all.concat(f.matches);
    });

    // dedup
    const seen = new Set();
    all = all.filter(m => { const id=String(m.id); if(seen.has(id)) return false; seen.add(id); return true; });

    const TOP = ['champions league','europa league','conference league','premier league','la liga','bundesliga','serie a','ligue 1','afc','gcc','saudi'];

    const getPriority = (name) => {
      const s=(name||'').toLowerCase();
      for(let i=0;i<TOP.length;i++) if(s.includes(TOP[i])) return i;
      return 999;
    };

    const formatted = all.map(m => {
      // TIME - fix Berlin time
      let kickoff = m.kickoff || m.date || '';
      let berlinTime = '00:00';
      try {
        const d = new Date(kickoff);
        if(!isNaN(d)) berlinTime = d.toLocaleTimeString('en-GB',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit',hour12:false});
      } catch(e){ berlinTime = (kickoff||'').slice(11,16) || '00:00'; }

      // SCORE - fix all possible fields
      let hs = m.score?.home?? m.home_score?? m.homeScore?? null;
      let as = m.score?.away?? m.away_score?? m.awayScore?? null;
      if(hs===null && m.score && typeof m.score==='string' && m.score.includes('-')){
        const p=m.score.split('-'); hs=parseInt(p[0]); as=parseInt(p[1]);
      }

      const st = String(m.status||'').toLowerCase();
      const short = st==='live'?'LIVE': st==='finished'?'FT': 'NS';

      return {
        fixture: { id: m.id, date: kickoff, berlinTime, status: { short, long: m.status }, minute: m.minute || null },
        league: { name: m.league?.name||'Other', country: m.league?.country||'', logo: m.league?.logo||'' },
        teams: { home: { name: m.home?.name||'Home' }, away: { name: m.away?.name||'Away' } },
        goals: { home: hs, away: as },
        status: m.status,
        priority: getPriority(m.league?.name||'')
      };
    });

    // SORT: LIVE first, then top leagues at top, then time
    formatted.sort((a,b)=>{
      if(a.fixture.status.short==='LIVE' && b.fixture.status.short!=='LIVE') return -1;
      if(b.fixture.status.short==='LIVE' && a.fixture.status.short!=='LIVE') return 1;
      if(a.priority!==b.priority) return a.priority-b.priority;
      return a.fixture.berlinTime.localeCompare(b.fixture.berlinTime);
    });

    return new Response(JSON.stringify({ response: formatted, results: formatted.length, debug }), { headers: { "content-type": "application/json", "Access-Control-Allow-Origin":"*" } });
  } catch(e){
    return new Response(JSON.stringify({ response: [], error: e.message }), { headers: { "content-type": "application/json" } });
  }
}
