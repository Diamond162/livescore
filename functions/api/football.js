export async function onRequest(context) {
  const url = new URL(context.request.url);
  const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];

  // Your live-football-api.com key
  const API_KEY = context.env.FOOTBALL_API_KEY || context.env.API_FOOTBALL_KEY || context.env.LIVE_FOOTBALL_API_KEY || context.env.API_KEY;

  if (!API_KEY) {
    return new Response(JSON.stringify({response: [], error: "No API key in env"}), {
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    // YOUR API endpoint
    const apiUrl = `https://live-football-api.com/api/v1/matches?api_key=${API_KEY}&date=${date}&lang=en`;

    const res = await fetch(apiUrl);
    const json = await res.json();

    // live-football-api returns { status, matches: [...] } or { data: { matches } }
    let rawMatches = json.matches || json.data?.matches || json.data || [];

    // Map to your frontend format
    const fixed = rawMatches.map(m => {
      // Handle time - live-football-api uses kickoff or time
      let kickoff = m.kickoff || m.time || m.date || `${date}T${m.time_str || '15:00:00'}+00:00`;
      if (typeof kickoff === 'number') {
        kickoff = new Date(kickoff * 1000).toISOString();
      }
      // If date is YYYY-MM-DD and time is HH:MM, combine
      if (m.date && m.time &&!kickoff.includes('T')) {
        kickoff = `${m.date}T${m.time}:00+00:00`;
      }

      // Status
      let short = "NS";
      const s = (m.status || "").toUpperCase();
      if (s.includes("LIVE") || s === "IN PLAY" || s.includes("1H") || s.includes("2H")) short = "LIVE";
      else if (s === "FT" || s === "FINISHED" || s.includes("FINISH")) short = "FT";
      else short = "NS";

      return {
        fixture: {
          id: m.id,
          date: kickoff,
          status: { short: short, long: m.status }
        },
        league: {
          name: m.league?.name || m.competition?.name || m.league_name || "League",
          country: m.league?.country || m.country || "World"
        },
        teams: {
          home: { name: m.home?.name || m.home_name || "Home" },
          away: { name: m.away?.name || m.away_name || "Away" }
        },
        goals: {
          home: m.score?.home?? m.home_score?? null,
          away: m.score?.away?? m.away_score?? null
        }
      };
    });

    return new Response(JSON.stringify({ response: fixed, credits: json.credits_used }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (e) {
    return new Response(JSON.stringify({ response: [], error: e.message }), {
      headers: { "Content-Type": "application/json" }
    });
  }
}
