exports.handler = async () => {
  const API_KEY = process.env.LIVE_FOOTBALL_API_KEY;
  const today = new Date().toISOString().split('T')[0];

  try {
    const res = await fetch(`https://live-football-api.com/api/v1/matches?date=${today}&lang=en`, {
      headers: { 'X-Api-Key': API_KEY }
    });
    const raw = await res.json();

    // raw is { data: { matches: [...] } }
    const matches = raw.data?.matches || raw.data || raw.matches || [];

    const clean = matches.map(m => {
      // country + league
      const country = m.country?.name || m.league?.country || m.area?.name || '';
      const league = m.league?.name || m.competition?.name || m.league_name || 'Unknown';

      // teams
      const home = m.homeTeam?.name || m.home_team?.name || m.home?.name || '';
      const away = m.awayTeam?.name || m.away_team?.name || m.away?.name || '';

      // score - try ALL possible fields
      let hs = m.scores?.home?? m.homeScore?? m.home_score?? m.score?.home?? null;
      let as = m.scores?.away?? m.awayScore?? m.away_score?? m.score?.away?? null;
      // if scores is object like { "1": "0", "2": "1" } or string
      if (m.score) {
        if (typeof m.score === 'string' && m.score.includes('-')) {
          const parts = m.score.split('-');
          hs = parts[0].trim(); as = parts[1].trim();
        }
      }
      // status
      let status = '';
      if (typeof m.status === 'string') status = m.status;
      else if (m.status?.type) status = m.status.type;
      else if (m.status?.name) status = m.status.name;
      else status = m.minute || m.time || m.state || 'NS';

      // live minute like 38'
      if (m.minute) status = m.minute + "'";
      if (m.time) status = m.time;
      if (status.toLowerCase().includes('finished') || status === 'FT') status = 'FT';
      if (status.toLowerCase().includes('not started')) status = m.kickoff || m.time || 'NS';

      return {
        country: String(country),
        leagueName: String(league),
        home: String(home),
        away: String(away),
        hs: hs?? '-',
        as: as?? '-',
        status: String(status),
        isLive: String(status).includes("'") || String(status).toLowerCase().includes('live'),
        isFT: String(status) === 'FT'
      };
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ data: { matches: clean } })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
