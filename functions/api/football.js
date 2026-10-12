export async function onRequest(context) {
  const API_KEY = context.env.FOOTBALL_API_KEY || context.env.API_KEY;
  if (!API_KEY) {
    return new Response(JSON.stringify({ status: "error", message: "FOOTBALL_API_KEY missing", matches: [] }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
  const url = new URL(context.request.url);
  const date = url.searchParams.get("date") || new Date().toISOString().split("T")[0];
  const live = url.searchParams.get("live");
  let apiUrl = `https://live-football-api.com/api/v1/matches?api_key=${API_KEY}&date=${date}`;
  if (live) {
    apiUrl = `https://live-football-api.com/api/v1/matches?api_key=${API_KEY}&live=true`;
  }
  try {
    const apiRes = await fetch(apiUrl);
    const data = await apiRes.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=60"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ status: "error", message: err.message, matches: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}
