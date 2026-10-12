export async function onRequest(context) {
  const API_KEY = context.env.FOOTBALL_API_KEY || context.env.API_KEY;
  if (!API_KEY) {
    return new Response(JSON.stringify({ response: [] }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  const url = new URL(context.request.url);
  const isLive = url.searchParams.get("live");
  const date = url.searchParams.get("date") || new Date().toISOString().split("T")[0];

  let apiUrl = `https://live-football-api.com/api/v1/matches?api_key=${API_KEY}&date=${date}`;
  if (isLive) apiUrl = `https://live-football-api.com/api/v1/matches?api_key=${API_KEY}&live=true`;

  try {
    const r = await fetch(apiUrl);
    const raw = await r.json();
    const list = raw.data || raw.matches || raw || [];

    // Convert live-football-api format -> api-sports format wey your frontend dey expect
    const response = list.map((m, i) => ({
      fixture: {
        id: m.id || i,
        date: m.kickoff || m.date || new Date().toISOString(),
        status: {
          short: m.status === 'live' || m.is_live? '1H' : (m.status?.short || 'NS'),
          long: m.status || 'Not Started',
          elapsed: m.minute || null
        }
      },
      league: {
        id: m.league?.id || 0,
        name: m.league?.name || m.competition || 'League',
        country: m.league?.country || m.country || '',
        logo: m.league?.logo || '',
        flag: m.league?.flag || ''
      },
      teams: {
        home: { id: m.home?.id || 0, name: m.home?.name || m.home || 'Home', logo: m.home?.logo || '' },
        away: { id: m.away?.id || 0, name: m.away?.name || m.away || 'Away', logo: m.away?.logo || '' }
      },
      goals: {
        home: m.score?.home?? m.home_score?? null,
        away: m.score?.away?? m.away_score?? null
      },
      score: {
        fulltime: {
          home: m.score?.home?? null,
          away: m.score?.away?? null
        }
      }
    }));

    return new Response(JSON.stringify({ response }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=60"
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ response: [], error: e.message }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}
