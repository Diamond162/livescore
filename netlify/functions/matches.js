exports.handler = async function(event, context) {
  const API_KEY = process.env.LIVE_FOOTBALL_API_KEY;
  const url = `https://live-football-api.com/api/v1/matches?apikey=${API_KEY}`;

  try {
    const r = await fetch(url, { headers: { "x-api-key": API_KEY, "apikey": API_KEY } });
    const j = await r.json();
    const matches = j.data || j.matches || j.result || [];

    // GROUP BY LEAGUE LIKE FLASHSCORE
    const leagues = {};
    matches.forEach(m => {
      const country = m.country || m.competition?.country || m.league?.country || 'World';
      const league = m.competition?.name || m.league_name || m.league?.name || 'Other League';
      const key = `${country} - ${league}`;
      if(!leagues[key]) leagues[key] = [];
      leagues[key].push(m);
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ leagues, total: matches.length })
    };
  } catch (e) {
    return { statusCode: 200, body: JSON.stringify({ leagues: {}, total: 0, error: e.message }) };
  }
}
