export async function onRequest(context) {
  const apiKey = context.env.FOOTBALL_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({error: "FOOTBALL_API_KEY not set"}), {status: 500});
  }

  const url = new URL(context.request.url);
  const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
  const lang = url.searchParams.get('lang') || 'en';

  // Caching to save your 500 credits (1/min)
  const cache = caches.default;
  const cacheKey = new Request(url.toString());
  let response = await cache.match(cacheKey);
  if (response) {
    return response;
  }

  const apiUrl = `https://live-football-api.com/api/v1/matches?api_key=${apiKey}&date=${date}&lang=${en}`;
  // Corrected - use lang param
  const apiUrlFixed = `https://live-football-api.com/api/v1/matches?api_key=${apiKey}&date=${date}&lang=${lang}`;

  const fetchRes = await fetch(apiUrlFixed);
  const data = await fetchRes.json();

  // data = {status:"success", matches:[...] }
  const finalRes = new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60",
      "Access-Control-Allow-Origin": "*"
    }
  });

  // Store in cache 60s
  context.waitUntil(cache.put(cacheKey, finalRes.clone()));
  return finalRes;
}
