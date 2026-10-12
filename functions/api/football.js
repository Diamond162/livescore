export async function onRequest(){
  try{
    // Single fast call - gets all soccer today worldwide
    const r = await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const data = await r.json();
    const events = data.events || [];

    const mapped = events.map(ev=>{
      const comp = ev.competitions[0];
      const home = comp.competitors.find(c=>c.homeAway==='home');
      const away = comp.competitors.find(c=>c.homeAway==='away');
      const statusType = comp.status.type.name;
      let s = 'NS';
      if(statusType==='STATUS_IN_PROGRESS') s='LIVE';
      else if(statusType==='STATUS_FINAL') s='FT';
      else s='UPCOMING';

      let hg = null, ag = null;
      if(s!=='UPCOMING'){
        hg = parseInt(home.score) || 0;
        ag = parseInt(away.score) || 0;
      }

      const time = new Date(ev.date).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});

      return {
        fixture: { id: ev.id, date: ev.date, time: time, status: { short: s, display: comp.status.type.detail || s } },
        league: { name: ev.leagues?.[0]?.name || 'Football', country: ev.leagues?.[0]?.country || 'WORLD' },
        teams: { home: { name: home.team.displayName }, away: { name: away.team.displayName } },
        goals: { home: hg, away: ag }
      };
    });

    // If ESPN gives 0 today (night), give sample so you see design working
    let finalList = mapped;
    if(finalList.length===0){
      finalList = [
        {fixture:{id:1,date:new Date().toISOString(),time:"19:00",status:{short:"LIVE",display:"67'"}},league:{name:"Premier League",country:"ENGLAND"},teams:{home:{name:"Arsenal"},away:{name:"Man City"}},goals:{home:2,away:1}},
        {fixture:{id:2,date:new Date().toISOString(),time:"19:00",status:{short:"FT",display:"FT"}},league:{name:"La Liga",country:"SPAIN"},teams:{home:{name:"Barcelona"},away:{name:"Real Madrid"}},goals:{home:1,away:1}},
        {fixture:{id:3,date:new Date().toISOString(),time:"21:00",status:{short:"UPCOMING",display:""}},league:{name:"Serie A",country:"ITALY"},teams:{home:{name:"Inter"},away:{name:"AC Milan"}},goals:{home:null,away:null}},
        {fixture:{id:4,date:new Date().toISOString(),time:"FT",status:{short:"FT",display:"FT"}},league:{name:"Ligue 1",country:"FRANCE"},teams:{home:{name:"PSG"},away:{name:"Lyon"}},goals:{home:3,away:0}},
      ];
    }

    return new Response(JSON.stringify({response: finalList}), {
      headers: { 'Content-Type':'application/json', 'Access-Control-Allow-Origin':'*', 'Cache-Control':'no-cache' }
    });

  }catch(e){
    return new Response(JSON.stringify({response:[],error:e.message}), { headers:{'Content-Type':'application/json'} });
  }
}
