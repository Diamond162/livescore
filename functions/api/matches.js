export async function onRequest(context) {
  const url = new URL(context.request.url);
  let date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
  const LIVE_KEY = (context.env.LIVE_FOOTBALL_API_KEY || '').trim();
  const HIGH_KEY = (context.env.HIGHLIGHTLY_API_KEY || '').trim();

  const toBerlin = (iso) => {
    try { return new Date(iso).toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit', timeZone:'Europe/Berlin'}); }
    catch { return '--:--'; }
  };

  // If date is in far future (2026-10-15), use today's real date for data
  let realDateForAPI = date;
  let requestedDate = new Date(date);
  let now = new Date();
  if (requestedDate > new Date(now.getTime() + 86400000*3)) {
    realDateForAPI = now.toISOString().split('T')[0]; // use today
  }

  // TRY LIVE-FOOTBALL-API
  if (LIVE_KEY) {
    try {
      let endpoints = [
        `https://api.live-football-api.com/matches?date=${realDateForAPI}&language=en`,
        `https://api.live-football-api.com/live-matches`,
        `https://live-football-api.com/api/matches?date=${realDateForAPI}`
      ];
      for (let apiUrl of endpoints) {
        let r = await fetch(apiUrl, { headers: { 'x-api-key': LIVE_KEY, 'X-API-Key': LIVE_KEY } });
        let j = {}; try { j = JSON.parse(await r.text()); } catch { continue; }
        let matches = j.data?.matches || j.data || j.matches || [];
        if (matches.length > 0) {
          let out = matches.slice(0,100).map(m => {
            let home = m.home_team?.name || m.home?.name || 'Home';
            let away = m.away_team?.name || m.away?.name || 'Away';
            let sH = m.scores?.home?? m.score?.home?? 0;
            let sA = m.scores?.away?? m.score?.away?? 0;
            let status = m.status || 'NS';
            let disp = status.includes('FT') || status.includes('LIVE')? `${sH}-${sA}` : (m.score||'-:-');
            return {
              fixture: { id: m.id, berlinTime: toBerlin(m.kickoff || m.date), status: { short: status } },
              league: { name: m.league?.name || 'League', country: m.league?.country || 'World', fullName: `${m.league?.country||'World'} - ${m.league?.name||'League'}` },
              teams: { home: { name: home }, away: { name: away } },
              goals: { display: disp }
            };
          });
          return new Response(JSON.stringify({response: out, results: out.length, source: 'live'}), { headers: {"content-type":"application/json","Access-Control-Allow-Origin":"*"} });
        }
      }
    } catch {}
  }

  // FALLBACK HIGHLIGHTLY - always try with real date + requested date
  if (HIGH_KEY) {
    for (let tryDate of [realDateForAPI, date, '2025-10-15']) {
      try {
        let r = await fetch(`https://soccer.highlightly.net/matches?date=${tryDate}&limit=100`, { headers: {"x-rapidapi-key": HIGH_KEY, "x-rapidapi-host":"soccer.highlightly.net"} });
        let j = {}; try { j = JSON.parse(await r.text()); } catch { continue; }
        let list = j.data || [];
        if (list.length > 0) {
          let out = list.map(m => ({
            fixture: { id: m.id, berlinTime: toBerlin(m.date), status: { short: m.state?.description || 'NS' } },
            league: { name: m.league?.name || 'League', country: m.country?.name || 'World', fullName: `${m.country?.name} - ${m.league?.name}` },
            teams: { home: { name: m.homeTeam?.name || 'Home' }, away: { name: m.awayTeam?.name || 'Away' } },
            goals: { display: m.score?.current || '-:-' }
          }));
          return new Response(JSON.stringify({response: out, results: out.length, source: 'highlightly', usedDate: tryDate}), { headers: {"content-type":"application/json","Access-Control-Allow-Origin":"*"} });
        }
      } catch {}
    }
  }
  return new Response(JSON.stringify({response:[], results:0}), { headers: {"content-type":"application/json"} });
}
