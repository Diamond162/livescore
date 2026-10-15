export async function onRequest(context) {
  try {
    const apiKey = context.env.FOOTBALL_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({error: "FOOTBALL_API_KEY not set in Cloudflare"}), {status: 500, headers: {"Content-Type":"application/json"}});
    }

    const reqUrl = new URL(context.request.url);
    const date = reqUrl.searchParams.get('date') || new Date().toISOString().split('T')[0];
    const lang = reqUrl.searchParams.get('lang') || 'en';

    const apiUrl = `https://live-football-api.com/api/v1/matches?api_key=${apiKey}&date=${date}&lang=${lang}`;

    const res = await fetch(apiUrl);
    const text = await res.text();

    // Try parse json, if fails show raw
    let data;
    try {
      data = JSON.parse(text);
    } catch(e) {
      return new Response(JSON.stringify({error: "API returned HTML, not JSON", raw: text.substring(0,500)}), {status:500, headers:{"Content-Type":"application/json"}});
    }

    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=60"
      }
    });
  } catch(err) {
    return new Response(JSON.stringify({error: err.message}), {status:500, headers:{"Content-Type":"application/json"}});
  }
}
