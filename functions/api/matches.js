export async function onRequestGet(context) {
  var key = context.env.FOOTBALL_API_KEY || context.env.API_KEY || "";
  var urlObj = new URL(context.request.url);
  var date = urlObj.searchParams.get("date") || new Date().toISOString().split("T")[0];
  var lang = urlObj.searchParams.get("lang") || "en";

  if (!key) {
    return new Response(JSON.stringify({ matches: [], error: "No key" }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  try {
    var apiUrl = "https://live-football-api.com/api/v1/matches?api_key=" + key + "&date=" + date + "&lang=" + lang;
    var r = await fetch(apiUrl);
    var text = await r.text();
    var json = {};
    try { json = JSON.parse(text); } catch (e) { json = {}; }

    var raw = json.data || json.matches || [];
    if (!Array.isArray(raw)) { raw = []; }

    var matches = [];
    for (var i = 0; i < raw.length; i++) {
      var m = raw[i];
      var d = (m.date || m.start_time || "").toString().replace(" ", "T");
      matches.push({
        id: m.id || i,
        date: d,
        status: (typeof m.status === "string")? m.status : (m.status && m.status.short)? m.status.short : "NS",
        league: { name: (m.league && m.league.name)? m.league.name : m.league_name || "League", country: (m.league && m.league.country)? m.league.country : m.country || "World" },
        home: { name: (m.home_team && m.home_team.name)? m.home_team.name : m.home_name || "Home" },
        away: { name: (m.away_team && m.away_team.name)? m.away_team.name : m.away_name || "Away" },
        score: { home: (m.home_score!= null? m.home_score : (m.score? m.score.home : 0)), away: (m.away_score!= null? m.away_score : (m.score? m.score.away : 0)) }
      });
    }

    return new Response(JSON.stringify({ matches: matches }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=30" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ matches: [], error: err.message }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}
