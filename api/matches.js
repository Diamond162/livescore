export default async function handler(req, res){
  const key = process.env.LIVE_FOOTBALL_API_KEY || process.env.FOOTBALL_API_KEY || "";
  const today = new Date().toISOString().split('T')[0].replace(/-/g,'');
  const todayISO = new Date().toISOString().split('T')[0];

  let allGames = [];

  // 1. Try YOUR live-football-api.com first (if key works)
  if(key){
    try{
      const url = `https://live-football-api.com/api/matches?date=${todayISO}&lang=en`;
      const r = await fetch(url, { headers: { "x-api-key": key } });
      const j = await r.json();
      const ms = j?.data?.matches || j?.matches || [];
      if(Array.isArray(ms) && ms.length>0){
        allGames = ms.map(m=>({
          league_full: `${(m.league?.country||'').toUpperCase()}: ${m.league?.name||''}`.toUpperCase(),
          league_country: m.league?.country||'',
          league_name: m.league?.name||'',
          home_team: m.home_team || m.teams?.home,
          away_team: m.away_team || m.teams?.away,
          time: m.time || m.kickoff || '20:00',
          status: m.status || 'NS',
          home_score: m.home_score?? m.score?.home,
          away_score: m.away_score?? m.score?.away
        }));
      }
    }catch(e){}
  }

  // 2. If still empty, use FREE REAL ESPN API (no key needed!) - this will give you REAL matches
  if(allGames.length===0){
    const leagues = [
      { code:'eng.1', name:'PREMIER LEAGUE', country:'ENGLAND' },
      { code:'ita.1', name:'SERIE A', country:'ITALY' },
      { code:'esp.1', name:'LA LIGA', country:'SPAIN' },
      { code:'ger.1', name:'BUNDESLIGA', country:'GERMANY' },
      { code:'bra.1', name:'SERIE A', country:'BRAZIL' },
      { code:'ned.1', name:'EREDIVISIE', country:'NETHERLANDS' },
    ];
    try{
      for(let L of leagues){
        const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${L.code}/scoreboard?dates=${today}`;
        const r = await fetch(url);
        const j = await r.json();
        const events = j.events || [];
        events.forEach(ev=>{
          const comp = ev.competitions?.[0];
          const home = comp?.competitors?.find(c=>c.homeAway==='home');
          const away = comp?.competitors?.find(c=>c.homeAway==='away');
          allGames.push({
            league_full: `${L.country}: ${L.name}`,
            league_country: L.country,
            league_name: L.name,
            home_team: { name: home?.team?.displayName || 'Home' },
            away_team: { name: away?.team?.displayName || 'Away' },
            time: ev.date?.slice(11,16) || '20:00',
            status: comp?.status?.type?.shortDetail || 'FT',
            home_score: home?.score,
            away_score: away?.score,
          });
        });
      }
    }catch(e){}
  }

  return res.status(200).json({ data: allGames, count: allGames.length, source: allGames.length>0 && key? 'live-football-api or espn' : 'espn-free' });
}
