export async function onRequestGet(context) {
  var key = context.env.FOOTBALL_API_KEY || context.env.API_KEY || "";
  var urlObj = new URL(context.request.url);
  var reqDate = urlObj.searchParams.get("date") || new Date().toISOString().split("T")[0];
  var lang = urlObj.searchParams.get("lang") || "en";
  if (!key) { return new Response(JSON.stringify({ matches: [] }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }); }
  async function fetchForDate(d) {
    var apiUrl = "https://live-football-api.com/api/v1/matches?api_key=" + key + "&date=" + d + "&lang=" + lang;
    try { var r = await fetch(apiUrl); var txt = await r.text(); var j = JSON.parse(txt); var raw = j.data || j.matches || []; if (!Array.isArray(raw)) raw = []; return raw; } catch (e) { return []; }
  }
  var raw = await fetchForDate(reqDate);
  if (raw.length === 0) {
    var tries = [-1,1,-2,2,-3,3,-4,4];
    for (var k = 0; k < tries.length; k++) {
      var dt = new Date(reqDate); dt.setDate(dt.getDate() + tries[k]); var iso = dt.toISOString().split("T")[0];
      var r2 = await fetchForDate(iso); if (r2.length > 0) { raw = r2; break; }
    }
  }
  var matches = [];
  for (var i = 0; i < raw.length; i++) {
    var m = raw[i]; var dStr = (m.date || m.start_time || "").toString().replace(" ", "T");
    matches.push({
      id: m.id || i, date: dStr,
      status: (typeof m.status === "string")? m.status : (m.status && m.status.short)? m.status.short : "NS",
      league: { name: (m.league && m.league.name)? m.league.name : m.league_name || "League", country: (m.league && m.league.country)? m.league.country : m.country || "World" },
      home: { name: (m.home_team && m.home_team.name)? m.home_team.name : m.home_name || "Home" },
      away: { name: (m.away_team && m.away_team.name)? m.away_team.name : m.away_name || "Away" },
      score: { home: (m.home_score!= null? m.home_score : (m.score? m.score.home : 0)), away: (m.away_score!= null? m.away_score : (m.score? m.score.away : 0)) }
    });
  }
  return new Response(JSON.stringify({ matches: matches }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=20" } });
}
