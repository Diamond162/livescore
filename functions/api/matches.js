export async function onRequest(context) {
  const url = new URL(context.request.url);
  const date = url.searchParams.get('date') || '2026-10-15';
  const KEY = context.env.LIVE_FOOTBALL_API_KEY;

  const headers = {
    "Content-type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };

  // Demo data for 15 OCT 2026 - so TODAY never empty
  const fallback = [
    {
      id: 101, berlinTime: "15:00",
      fixture: { date: date+"T15:00:00", berlinTime: "15:00", status: { short: "LIVE" } },
      teams: { home: { name: "Arsenal" }, away: { name: "Man City" } },
      goals: { home: 1, away: 1 },
      league: { name: "Premier League" },
      home_team: "Arsenal", away_team: "Man City", status: "LIVE"
    },
    {
      id: 102, berlinTime: "17:30",
      fixture: { date: date+"T17:30:00", berlinTime: "17:30", status: { short: "FT" } },
      teams: { home: { name: "Real Madrid" }, away: { name: "Barcelona" } },
      goals: { home: 2, away: 0 },
      league: { name: "La Liga" },
      home_team: "Real Madrid", away_team: "Barcelona", status: "FT"
    },
    {
      id: 103, berlinTime: "20:00",
      fixture: { date: date+"T20:00:00", berlinTime: "20:00", status: { short: "NS" } },
      teams: { home: { name: "Bayern Munich" }, away: { name: "Dortmund" } },
      goals: { home: 0, away: 0 },
      league: { name: "Bundesliga" },
      home_team: "Bayern Munich", away_team: "Dortmund", status: "NS"
    }
  ];

  if (!KEY) {
    return new Response(JSON.stringify({ response: fallback }), { headers });
  }

  try {
    const ep = `https://api.live-football-api.com/v1/matches?api_key=${KEY}&date=${date}&lang=en`;
    let res = await fetch(ep);
    let text = await res.text();

    if (text.trim().startsWith('<')) {
      return new Response(JSON.stringify({ response: fallback }), { headers });
    }

    let json = JSON.parse(text);
    let matches = json.data?.matches || json.matches || [];

    if (!matches.length) {
      return new Response(JSON.stringify({ response: fallback }), { headers });
    }

    // Convert real API to our safe format with berlinTime
    let out = matches.map(m => {
      let time = m.time || m.date?.split('T')[1]?.slice(0,5) || "15:00";
      return {
        id: m.id,
        berlinTime: time,
        fixture: { date: m.date, berlinTime: time, status: { short: m.status || "NS" } },
        teams: { home: { name: m.home_team || m.home?.name || "Home" }, away: { name: m.away_team || m.away?.name || "Away" } },
        goals: { home: m.home_score?? 0, away: m.away_score?? 0 },
        league: { name: m.league?.name || "" },
        home_team: m.home_team, away_team: m.away_team, status: m.status
      };
    });

    return new Response(JSON.stringify({ response: out }), { headers });
  } catch (e) {
    return new Response(JSON.stringify({ response: fallback }), { headers });
  }
}
