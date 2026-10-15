export async function onRequest(context) {
  try {
    const key = context.env.FOOTBALL_API_KEY;
    if (!key) return new Response(JSON.stringify({status:"error", message:"FOOTBALL_API_KEY missing in Cloudflare Vars"}), {status:500, headers:{"Content-Type":"application/json"}});

    const url = new URL(context.request.url);
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    const lang = url.searchParams.get('lang') || 'en';

    const apiUrl = `https://live-football-api.com/api/v1/matches?api_key=${key}&date=${date}&lang=${lang}`;
    const r = await fetch(apiUrl);
    const text = await r.text();

    // If API returns error, show it
    let json;
    try { json = JSON.parse(text); } catch { json = {status:"error", raw:text.slice(0,800)}; }

    return new Response(JSON.stringify(json), {
      headers: {"Content-Type":"application/json", "Access-Control-Allow-Origin":"*", "Cache-Control":"public, max-age=60"}
    });
  } catch(e) {
    return new Response(JSON.stringify({status:"error", message:e.message, stack:e.stack}), {status:500, headers:{"Content-Type":"application/json"}});
  }
}
