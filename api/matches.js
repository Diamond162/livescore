export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  const KEY = process.env.LIVE_FOOTBALL_API_KEY;
  if(!KEY) return res.status(200).json({ data: [], error: "Missing API KEY" });
  const date = new Date().toISOString().split('T')[0];
  const url = `https://live-football-api.com/api/v1/matches?api_key=${KEY}&date=${date}&lang=en`;
  try {
    const r = await fetch(url);
    const txt = await r.text();
    let j; try{ j=JSON.parse(txt); }catch{ return res.status(200).json({ data: [], error: txt.slice(0,400) }); }
    const matches = j?.data?.matches || j?.data || j?.matches || [];
    return res.status(200).json({ data: Array.isArray(matches)?matches:[], count: matches.length, date });
  } catch(e) { return res.status(200).json({ data: [], error: e.message }); }
}
