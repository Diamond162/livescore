export async function onRequest(context) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };
  const send = (obj) => new Response(JSON.stringify(obj), { headers });

  try {
    const reqUrl = new URL(context.request.url);
    const dateStr = reqUrl.searchParams.get("date") || "2026-10-15";
    const KEY = context.env.LIVE_FOOTBALL_API_KEY;

    if (!KEY) return send({ response: [], debug: "KEY IS MISSING" });

    // Your method - no RapidAPI header
    const apiUrl = `https://live-football-api1.p.rapidapi.com/api/v1/matches?api_key=${KEY}&date=${dateStr}`;

    const res = await fetch(apiUrl);
    const txt = await res.text();

    // RETURN EVERYTHING RAW SO WE CAN SEE
    return send({ 
      debug_url: apiUrl.replace(KEY, "HIDDEN_KEY"),
      status: res.status,
      raw_response: txt.slice(0, 2000),  // Show first 2000 chars
      date_used: dateStr
    });

  } catch (e) {
    return send({ response: [], error: e.message, stack: e.stack });
  }
}
