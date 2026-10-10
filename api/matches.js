export default async function handler(req, res){
  const key = process.env.LIVE_FOOTBALL_API_KEY;

  if(!key){
    return res.status(500).json({ error: "No LIVE_FOOTBALL_API_KEY found in Vercel" });
  }

  // Today date YYYY-MM-DD for live-football-api.com
  const date = new Date().toISOString().split('T')[0];

  try{
    // This is the CORRECT official endpoint
    const response = await fetch(`https://live-football-api.com/api/matches?date=${date}&lang=en`, {
      headers: {
        "x-api-key": key
      }
    });

    const text = await response.text();
    let json;
    try{ json = JSON.parse(text); }
    catch(e){ return res.status(500).json({ error: "API did not return JSON", raw: text.slice(0,500) }); }

    if(!response.ok){
      return res.status(500).json({ error: `API Error ${response.status}`, details: json });
    }

    let matches = json?.data?.matches || json?.matches || json?.data || [];
    if(!Array.isArray(matches)) matches = [];

    // Fix Brazil vs Italy Serie A mix
    const allGames = matches.map(m=>{
      const country = (m.league?.country || m.competition?.country || "").toUpperCase();
      const lname = (m.league?.name || m.competition?.name || "FOOTBALL").toString().toUpperCase();
      const full = country? `${country}: ${lname}` : lname;
      return {
        league_full: full,
        league_country: country,
        league_name: lname,
        home_team: m.home_team || m.teams?.home || m.home,
        away_team: m.away_team || m.teams?.away || m.away,
        time: m.kickoff || m.time || m.date,
        status: m.status || m.state || "NS",
        home_score: m.home_score?? m.score?.home?? m.scores?.home,
        away_score: m.away_score?? m.score?.away?? m.scores?.away,
        raw_league: m.league
      };
    });

    // Return ALL games - no filtering!
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate');
    return res.status(200).json({ data: allGames, count: allGames.length, date });

  }catch(err){
    return res.status(500).json({ error: err.message });
  }
}
