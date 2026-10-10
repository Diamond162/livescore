export default async function handler(req, res){
  const key = process.env.LIVE_FOOTBALL_API_KEY;
  if(!key) return res.status(200).json({ data:[], count:0, error:"NO KEY" });

  const date = new Date().toISOString().split('T')[0];
  const urlsToTry = [
    `https://api.live-football-api.com/matches?date=${date}&lang=en`,
    `https://api.live-football-api.com/api/matches?date=${date}&lang=en`,
    `https://live-football-api.com/api/matches?date=${date}&lang=en`
  ];

  let lastRaw = "";
  let matches = [];

  for(let url of urlsToTry){
    try{
      const r = await fetch(url, { headers:{ "x-api-key": key } });
      const txt = await r.text();
      lastRaw = txt.slice(0,300);
      // If it starts with <!DOCTYPE, it's HTML - skip
      if(txt.trim().startsWith("<")) continue;
      const j = JSON.parse(txt);
      const m = j?.data?.matches || j?.matches || j?.data || [];
      if(Array.isArray(m) && m.length>0){ matches = m; break; }
    }catch(e){ lastRaw = e.message; }
  }

  if(matches.length===0){
    return res.status(200).json({ data:[], count:0, error: lastRaw, date, tried: urlsToTry });
  }

  const fixed = matches.map(m=>{
    const country = (m.league?.country||"").toUpperCase();
    const name = (m.league?.name||"FOOTBALL").toUpperCase();
    return {
      league_full: country? `${country}: ${name}` : name,
      league_country: country,
      league_name: name,
      home_team: m.home_team||m.teams?.home,
      away_team: m.away_team||m.teams?.away,
      time: m.kickoff||m.time,
      status: m.status,
      home_score: m.home_score,
      away_score: m.away_score
    };
  });

  return res.status(200).json({ data: fixed, count: fixed.length, date });
}
