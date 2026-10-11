exports.handler = async () => {
  const API_KEY = process.env.LIVE_FOOTBALL_API_KEY;
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  try {
    // Try today first, if empty try yesterday
    let matches = [];
    for (let date of [today, yesterday]) {
      const res = await fetch(`https://live-football-api.com/api/v1/matches?date=${date}&lang=en`, {
        headers: { 'X-Api-Key': API_KEY }
      });
      const raw = await res.json();
      const m = raw.data?.matches || raw.data || [];
      if (m.length > 0) { matches = m; break; }
    }

    const clean = matches.map(m => {
      const country = m.country?.name || m.league?.country || m.area?.name || '';
      const league = m.league?.name || m.competition?.name || '';
      const home = m.homeTeam?.name || m.home_team?.name || '';
      const away = m.awayTeam?.name || m.away_team?.name || '';
      let hs = m.scores?.home?? m.homeScore?? m.score?.home?? '-';
      let as = m.scores?.away?? m.awayScore?? m.score?.away?? '-';
      if (typeof m.score === 'string' && m.score.includes('-')) {
        const p = m.score.split('-'); hs = p[0]; as = p[1];
      }
      let status = typeof m.status === 'string'? m.status : (m.status?.type || m.minute || 'FT');
      if (m.minute) status = m.minute + "'";
      return {
        country: String(country), leagueName: String(league),
        home: String(home), away: String(away),
        hs: hs, as: as, status: String(status),
        isLive: String(status).includes("'"), isFT: String(status) === 'FT'
      };
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ data: { matches: clean } })
    };
  } catch (e) {
    return { statusCode: 200, body: JSON.stringify({ data: { matches: [] }, error: e.message }) };
  }
};
