export default async function handler(req, res){
  const key = process.env.LIVE_FOOTBALL_API_KEY;
  const date = new Date().toISOString().split('T')[0];
  try{
    const r = await fetch(`https://live-football-api.com/api/matches?date=${date}&lang=en`,{
      headers:{ "x-api-key": key }
    });
    const text = await r.text();
    const j = JSON.parse(text);
    const matches = j?.data?.matches || j?.matches || j?.data || [];
    const fixed = matches.map(m=>{
      const country = (m.league?.country||"").toUpperCase();
      const name = (m.league?.name||"FOOTBALL").toUpperCase();
      return {...m, league_full: country? `${country}: ${name}`: name, league_country: country, league_name: name };
    });
    return res.status(200).json({ data: fixed, count: fixed.length, date });
  }catch(e){
    return res.status(200).json({ data: [], count: 0, error: e.message });
  }
}
