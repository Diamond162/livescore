export async function onRequest(context) {
  const API_KEY = context.env.API_KEY;

  if (!API_KEY) {
    return new Response(JSON.stringify({ error: "API_KEY not set" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  const url = new URL(context.request.url);
  const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];

  const apiRes = await fetch(`https://v3.football.api-sports.io/fixtures?date=${date}`, {
    headers: {
      "x-apisports-key": API_KEY,
      "x-apisports-host": "v3.football.api-sports.io"
    }
  });

  const data = await apiRes.json();

  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=60"
    }
  });
}
