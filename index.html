export async function onRequest(context){
  const KEY=(context.env.LIVE_FOOTBALL_API_KEY||'').trim();
  const reqUrl=new URL(context.request.url);
  let dateParam=reqUrl.searchParams.get('date')||'';
  if(!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)){
    dateParam=new Date().toISOString().split('T')[0];
  }
  if(!KEY) return new Response(JSON.stringify({response:[],error:"NO KEY"}),{headers:{"content-type":"application/json"}});

  const toBerlin=(kickoff)=>{
    if(!kickoff) return '00:00';
    try{
      let iso=String(kickoff).trim().replace(' ','T');
      if(!iso.endsWith('Z') &&!iso.includes('+')) iso+='Z';
      const d=new Date(iso);
      if(isNaN(d)) return String(kickoff).slice(11,16)||'00:00';
      return d.toLocaleTimeString('en-GB',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit',hour12:false});
    }catch(e){ return '00:00'; }
  };

  const getPriority=(name,country)=>{
    const s=(name+' '+(country||'')).toLowerCase();
    if(s.includes('uefa champions league')) return 1;
    if(s.includes('champions league') &&!s.includes('afc') &&!s.includes('gcc') &&!s.includes('two')) return 1;
    if(s.includes('europa league')) return 2;
    if(s.includes('conference league')) return 3;
    if(s.includes('premier league')) return 4;
    if(s.includes('la liga')) return 5;
    if(s.includes('bundesliga')) return 6;
    if(s.includes('serie a')) return 7;
    if(s.includes('ligue 1')) return 8;
    if(s.includes('afc champions league elite')||s==='afc champions league') return 20;
    if(s.includes('afc champions league two')) return 25;
    if(s.includes('gcc')) return 30;
    return 100;
  };

  async function fetchDate(date){
    const apiUrl=`https://live-football-api.com/api/v1/matches?date=${date}&api_key=${KEY}`;
    const r=await fetch(apiUrl);
    const j=await r.json();
    return {date, matches:j.matches||[], credits:j.credits_remaining||'?', msg:j.message||'ok'};
  }

  try{
    let result=await fetchDate(dateParam);
    let logs=[result];
    let matches=result.matches;

    // FALLBACK: If 2026-10-14 has 0 games, try REAL today + yesterday + tomorrow
    if(matches.length===0){
      const realToday=new Date().toISOString().split('T')[0];
      const d=new Date(); d.setDate(d.getDate()-1); const realYest=d.toISOString().split('T')[0];
      const d2=new Date(); d2.setDate(d2.getDate()+1); const realTomm=d2.toISOString().split('T')[0];

      // try real today
      if(dateParam!==realToday){
        const r2=await fetchDate(realToday);
        logs.push(r2);
        if(r2.matches.length>0){ matches=r2.matches; dateParam=realToday; }
      }
      // if still 0, try yesterday
      if(matches.length===0){
        const r3=await fetchDate(realYest);
        logs.push(r3);
        if(r3.matches.length>0){ matches=r3.matches; dateParam=realYest; }
      }
      // if still 0, try tomorrow
      if(matches.length===0){
        const r4=await fetchDate(realTomm);
        logs.push(r4);
        if(r4.matches.length>0){ matches=r4.matches; dateParam=realTomm; }
      }
    }

    const formatted=matches.map(m=>{
      const kickoff=m.kickoff||m.date||'';
      const berlin=toBerlin(kickoff);
      let hs=m.score?.home??m.home_score??null; let as=m.score?.away??m.away_score??null;
      if(typeof m.score==='string' && m.score.includes('-')){ const p=m.score.split('-'); hs=parseInt(p[0]); as=parseInt(p[1]); }
      const st=String(m.status||'').toLowerCase();
      let short='NS'; if(st==='live') short='LIVE'; else if(st==='finished') short='FT'; else if(st==='ht'||st==='halftime') short='HT';
      return{
        fixture:{id:m.id,date:kickoff,berlinTime:berlin,status:{short,long:m.status},minute:m.minute||null},
        league:{name:m.league?.name||'Other',country:m.league?.country||''},
        teams:{home:{name:m.home?.name||'Home'},away:{name:m.away?.name||'Away'}},
        goals:{home:hs,away:as},
        priority:getPriority(m.league?.name||'',m.league?.country||''),
        status:m.status
      };
    });

    formatted.sort((a,b)=>{
      if(a.fixture.status.short==='LIVE' && b.fixture.status.short!=='LIVE') return -1;
      if(b.fixture.status.short==='LIVE' && a.fixture.status.short!=='LIVE') return 1;
      if(a.priority!==b.priority) return a.priority-b.priority;
      return a.fixture.berlinTime.localeCompare(b.fixture.berlinTime);
    });

    return new Response(JSON.stringify({response:formatted,results:formatted.length,debug:logs,requested:dateParam}),{headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}});
  }catch(e){
    return new Response(JSON.stringify({response:[],error:e.message}),{headers:{"content-type":"application/json"}});
  }
}
