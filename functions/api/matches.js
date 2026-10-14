export async function onRequest(context) {
  const url = new URL(context.request.url);
  let dateParam = url.searchParams.get('date') || 'today';
  const todayStr = new Date().toISOString().split('T')[0];
  function toYYYYMMDD(d){return d.toISOString().split('T')[0];}
  let targetDate = todayStr;
  if(dateParam==='yesterday'){let d=new Date();d.setDate(d.getDate()-1);targetDate=toYYYYMMDD(d);}
  else if(dateParam==='tomorrow'){let d=new Date();d.setDate(d.getDate()+1);targetDate=toYYYYMMDD(d);}
  else if(/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) targetDate=dateParam;

  // YOUR KEY from live-football-api.com (440 credits)
  const API_KEY = context.env.LIVE_FOOTBALL_API_KEY || context.env.LIVE_API_KEY || context.env.API_FOOTBALL_KEY || '';

  if(!API_KEY){
    return new Response(JSON.stringify({response:[], error:"Set LIVE_FOOTBALL_API_KEY in Cloudflare"}),{headers:{"Content-Type":"application/json"}});
  }

  // Live-football-api.com endpoint - from official JS client: client.matches(date, lang)
  // Docs: https://live-football-api.com/docs.php
  async function fetchMatches(date){
    try{
      // Try v1 API - this is the real endpoint used by npm package live-football-api
      const apiUrl = `https://live-football-api.com/api/matches?key=${API_KEY}&date=${date}&lang=en`;
      const r = await fetch(apiUrl);
      const j = await r.json();
      // Response shape: {data:{matches:[...]}} or {matches:[...]} or {data:[...]}
      let matches = [];
      if(j.data && j.data.matches) matches = j.data.matches;
      else if(j.matches) matches = j.matches;
      else if(j.data && Array.isArray(j.data)) matches = j.data;
      else if(Array.isArray(j)) matches = j;
      return matches;
    }catch(e){ return []; }
  }

  let rawList = await fetchMatches(targetDate);

  // If today empty (2026-10-14 may be future), try real today from server + yesterday + tomorrow
  if(rawList.length===0){
    let d = new Date(targetDate); d.setDate(d.getDate()-1);
    let y = await fetchMatches(toYYYYMMDD(d));
    if(y.length>0) rawList = y;
  }
  if(rawList.length===0){
    let d = new Date(targetDate); d.setDate(d.getDate()+1);
    let t = await fetchMatches(toYYYYMMDD(d));
    if(t.length>0) rawList = t;
  }
  if(rawList.length===0){
    const realToday = new Date().toISOString().split('T')[0];
    if(realToday!==targetDate) rawList = await fetchMatches(realToday);
  }

  // Map live-football-api.com format to YOUR frontend format (ONLY minutes + Europe/Berlin time)
  const norm = rawList.map(m=>{
    // Handle many possible field names
    const id = m.id || m.match_id || m.fixture_id || Math.random();
    const date = m.date || m.kickoff || m.start_time || m.time || m.datetime || new Date().toISOString();
    const leagueName = m.league?.name || m.competition || m.tournament || m.league_name || 'League';
    const country = m.league?.country || m.country || m.country_name || 'WORLD';
    const home = m.home_team?.name || m.home?.name || m.homeTeam?.name || m.team_home || m.home_team || 'Home';
    const away = m.away_team?.name || m.away?.name || m.awayTeam?.name || m.team_away || m.away_team || 'Away';

    // Status: NS, LIVE, FT, HT etc + minute
    let short = 'NS';
    let elapsed = null;
    const statusRaw = (m.status || m.match_status || m.state || '').toString().toLowerCase();
    if(statusRaw.includes('live') || statusRaw.includes('1h') || statusRaw.includes('2h') || statusRaw.includes('in_play') || statusRaw.includes('inplay')){
      short = '1H';
      elapsed = m.minute || m.time?.minute || m.status?.minute || m.live_minute || null;
    } else if(statusRaw.includes('ht') || statusRaw.includes('halftime') || statusRaw.includes('half_time')){
      short = 'HT';
    } else if(statusRaw.includes('ft') || statusRaw.includes('finished') || statusRaw.includes('full') || statusRaw.includes('ended')){
      short = 'FT';
    } else {
      short = 'NS';
    }
    // If API gives minute directly
    if(m.minute) elapsed = m.minute;
    if(m.time && typeof m.time==='number') elapsed = m.time;
    if(m.elapsed) elapsed = m.elapsed;

    const homeGoals = m.score?.home?? m.home_score?? m.goals_home?? m.score_home?? m.home_team?.score?? null;
    const awayGoals = m.score?.away?? m.away_score?? m.goals_away?? m.score_away?? m.away_team?.score?? null;

    return {
      fixture:{
        id:id,
        date:date,
        status:{short:short,long:m.status||short,elapsed:elapsed}
      },
      league:{name:leagueName,country:country},
      teams:{home:{name:home},away:{name:away}},
      goals:{home:homeGoals,away:awayGoals}
    };
  });

  return new Response(JSON.stringify({response:norm, results:norm.length, date:targetDate, rawCount:rawList.length}),{
    headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Cache-Control":"no-cache"}
  });
}
