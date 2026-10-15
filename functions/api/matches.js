export async function onRequest(context) {
  const headers = { "Content-type": "application/json", "Access-Control-Allow-Origin": "*" };
  const safe = (o) => new Response(JSON.stringify(o, null, 2), { headers });

  try {
    const url = new URL(context.request.url);
    const dateStr = url.searchParams.get('date') || new Date().toISOString().slice(0,10);
    const KEY = context.env.LIVE_FOOTBALL_API_KEY;

    const apiUrl = `https://live-football-api.com/api/v1/matches?api_key=${KEY}&date=${dateStr}&lang=en`;
    const r = await fetch(apiUrl);
    const text = await r.text();

    let data;
    try { data = JSON.parse(text); } catch { return safe({ raw_text: text.slice(0,500), url: apiUrl }); }

    // Show full structure so we can see where matches dey
    return safe({
      date_requested: dateStr,
      api_url: apiUrl.replace(KEY, "HIDDEN_KEY"),
      success: data.success,
      message: data.message,
      keys_in_data: Object.keys(data),
      matches_count: (data.matches||data.data||data.response||[]).length,
      sample_raw: (data.matches||data.data||[])[0] || "no matches",
      full_data_preview: JSON.stringify(data).slice(0,1000)
    });

  } catch(e){
    return safe({ error: e.message });
  }
}
