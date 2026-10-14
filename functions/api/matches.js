export async function onRequest(context){
  const KEY=(context.env.LIVE_FOOTBALL_API_KEY||'').trim();
  const reqUrl=new URL(context.request.url);
  let dateParam=reqUrl.searchParams.get('date')||'';
  if(!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)){
    const d=new Date(); dateParam=d.toISOString().split('T')[0];
  }
  if(!KEY) return new Response(JSON.stringify({response:[],error:"NO KEY"}),{headers:{"content-type":"application/json"}});
  try{
    const apiUrl=`https://live-football-api.com/api/v1/matches?date=${dateParam}&api_key=${KEY}`;
    const r=await fetch(apiUrl);
    const j=await r.json();
    let matches=j.matches||[];
    let logs={date:dateParam,count:matches.length,credits:j.credits_remaining||'?','message':j.message||'ok'};

    const toBerlin=(kickoff)=>{
      if(!kickoff) return '00:00';
      try{
        let iso=String(kickoff).trim().replace(' ','T');
        if(!iso.endsWith('Z') && !iso.includes('+')) iso+='Z';
        const d=new Date(iso);
        if(isNaN(d)) return String(kickoff).slice(11,16)||'00:00';
        return d.toLocaleTimeString('en-GB',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit',hour12:false});
      }catch(e){ return '00:00'; }
    };

    const getPriority=(name,country)=>{
      const s=(name+' '+(country||'')).toLowerCase();
      if(s.includes('uefa champions league')) return 1;
      if(s.includes('champions league') && !s.includes('afc') && !s.includes('gcc') && !s.includes('two')) return 1;
      if(s.includes('europa league')) return 2;
      if(s.includes('europa conference')||s.includes('conference league')) return 3;
      if(s.includes('premier league')||s.includes('england')) return 4;
      if(s.includes('la liga')||s.includes('spain')) return 5;
      if(s.includes('bundesliga')||s.includes('germany')) return 6;
      if(s.includes('serie a')||s.includes('italy')) return 7;
      if(s.includes('ligue 1')||s.includes('france')) return 8;
      if(s.includes('afc champions league elite')||s==='afc champions league') return 20;
      if(s.includes('afc champions league two')) return 25;
      if(s.includes('gcc champions league')||s.includes('gcc')) return 30;
      return 100;
    };

    const formatted=matches.map(m=>{
      const kickoff=m.kickoff||m.date||'';
      const berlin=toBerlin(kickoff);
      let hs=m.score?.home??m.home_score??null; let as=m.score?.away??m.away_score??null;
      if(typeof m.score==='string' && m.score.includes('-')){ const p=m.score.split('-'); hs=parseInt(p[0]); as=parseInt(p[1]); }
      const st=String(m.status||'').toLowerCase();
      let short='NS'; if(st==='live') short='LIVE'; else if(st==='finished') short='FT'; else if(st==='halftime'||st==='ht') short='HT';
      const minute=m.minute||m.time?.minute||null;
      return{
        fixture:{id:m.id,date:kickoff,berlinTime:berlin,status:{short,long:m.status},minute:minute,elapsed:m.elapsed||null},
        league:{name:m.league?.name||'Other',country:m.league?.country||'',logo:''},
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

    return new Response(JSON.stringify({response:formatted,results:formatted.length,debug:logs}),{headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}});
  }catch(e){
    return new Response(JSON.stringify({response:[],error:e.message}),{headers:{"content-type":"application/json"}});
  }
}
