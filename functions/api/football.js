export async function onRequest(context) {
  // PUT YOUR API KEY HERE - replace with your real key from live-football-api.com
  const MY_API_KEY = "PASTE_YOUR_KEY_HERE";
  const API_KEY = context.env.LIVE_API_KEY || MY_API_KEY;

  try {
    // Call your live-football-api
    const res = await fetch(`https://live-football-api.com/api/v1/matches?apikey=${API_KEY}&lang=en`, {
      headers: { "Accept": "application/json" }
    });
    
    const data = await res.json();
    let raw = data.data || data.matches || data || [];
    
    // If API returns object with dates, flatten it
    if (!Array.isArray(raw) && typeof raw === 'object') {
      let flat = [];
      Object.values(raw).forEach(v => {
        if (Array.isArray(v)) flat = flat.concat(v);
      });
      if (flat.length > 0) raw = flat;
    }

    // Convert to Diamond Livescore format
    const matches = raw.slice(0, 100).map((m, i) => {
      const isLive = m.status === 'live' || m.status === 2 || m.time_live;
      const isFinished = m.status === 'finished' || m.status === 3 || m.status === 'FT';
      
      let short = 'UPCOMING';
      let display = m.time || '00:00';
      if (isLive) { short = 'LIVE'; display = m.minute ? `${m.minute}'` : 'LIVE'; }
      else if (isFinished) { short = 'FT'; display = 'FT'; }

      return {
        fixture: {
          id: m.id || i,
          time: m.time || new Date(m.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
          status: { short: short, display: display }
        },
        league: {
          name: m.league?.name || m.competition || 'Football',
          country: m.league?.country || m.country || 'WORLD'
        },
        teams: {
          home: { name: m.home_team || m.home?.name || m.teams?.home || 'Home' },
          away: { name: m.away_team || m.away?.name || m.teams?.away || 'Away' }
        },
        goals: {
          home: m.home_score ?? m.goals?.home ?? m.score?.home ?? null,
          away: m.away_score ?? m.goals?.away ?? m.score?.away ?? null
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
    // Fallback if API fails
    const sample = [
      {fixture:{id:1,time:"19:30",status:{short:"LIVE",display:"52'"}},league:{name:"Premier League",country:"ENGLAND"},teams:{home:{name:"Arsenal"},away:{name:"Man City"}},goals:{home:2,away:1}},
      {fixture:{id:2,time:"18:45",status:{short:"FT",display:"FT"}},league:{name:"La Liga",country:"SPAIN"},teams:{home:{name:"Barcelona"},away:{name:"Real Madrid"}},goals:{home:1,away:1}}
    ];
    return new Response(JSON.stringify(sample), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}
