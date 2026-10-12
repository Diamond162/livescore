export async function onRequest(context) {
  const MY_API_KEY = "1002e16c0cc32859e846908c86dcc97833114b45950612d7cf7adef87f15f8ce";
  const API_KEY = context.env.LIVE_API_KEY || MY_API_KEY;

  try {
    // Try live-football-api.com official endpoint
    const endpoints = [
      `https://live-football-api.com/api/matches?apikey=${API_KEY}&lang=en`,
      `https://api.live-football-api.com/api/v1/matches?apikey=${API_KEY}`,
      `https://live-football-api.com/api/v1/matches?key=${API_KEY}`
    ];

    let data = null;
    for (let url of endpoints) {
      try {
        const r = await fetch(url, { headers: { "Accept": "application/json" } });
        if (r.ok) {
          const j = await r.json();
          if (j && (j.data || j.matches || Array.isArray(j))) {
            data = j;
            break;
          }
        }
      } catch (e) { continue; }
    }

    if (!data) throw new Error("All endpoints failed");

    let raw = data.data || data.matches || data;
    if (!Array.isArray(raw) && typeof raw === 'object') {
      let flat = [];
      Object.values(raw).forEach(v => { if (Array.isArray(v)) flat = flat.concat(v); });
      if (flat.length > 0) raw = flat;
      else raw = [raw];
    }

    const matches = raw.slice(0, 150).map((m, i) => {
      const isLive = m.status === 'live' || m.status === 2 || m.status === 'in_progress' || m.minute;
      const isFinished = m.status === 'finished' || m.status === 3 || m.status === 'FT' || m.status === 'finished';

      let short = 'UPCOMING';
      let display = m.time || (
