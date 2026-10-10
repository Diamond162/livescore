export default async function handler(req, res) {
  // Support both key names
  const key = process.env.LIVE_FOOTBALL_API_KEY || process.env.FOOTBALL_API_KEY || process.env.API_KEY;
  if(!key) return res.status(500).json({ error: "No API key in Vercel env" });

  const date = new Date().toISOString().split('T')[0];

  try {
    // Try correct endpoint for live-football-api.com
    const url = `https://live-football-api.com/api/matches?date=${date}&key=${key}`;
    const r = await fetch(url);
    const data = await r.json();

    let matches = data?.data?.matches || data?.matches || data?.data || data || [];
    if(!Array.isArray(matches)) matches = [];

    // FIX: Add country to league to separate Brazil Serie A vs Italy Serie A
    const fixed = matches.map(m => {
      const country = m.league?.country || m.country || m.league_country || m.competition_country || '';
      const leagueName = m.league?.name || m.competition?.name || m.league_name || m.league || 'FOOTBALL';
      const fullLeague = country? `${country.toUpperCase()}: ${leagueName}`.toUpperCase() : leagueName.toString().toUpperCase();
      return {
       ...m,
        league_full: fullLeague,
        league_country: country,
        league_name: leagueName,
        home_team: m.home_team || m.homeTeam || m.home || m.teams?.home,
        away_team: m.away_team || m.awayTeam || m.away || m.teams?.away,
        home_score: m.home_score?? m.score?.home?? m.scores?.home,
        away_score: m.away_score?? m.score?.away?? m.scores?.away,
      };
    });

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return res.status(200).json({ data: fixed, count: fixed.length, date });

  } catch(e){
    return res.status(500).json({ error: e.message });
  }
}
