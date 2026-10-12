export async function onRequest(context) {
  const KEY = "1002e16c0cc32859e846908c86dcc97833114b45950612d7cf7adef87f15f8ce";
  const API_KEY = context.env.LIVE_API_KEY || KEY;
  const today = new Date().toISOString().split('T')[0];

  // Get RAW data
  const url = `https://live-football-api.com/api/v1/matches?api_key=${API_KEY}&date=${today}&lang=en`;
  const res = await fetch(url);
  const json = await res.json();

  // Return first 2 raw matches so we can see real field names
  let raw = json.data || json.matches || [];
  if (!Array.isArray(raw) && typeof raw === 'object') {
    let flat = [];
    Object.values(raw).forEach(v=>{ if(Array.isArray(v)) flat=flat.concat(v) });
    raw = flat;
  }

  // Show us the raw keys
  return new Response(JSON.stringify({
    url_used: url,
    total: raw.length,
    first_match_raw: raw[0],
    second_match_raw: raw[1],
    all_keys: raw[0]? Object.keys(raw[0]) : []
  }, null, 2), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}
