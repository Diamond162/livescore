export async function onRequest(context) {
  try {
    const key = context.env.FOOTBALL_API_KEY;
    if (!key) {
      return new Response(JSON.stringify({ status: "error", message: "FOOTBALL_API_KEY not set in Cloudflare Pages > Settings > Variables" }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const url = new URL(context.request.url);
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    const lang = url.searchParams.get('lang') || 'en';

    const apiUrl = `https://live-football-api.com/api/v1/matches?api_key=${key}&date=${date}&lang=${lang}`;

    const r = await fetch(apiUrl, { headers: { "Accept": "application/json" } });
    const text = await r.text();

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      return new Response(JSON.stringify({ status: "error", message: "Live API returned non-JSON", raw: text.slice(0, 800) }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    return new Response(JSON.stringify(json), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=60"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ status: "error", message: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}
