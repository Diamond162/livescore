export async function onRequest(context) {
  const KEY = context.env.LIVE_API_KEY || "1002e16c0cc32859e846908c86dcc97833114b45950612d7cf7adef87f15f8ce";
  const today = new Date().toISOString().split('T')[0];

  try {
    const url = `https://www.live-football-api.com/api/v1/matches?api_key=${KEY}&date=${today}&lang=en`;
    const res = await fetch(url);
    const json = await res.json();
    let raw = json.data || [];
    if (!Array.isArray(raw)) {
      let flat = [];
      Object.values(raw).forEach(v => { if (Array.isArray(v)) flat = flat.concat(v); });
      raw = flat;
    }

    let matches = raw.map((m,i)=>{
      // Try to get REAL time - check EVERY possible field
      let realTime = null;
      let dObj = null;

      if (m.timestamp) {
        dObj = new Date(m.timestamp * 1000);
      } else if (m.datetime) {
        dObj = new Date(m.datetime);
      } else if (m.date_time) {
        dObj = new Date(m.date_time);
      } else if (m.kickoff) {
        dObj = new Date(m.kickoff);
      } else if (m.date && m.time && m.time!== "00:00") {
        dObj = new Date(`${m.date}T${m.time}`);
      }

      if (dObj &&!isNaN(dObj)) {
        realTime = dObj.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit', timeZone:'Europe/Berlin' });
        // If API time was 00:00 UTC, it becomes 02:00 Berlin - still valid
        // But if raw time was 00:00 and timestamp is also midnight, skip it
        const hour = dObj.getUTCHours();
        if (hour === 0 && m.time === "00:00" &&!m.timestamp) realTime = null;
      } else if (m.time && m.time!== "00:00" && m.time.includes(':')) {
        realTime = m.time.slice(0,5);
      }

      const statusStr = String(m.status || "").toLowerCase();
      const isLive = statusStr.includes('live');
      const isFT = statusStr.includes('finish') || statusStr === '3';

      return {
        fixture: {
          id: m.id || i,
          time: realTime || "00:00",
          _realTime: realTime, // for sorting
          status: { short: isLive? 'LIVE' : isFT? 'FT' : 'UPCOMING', display: isLive? 'LIVE' : isFT? 'FT' : (realTime || 'UPCOMING') }
        },
        league: { name: m.league?.name || m.competition || 'Football', country: m.league?.country || 'World' },
        teams: { home: { name: m.home_team || 'Home' }, away: { name: m.away_team || 'Away' } },
        goals: { home: m.home_score?? null, away: m.away_score?? null },
        _hasTime:!!realTime
      };
    });

    // SORT: Real time matches first, then LIVE, then 00:00 last
    matches.sort((a,b)=>{
      if (a._hasTime &&!b._hasTime) return -1;
      if (!a._hasTime && b._hasTime) return 1;
      if (a.fixture.status.short === 'LIVE') return -1;
      if (b.fixture.status.short === 'LIVE') return 1;
      return 0;
    });

    // Keep only matches with real time OR LIVE/FT - hide 00:00 UPCOMING if too many
    let withTime = matches.filter(m => m._hasTime || m.fixture.status.short!== 'UPCOMING');
    if (withTime.length < 10) withTime = matches; // if not enough, show all

    // Clean up internal fields
    const final = withTime.slice(0,100).map(m=>{
      delete m._realTime; delete m._hasTime;
      return m;
    });

    return new Response(JSON.stringify(final), {
      headers: { "Content-Type":"application/json", "Access-Control-Allow-Origin":"*", "Cache-Control":"public, max-age=600" }
    });

  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), { headers: { "Access-Control-Allow-Origin":"*" } });
  }
}
