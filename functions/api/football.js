export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];

  // CACHE KEY - This protects you from FotMob block
  const cacheKey = new Request(`https://livescore-cache/${date}`, request);
  const cache = caches.default;

  // 1. Check cache first
  let response = await cache.match(cacheKey);
  if (response) {
    const headers = new Headers(response.headers);
    headers.set('X-Cache', 'HIT');
    headers.set('Access-Control-Allow-Origin', '*');
    return new Response(response.body, { status: response.status, headers });
  }

  // 2. Not in cache - fetch FotMob
  try {
    const fotmobUrl = `https://www.fotmob.com/api/matches?date=${date}&ccode3=ENG`;
    const fotRes = await fetch(fotmobUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.fotmob.com/',
        'Origin': 'https://www.fotmob.com'
      },
      cf: { cacheTtl: 120, cacheEverything: false }
    });

    const data = await fotRes.json();
    let matches = [];

    if (data && data.leagues) {
      data.leagues.forEach(league => {
        if (!league.matches) return;
        league.matches.forEach(m => {
          matches.push({
            league: {
              name: league.name || 'Unknown League',
              country: league.ccode || league.country || 'INT',
              flag: league.ccode || 'INT'
            },
            teams: {
              home: { name: m.home?.name || 'Home', logo: m.home?.id },
              away: { name: m.away?.name || 'Away', logo: m.away?.id }
            },
            fixture: {
              date: m.time || m.status?.time || new Date().toISOString(),
              status: {
                short: m.status?.live? 'LIVE' : m.status?.finished? 'FT' : m.status?.started? 'LIVE' : 'NS',
                elapsed: m.status?.elapsed || m.status?.liveTime?.short || null
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

    const body = JSON.stringify({ response: matches });

    response = new Response(body, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=120, s-maxage=120',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'X-Cache': 'MISS'
      }
    });

    // 3. Save to cache for 120 sec - 100k fans = 1 hit to FotMob
    context.waitUntil(cache.put(cacheKey, response.clone()));

    return response;

  } catch (err) {
    return new Response(JSON.stringify({ response: [], error: err.message }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
