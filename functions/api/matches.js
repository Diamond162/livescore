export async function onRequest(context) {
  const headers = { "Content-type": "application/json", "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" };
  const safe = (o) => new Response(JSON.stringify(o), { headers });

  const findTimeString = (obj) => {
    // Look deep for any time like "18:45" or "21:00:00"
    const regex = /([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?/;
    const stack = [obj];
    while (stack.length) {
      let cur = stack.pop();
      if (!cur) continue;
      if (typeof cur === 'string') {
        let m = cur.match(regex);
        if (m) return m[0].substring(0,5);
      }
      if (typeof cur === 'number' && cur > 1000000000 && cur < 3000000000) {
        // possible timestamp in seconds
        return cur;
      }
      if (typeof cur === 'object') {
        for (let k in cur) {
          if (['time','kickoff','start','utc','hour','timestamp','kickoff_time','start_time','time_utc','utcTime','date','datetime','kick_off'].includes(k.toLowerCase())) {
            stack.push(cur[k]);
          }
        }
      }
    }
    return null;
  };

  try {
    const url = new URL(context.request.url);
    const todayReal = new Date().toISOString().slice(0,10);
    const dateStr = url.searchParams.get('date') || todayReal;
    const KEY = context.env.LIVE_FOOTBALL_API_KEY;

    if (!KEY) return safe({ response: [], message: "KEY MISSING" });

    const apiUrl = `https://live-football-api.com/api/v1/matches?api_key=${KEY}&date=${dateStr}&lang=en`;
    const r = await fetch(apiUrl);
    const text = await r.text();
    if (text.trim().startsWith('<')) return safe({ response: [] });

    let data = JSON.parse(text);
    let matches = data.matches || [];

    const out = matches.map(m => {
      let berlinTime = null;
      let rawDate = dateStr;

      // 1. Try timestamp directly
      if (m.timestamp) {
        const d = new Date((m.timestamp > 10000000000? m.timestamp : m.timestamp*1000));
        berlinTime = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
        rawDate = d.toISOString();
      }

      // 2. Try direct time fields
      if (!berlinTime) {
        let t = m.time || m.Time || m.kickoff_time || m.start_time || m.utcTime || m.time_utc || m.kickoff || m.start;
        if (t) {
          // If t is number -> timestamp
          if (typeof t === 'number') {
            const d = new Date(t > 10000000000? t : t*1000);
            berlinTime = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
          } else if (typeof t === 'string') {
            let match = t.match(/(\d{1,2}:\d{2})/);
            if (match) berlinTime = match[1];
          }
        }
      }

      // 3. Try deep search for any time string inside object
      if (!berlinTime) {
        let found = findTimeString(m);
        if (typeof found === 'string' && found.includes(':')) berlinTime = found;
        else if (typeof found === 'number') {
          const d = new Date(found > 10000000000? found : found*1000);
          berlinTime = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
        }
      }

      // 4. Last resort - if still no time, use date field
      if (!berlinTime && m.date) {
        const d = new Date(m.date);
        if (!isNaN(d) && m.date.includes(':')) {
          berlinTime = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
        }
      }

      // If still no time, show time as "-" instead of TBD to look like FlashScore does for postponed
      if (!berlinTime) berlinTime = "-";

      let s = (m.status || "").toString().toLowerCase();
      let short = "NS";
      if (s.includes("live") || s.includes("progress")) short = "LIVE";
      else if (s.includes("ft") || s.includes("finished") || s.includes("final")) short = "FT";
      else if (s.includes("ht")) short = "HT";

      return {
        id: m.id || Math.random(),
        berlinTime: berlinTime,
        fixture: { date: rawDate, berlinTime: berlinTime, status: { short: short } },
        teams: { home: { name: m.home?.name || "Home" }, away: { name: m.away?.name || "Away" } },
        goals: { home: m.score?.home?? 0, away: m.score?.away?? 0 },
        league: { name: m.league?.name || "League" }
      };
    });

    out.sort((a,b) => {
      if (a.berlinTime === "-") return 1;
      if (b.berlinTime === "-") return -1;
      return a.berlinTime.localeCompare(b.berlinTime);
    });

    return safe({ response: out });

  } catch (e) {
    return safe({ response: [], message: e.message });
  }
}
