export async function onRequest(context) {
  const url = new URL(context.request.url);
  const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
  const API_KEY = context.env.FOOTBALL_API_KEY || context.env.API_FOOTBALL_KEY || context.env.API_KEY;

  if (!API_KEY) {
    return new Response(JSON.stringify({error: "No API KEY"}), {
      status: 500,
      headers: {"Content-Type":"application/json"}
    });
  }

  try {
    const apiRes = await fetch(`https://v3.football.api-sports.io/fixtures?date=${date}`, {
      headers: {
        "x-rapidapi-key": API_KEY,
        "x-rapidapi-host": "v3.football.api-sports.io"
      }
    });

    const data = await apiRes.json();

    const fixed = (data.response || []).map(m => ({
      fixture: {
        id: m.fixture.id,
        date: m.fixture.date,
        status: {
          short: m.fixture.status.short,
          long: m.fixture.status.long,
          elapsed: m.fixture.status.elapsed
        }
      },
      league: {
        name: m.league.name,
        country: m.league.country
      },
      teams: {
        home: { name: m.teams.home.name },
        away: { name: m.teams.away.name }
      },
      goals: {
        home: m.goals.home,
        away: m.goals.away
      }
    }));

    return new Response(JSON.stringify({response: fixed}), {
      headers: {
        "Content-Type":"application/json",
        "Access-Control-Allow-Origin":"*",
        "Cache-Control":"no-cache"
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({error: e.message}), {
      status: 500,
      headers: {"Content-Type":"application/json"}
    });
  }
}
