export async function onRequest(context) {
  const API_KEY = context.env.API_KEY;

  if (!API_KEY) {
    return new Response(JSON.stringify({ error: "API_KEY missing in Cloudflare env", response: [] }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  const url = new URL(context.request.url);
  const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
  const league = url.searchParams.get('league');
  const live = url.searchParams.get('live');

  let apiUrl = `https://v3.football.api-sports.io/fixtures?date=${date}`;
  if (live === 'all') apiUrl = `https://v3.football.api-sports.io/fixtures?live=all`;
  if (league) apiUrl += `&league=${league}`;

  try {
    const apiRes = await fetch(apiUrl, {
      headers: {
        "x-apisports-key": API_KEY,
        "x-rapidapi-host": "v3.football.api-sports.io"
      }
    });

    const data = await apiRes.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Cache-Control": "public, max-age=180",
        "CDN-Cache-Control": "max-age=180",
        "Cloudflare-CDN-Cache-Control": "max-age=180"
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({
      error: err.message,
      response: [],
      note: "Wait 60 seconds, free plan is rate limited"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=60"
      }
    });
  }
}
