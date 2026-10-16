export async function onRequestGet(context) {
  var key = context.env.FOOTBALL_API_KEY || context.env.API_KEY || "";
  var urlObj = new URL(context.request.url);
  var reqDate = urlObj.searchParams.get("date") || new Date().toISOString().split("T")[0];
  var lang = urlObj.searchParams.get("lang") || "en";

  if (!key) {
    return new Response(JSON.stringify({ matches: [], error: "No API key in Cloudflare env" }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  var apiUrl = "https://live-football-api.com/api/v1/matches?api_key=" + key + "&date=" + reqDate + "&lang=" + lang;

  try {
    var res = await fetch(apiUrl);
    var txt = await res.text();

    // If API returned HTML (error page) not JSON, handle it
    if (txt.trim().startsWith("<")) {
      return new Response(JSON.stringify({ matches: [], error: "API returned HTML, not JSON", date: reqDate, raw_preview: txt.slice(0,200) }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    var j = {};
    try { j = JSON.parse(txt); } catch(e){ j = {}; }

    var raw = j.data || j.matches || [];
    if (!Array.isArray(raw)) raw = [];

    var matches = [];
    for (var i=0;i<raw.length;i++){
      var m=raw[i];
      var dStr=(m.date||m.start_time||"").toString().replace(" ","T");
      var st = m.status;
      if (typeof st!== "string") { if (st && st.short) st = st.short; else st = "NS"; }
      var leagueName = (m.league && m.league.name)? m.league.name : (m.league_name || "League");
      var countryName = (m.league && m.league.country)? m.league.country : (m.country || "World");
      var homeName = (m.home_team && m.home_team.name)? m.home_team.name : (m.home_name || "Home");
      var awayName = (m.away_team && m.away_team.name)? m.away_team.name : (m.away_name || "Away");
      var hs = (m.home_score!= null)? m.home_score : 0;
      var as = (m.away_score!= null)? m.away_score : 0;
      if (m.score) { if (m.score.home!= null) hs = m.score.home; if (m.score.away!= null) as = m.score.away; }
      matches.push({ id: m.id || i, date: dStr, status: st, league: { name: leagueName, country: countryName }, home: { name: homeName }, away: { name: awayName }, score: { home: hs, away: as } });
    }

    return new Response(JSON.stringify({ matches: matches, date: reqDate, count: matches.length }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=20" }
    });

  } catch(e){
    return new Response(JSON.stringify({ matches: [], error: e.message, date: reqDate }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}
