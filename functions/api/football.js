export async function onRequest(context) {
  const url = new URL(context.request.url);
  const dateParam = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
  const fotmobDate = dateParam.replaceAll('-', '');

  try {
    const fotmobUrl = `https://www.fotmob.com/api/matches?date=${fotmobDate}`;

    const res = await fetch(fotmobUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://www.fotmob.com/'
      }
    });

    const data = await res.json();
    let matches = [];

    if (data.leagues) {
      data.leagues.forEach(league => {
        (league.matches || []).forEach(m => {
          matches.push({
            league: {
              name: league.name,
              country: league.ccode || 'INT',
              flag: league.ccode
            },
            teams: {
              home: { name: m.home?.name, logo: m.home?.id },
              away: { name: m.away?.name, logo: m.away?.id }
            },
            fixture: {
              date: m.status?.utcTime || new Date().toISOString(),
              status: {
                short: m.status?.finished? 'FT' : m.status?.started? 'LIVE' : 'NS',
                elapsed: m.status?.liveTime?.short || ''
              }
            },
            goals: {
              home: m.home?.score?? null,
              away: m.away?.score?? null
            }
          });
        });
      });
    }

    return new Response(JSON.stringify({ response: matches }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (e) {
    return new Response(JSON.stringify({ response: [], error: e.message }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
