export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const dateParam = url.searchParams.get('date') || new Date().toISOString().split('T')[0]; // 2026-10-13
  const fotmobDate = dateParam.replaceAll('-', ''); // 20261013 for FotMob

  const cacheKey = new Request(`https://livescore-cache/${dateParam}`, request);
  const cache = caches.default;

  let response = await cache.match(cacheKey);
  if (response) {
    const h = new Headers(response.headers);
    h.set('X-Cache', 'HIT');
    h.set('Access-Control-Allow-Origin', '*');
    return new Response(response.body, { headers: h });
  }

  try {
    // CORRECT FOTMOB URL
    const fotmobUrl = `https://www.fotmob.com/api/matches?date=${fotmobDate}`;

    const fotRes = await fetch(fotmobUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': '*/*',
        'Referer': 'https://www.fotmob.com/'
      }
    });

    const data = await fotRes.json();
    let matches = [];

    if (data?.leagues) {
      data.leagues.forEach(league => {
        (league.matches || []).forEach(m => {
          matches.push({
            league: { name: league.name, country: league.ccode || 'INT', flag: league.ccode },
            teams: {
              home: { name: m.home?.name, logo: m.home?.id },
              away: { name: m.away?.name, logo: m.away?.id }
            },
            fixture: {
              date: m.timeUTC || m.status?.utcTime || new Date().toISOString(),
              status: {
                short: m.status?.live? 'LIVE' : m.status?.finished? 'FT' : 'NS',
                elapsed: m.status?.reason?.short || m.status?.liveTime?.short || null
              }
            },
            goals: { home: m.home?.score?? null, away: m.away?.score?? null }
          });
        });
      });
    }

    const body = JSON.stringify({ response: matches });
    response = new Response(body, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60, s-maxage=60',
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
