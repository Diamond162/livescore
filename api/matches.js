export default async function handler(req, res) {
  const key = process.env.LIVE_FOOTBALL_API_KEY;
  if(!key) return res.status(500).json({error: "No API key"});

  const date = new Date().toISOString().split('T')[0]; // today 2026 format YYYY-MM-DD

  try {
    const r = await fetch(`https://live-football-api.com/api/matches?date=${date}`, {
      headers: { "X-API-KEY": key, "Authorization": `Bearer ${key}` }
    });

    let data = await r.json();
    // live-football-api returns {data: {matches: [...]} } or {matches: [...]}
    let matches = data.data?.matches || data.matches || data.data || [];

    // Fix league name to include country so Brazil Serie A!= Italy Serie A
    const fixed = matches.map(m => {
      const country = m.league?.country || m.country || m.league_country || '';
      const leagueName = m.league?.name || m.league_name || m.competition || 'Unknown';
      // create full league label like ITALY: SERIE A, BRAZIL: SERIE A
      const fullLeague = country? `${country.toUpperCase()}: ${leagueName.toUpperCase()}` : leagueName.toUpperCase();
      return {
       ...m,
        league_full: fullLeague,
        league_country: country,
        league_name: leagueName
      }
    });

    return res.status(200).json({ data: fixed });
  } catch(e){
    return res.status(500).json({error: e.message});
  }
}
