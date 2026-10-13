export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const date = url.searchParams.get('date') || new Date().toISOString().slice(0,10);

  // 1. Try Cloudflare Cache first - this is the protection
  const cacheKey = new Request(`https://livescore-cache/${date}`, request);
  const cache = caches.default;
  let response = await cache.match(cacheKey);

  if (response) {
    // Return from cache - FotMob no go even know
    const newHeaders = new Headers(response.headers);
    newHeaders.set('X-Cache', 'HIT');
    newHeaders.set('Access-Control-Allow-Origin', '*');
    return new Response(response.body, { headers: newHeaders });
  }

  // 2. If not in cache, hit FotMob with safe headers
  try {
    const fotmobUrl = `https://www.fotmob.com/api/matches?date=${date}&ccode3=ENG`;
    
    const fotmobRes = await fetch(fotmobUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.fotmob.com/',
        'Origin': 'https://www.fotmob.com'
      }
    });

    let data = await fotmobRes.json();
    
    // Convert to your format if needed
    let matches = [];
    if (data.leagues) {
      data.leagues.forEach(league => {
        league.matches.forEach(m => {
          matches.push({
            league: { name: league.name, country: league.ccode || 'INT' },
            teams: { home: { name: m.home.name }, away: { name: m.away.name } },
            fixture: { date: m.time, status: { short: m.status?.live ? 'LIVE' : m.status?.finished ? 'FT' : 'NS', elapsed: m.status?.elapsed } },
            goals: { home: m.home.score, away: m.away.score }
          });
        });
      });
    }

    const jsonResponse = JSON.stringify({ response: matches });

    // 3. SAVE TO CACHE for 60 seconds - Very important
    response = new Response(jsonResponse, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60, s-maxage=60',
        'Access-Control-Allow-Origin': '*',
        'X-Cache': 'MISS'
      }
    });

    // Store in Cloudflare edge cache
    context.waitUntil(cache.put(cacheKey, response.clone()));

    return response;

  } catch (e) {
    // If FotMob fail, return cached stale or empty
    return new Response(JSON.stringify({ response: [] }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
