exports.handler = async () => {
  const API_KEY = process.env.LIVE_FOOTBALL_API_KEY;

  if(!API_KEY){
    return { statusCode: 500, body: JSON.stringify({error:"Add LIVE_FOOTBALL_API_KEY in Netlify"}) };
  }

  let allMatches = [];

  // Check last 3 days to get REAL games from YOUR API only
  for(let offset of [-2,-1,0,1]){
    try{
      let d = new Date();
      d.setDate(d.getDate()+offset);
      let dateStr = d.toISOString().split('T')[0]; // 2025-10-10 format
      let url = `https://live-football-api.com/api/v1/matches?date=${dateStr}&lang=en`;

      let res = await fetch(url, { headers: { 'X-Api-Key': API_KEY } });
      let json = await res.json();

      // Your API structure
      let matches = json.data?.matches || json.data || [];
      if(Array.isArray(matches) && matches.length>0){
        console.log(`Found ${matches.length} on ${dateStr}`);
        allMatches = allMatches.concat(matches);
        if(allMatches.length >= 15) break; // enough real games
      }
    }catch(e){
      console.log("error", e.message);
    }
  }

  // Clean for your frontend
  const clean = allMatches.map(m=>{
    const country = m.country?.name || m.league?.country || m.area?.name || "";
    const league = m.league?.name || m.competition?.name || "";
    const home = m.homeTeam?.name || m.home_team?.name || "";
    const away = m.awayTeam?.name || m.away_team?.name || "";
    let hs = m.scores?.home?? m.score?.home?? m.homeScore?? "-";
    let as = m.scores?.away?? m.score?.away?? m.awayScore?? "-";
    if(typeof m.score==='string' && m.score.includes('-')){
      const p=m.score.split('-'); hs=p[0].trim(); as=p[1].trim();
    }
    let status = typeof m.status==='string'? m.status : (m.status?.type || "FT");
    if(m.minute) status = m.minute + "'";

    return {
      country: String(country),
      leagueName: String(league),
      home: String(home),
      away: String(away),
      hs: String(hs),
      as: String(as),
      status: String(status),
      isLive: String(status).includes("'"),
      isFT: String(status)==='FT'
    };
  });

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ data: { matches: clean } })
  };
};
