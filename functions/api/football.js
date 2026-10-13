export async function onRequest(context) {
  const url = new URL(context.request.url);
  const dateParam = url.searchParams.get('date') || new Date().toISOString().split('T')[0];

  // Your key name
  const API_KEY = context.env.FOOTBALL_API_KEY || context.env.LIVE_FOOTBALL_API_KEY || context.env.API_KEY || "";

  if (!API_KEY) {
    return new Response(JSON.stringify({ response: [] }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  try {
    const apiUrl = `https://live-football-api.com/api/v1/matches?api_key=${API_KEY}&date=${dateParam}&lang=en`;
    const res = await fetch(apiUrl);
    const json = await res.json();

    // live-football-api returns { matches: [...] }
    const rawMatches = json.matches || json.data || [];

    const matches = rawMatches.map(m => {
      const s = String(m.status || m.state || '').toLowerCase();
      const isLive = s.includes('live') || m.is_live === true || m.live === true;
      const isFinished = s.includes('finish') || s.includes('ft') || s.includes('ended');

      return {
        league: {
          name: m.league?.name || m.competition?.name || 'Football',
          country: m.league?.country || m.country || 'World',
          flag: m.league?.country_code || 'INT'
        },
        teams: {
          home: { name: m.home?.name || m.home_team || 'Home' },
          away: { name: m.away?.name || m.away_team || 'Away' }
        },
        fixture: {
          date: m.kickoff || m.date || m.start_at || new Date().toISOString(),
          status: {
            short: isLive? 'LIVE' : (isFinished? 'FT' : 'NS'),
            elapsed: m.minute? m.minute + "'" : (m.status || '')
          }
        },
        goals: {
          home: m.score?.home?? m.home?.score?? m.home_score?? null,
          away: m.score?.away?? m.away?.score?? m.away_score?? null
        }
      };
    });

    return new Response(JSON.stringify({ response: matches }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=30'
      }
    });

  } catch (e) {
    return new Response(JSON.stringify({ response: [], error: e.message }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
