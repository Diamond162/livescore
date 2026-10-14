export async function onRequest(context) {
  const url = new URL(context.request.url);
  let dateParam = url.searchParams.get('date') || 'today';
  const todayStr = new Date().toISOString().split('T')[0];

  function toYYYYMMDD(d) { return d.toISOString().split('T')[0]; }

  let targetDate = todayStr;
  if (dateParam === 'today') targetDate = todayStr;
  else if (dateParam === 'yesterday') { let d=new Date(); d.setDate(d.getDate()-1); targetDate=toYYYYMMDD(d); }
  else if (dateParam === 'tomorrow') { let d=new Date(); d.setDate(d.getDate()+1); targetDate=toYYYYMMDD(d); }
  else if (/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) targetDate = dateParam;
  else targetDate = todayStr;

  const API_KEY = context.env.API_FOOTBALL_KEY || context.env.FOOTBALL_API_KEY || 'YOUR_KEY_HERE';

  async function fetchOne(d) {
    const apiUrl = `https://v3.football.api-sports.io/fixtures?date=${d}`;
    const res = await fetch(apiUrl, {
      headers: { 'x-apisports-key': API_KEY, 'x-apisports-host': 'v3.football.api-sports.io' }
    });
    const json = await res.json();
    return json;
  }

  let finalData = await fetchOne(targetDate);
  let finalList = finalData.response || [];

  // If empty, try yesterday/tomorrow like before (for timezone)
  if (finalList.length === 0) {
    try {
      let dt = new Date(targetDate);
      dt.setDate(dt.getDate() - 1);
      let r1 = await fetchOne(toYYYYMMDD(dt));
      if ((r1.response||[]).length > 0) finalList = r1.response;
      else {
        dt = new Date(targetDate);
        dt.setDate(dt.getDate() + 1);
        let r2 = await fetchOne(toYYYYMMDD(dt));
        if ((r2.response||[]).length > 0) finalList = r2.response;
      }
    } catch {}
  }

  // Clean mapping - NO CLUB NAMES, RETURN REAL UTC TIME + REAL ELAPSED MINUTES
  const norm = finalList.map(f => {
    const fix = f.fixture || {};
    const sts = fix.status || {};
    const lg = f.league || {};
    const teams = f.teams || {};
    const goals = f.goals || {};

    // Keep real UTC date from API - frontend will convert to Europe/Berlin automatically
    // Example: 2026-10-14T16:45:00+00:00 -> frontend shows 18:45 Berlin
    // 2026-10-14T19:00:00+00:00 -> frontend shows 21:00 Berlin
    let kickoff = fix.date; // real UTC

    return {
      fixture: {
        id: fix.id,
        date: kickoff,
        status: {
          short: sts.short || 'NS',
          long: sts.long || sts.short || 'Not Started',
          elapsed: sts.elapsed?? null // REAL MINUTES like 15, 67, 88
        }
      },
      league: {
        name: lg.name || 'League',
        country: lg.country || 'WORLD'
      },
      teams: {
        home: { name: teams.home?.name || 'Home' },
        away: { name: teams.away?.name || 'Away' }
      },
      goals: {
        home: goals.home?? null,
        away: goals.away?? null
      }
    };
  });

  return new Response(JSON.stringify({
    response: norm,
    results: norm.length,
    date: targetDate,
    date_used: finalData?.parameters?.date || targetDate
  }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=30"
    }
  });
}
