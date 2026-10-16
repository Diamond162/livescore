export async function onRequestGet(context) {
  var key = context.env.FOOTBALL_API_KEY || context.env.API_KEY || "";
  var urlObj = new URL(context.request.url);
  var reqDate = urlObj.searchParams.get("date") || new Date().toISOString().split("T")[0];
  var lang = urlObj.searchParams.get("lang") || "en";
  var apiUrl = "https://live-football-api.com/api/v1/matches?api_key=" + key + "&date=" + reqDate + "&lang=" + lang;
  try {
    var r = await fetch(apiUrl);
    var txt = await r.text();
    var j = {};
    try { j = JSON.parse(txt); } catch(e){ j={ raw: txt }; }
    var raw = j.data || j.matches || [];
    if (!Array.isArray(raw)) raw = [];
    var matches = [];
    for (var i=0;i<raw.length;i++){
      var m=raw[i]; var dStr=(m.date||m.start_time||"").toString().replace(" ","T");
      matches.push({ id:m.id||i, date:dStr, status:(typeof m.status==="string")?m.status:(m.status&&m.status.short)?m.status.short:"NS", league:{name:(m.league&&m.league.name)?m.league.name:m.league_name||"League",country:(m.league&&m.league.country)?m.league.country:m.country||"World"}, home:{name:(m.home_team&&m.home_team.name)?m.home_team.name:m.home_name||"Home"}, away:{name:(m.away_team&&m.away_team.name)?m.away_team.name:m.away_name||"Away"}, score:{home:(m.home_score!=null?m.home_score:0),away:(m.away_score!=null?m.away_score:0)} });
    }
    return new Response(JSON.stringify({ matches: matches, requested_date: reqDate, api_url_called: apiUrl, api_said: j.message||j.error||"ok", credits_left: "401 -> check dashboard", raw_count: raw.length }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Cache-Control": "no-cache" } });
  } catch(e){ return new Response(JSON.stringify({ matches:[], error:e.message, date:reqDate }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }); }
}
