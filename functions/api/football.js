export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const dateParam = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
  const fotmobDate = dateParam.replaceAll('-', '');
  const force = url.searchParams.get('v');

  // CACHE KEY change with v to kill old 0 cache
  const cacheKey = new Request(`https://livescore-cache-v2/${dateParam}/${force||'1'}`, request);
  const cache = caches.default;

  let response = await cache.match(cacheKey);
  if (response &&!force) {
    return new Response(response.body, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-Cache': 'HIT'
      }
    });
  }

  try {
    const fotmobUrl = `https://www.fotmob.com/api/matches?date=${fotmobDate}&ccode3=ENG`;

    const fotRes = await fetch(fotmobUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://www.fotmob.com/',
        'x-mas': 'eyJib2R5Ijp7InVybCI6Ii9hcGkvbWF0Y2hlcz9kYXRlPTIwMjYxMDEzIn0sInNpZ25hdHVyZSI6Ik5PIn0='
      },
      cf: { cacheTtl: 60 }
    });

    const text = await fotRes.text();
    let data;
    try { data = JSON.parse(text); } catch { data = {}; }

    let matches = [];

    // NEW FOTMOB FORMAT - they put matches inside leagues array
    if (data && data.leagues) {
      for (const league of data.leagues) {
        for (const m of (league.matches || [])) {
          matches.push({
            league: {
              name: league.name || 'League',
              country: league.ccode || 'INT',
              flag: league.ccode || 'INT'
            },
            teams: {
              home: { name: m.home?.name || m.home?.longName || 'Home', logo: m.home?.id },
              away: { name: m.away?.name || m.away?.longName || 'Away', logo: m.away?.id }
            },
            fixture: {
              date: m.status?.utcTime || m.time || new Date().toISOString(),
              status: {
                short: m.status?.finished? 'FT' : m.status?.started? (m.status?.live? 'LIVE' : 'HT') : 'NS',
                elapsed: m.status?.reason?.short || m.status?.liveTime?.short || ''
              }
            },
            goals: { home: m.home?.score?? null, away: m.away?.score?? null }
          });
        }
      }
    }

    // If still 0, return raw keys so we can debug
    if (matches.length === 0) {
      const debug = {
        response: [],
        _debug: {
          fotmobDate,
          hasLeagues:!!data?.leagues,
          leaguesCount: data?.leagues?.length || 0,
          rawKeys: data? Object.keys(data).slice(0,10) : [],
          firstLeagueSample: data?.leagues?.[0]? Object.keys(data.leagues[0]) : []
        }
      };
      return new Response(JSON.stringify(debug), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'X-Cache': 'DEBUG' }
      });
    }

    const body = JSON.stringify({ response: matches });
    response = new Response(body, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=30',
        'Access-Control-Allow-Origin': '*',
        'X-Cache': 'MISS'
      }
    });

    context.waitUntil(cache.put(cacheKey, response.clone()));
    return response;

  } catch (e) {
    return new Response(JSON.stringify({ response: [], error: e.message }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
