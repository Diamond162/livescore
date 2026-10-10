import { Client } from 'live-football-api';

export default async function handler(req, res){
  const key = process.env.LIVE_FOOTBALL_API_KEY;
  if(!key) return res.status(200).json({ data:[], count:0, error:"NO KEY IN VERCEL" });

  const date = new Date().toISOString().split('T')[0];

  try{
    const client = new Client(key);
    const result = await client.matches(date, 'en');
    const matches = result?.data?.matches || [];

    const fixed = matches.map(m=>{
      const country = (m.league?.country||"").toUpperCase();
      const name = (m.league?.name||"FOOTBALL").toUpperCase();
      return {
        league_full: country? `${country}: ${name}` : name,
        league_country: country,
        league_name: name,
        home_team: m.home_team,
        away_team: m.away_team,
        time: m.kickoff,
        status: m.status,
        home_score: m.home_score,
        away_score: m.away_score
      };
    });

    return res.status(200).json({ data: fixed, count: fixed.length, date });
  }catch(e){
    return res.status(200).json({ data:[], count:0, error: e.message, date });
  }
}
