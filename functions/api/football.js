export async function onRequest(context) {
  const API_KEY = "1002e16c0cc32859e846908c86dcc97833114b45950612d7cf7adef87f15f8ce";
  const key = context.env.LIVE_API_KEY || API_KEY;

  // Get today's date YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0];

  try {
    const url = `https://live-football-api.com/api/v1/matches?api_key=${key}&date=${today}&lang=en`;

    const res = await fetch(url, {
      headers: { "Accept": "application/json" }
    });

    const data = await res.json();

    // The API returns { data: [...] } or direct array
    let raw = data.data || data.matches || data;
    if (!Array.isArray(raw)) {
      if (raw && typeof raw === 'object') {
        // Check if grouped by league
        let flat = [];
        Object.values(raw).forEach(v => {
          if (Array.isArray(v)) flat = flat.concat(v);
          else if (v && v.matches) flat = flat.concat(v.matches);
        });
        if (flat.length > 0) raw = flat;
        else raw = [raw];
      } else raw = [];
    }

    if (raw.length === 0) throw new Error("No matches today - trying without date");

    const matches = raw.slice(0, 150).map((m, i) => {
      const status = (m.status || '').toString().toLowerCase();
      const isLive = status.includes('live') || m.live || m.minute > 0;
      const isFinished = status.includes('finish') || status.includes('ft') || status === '3';

      let short = 'UPCOMING';
      let display = m.time || '00:00';
      if (isLive) { short = 'LIVE'; display = m.minute? `${m.minute}'` : 'LIVE'; }
      else if (isFinished) { short = 'FT'; display = 'FT'; }

      return {
        fixture: {
          id: m.id || i,
          time: m.time || display,
          status: { short: short, display: display }
        },
        league: {
          name: m.league?.name || m.competition?.name || m.league_name || 'Football',
          country: m.league?.country || m.competition?.country || m.country || 'WORLD'
        },
        teams: {
          home: { name: m.home_team || m.home?.name || m.home_name || 'Home' },
          away: { name: m.away_team || m.away?.name || m.away_name || 'Away' }
        },
        goals: {
          home: m.home_score?? m.home_goals?? m.score?.home?? null,
          away: m.away_score?? m.away_goals?? m.score?.away?? null
        }
      };
    });

    return new Response(JSON.stringify(matches), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=30"
      }
    });

  } catch (e) {
    // Try without date if today fails
    try {
      const url2 = `https://live-football-api.com/api/v1/matches?api_key=${key}&lang=en`;
      const res2 = await fetch(url2);
      const data2 = await res2.json();
      let raw2 = data2.data || [];
      if (raw2.length > 0) {
        const matches = raw2.slice(0,100).map((m,i)=>({
          fixture:{id:m.id||i,time:m.time||'00:00',status:{short:m.status==='live'?'LIVE':m.status==='finished'?'FT':'UPCOMING',display:m.time||m.status}},
          league:{name:m.league?.name||'Football',country:m.league?.country||'WORLD'},
          teams:{home:{name:m.home_team||'Home'},away:{name:m.away_team||'Away'}},
          goals:{home:m.home_score??null,away:m.away_score??null}
        }));
        return new Response(JSON.stringify(matches), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }
    } catch(e2) {}

    return new Response(JSON.stringify({ error: e.message, hint: "Check API key and credits" }), { status: 500, headers: { "Access-Control-Allow-Origin": "*" } });
  }
}
