export async function onRequest({request}){
  try{
    const url=new URL(request.url);
    let dp=url.searchParams.get('date')||'today';
    
    // Get Berlin date
    let target=new Date();
    const berlinNow=new Date(target.toLocaleString('en-US',{timeZone:'Europe/Berlin'}));
    
    if(dp==='yesterday'){
      berlinNow.setDate(berlinNow.getDate()-1);
    }else if(dp==='tomorrow'){
      berlinNow.setDate(berlinNow.getDate()+1);
    }else if(/^\d{4}-\d{2}-\d{2}$/.test(dp)){
      berlinNow.setTime(new Date(dp).getTime());
    }
    
    const yyyy=berlinNow.getFullYear();
    const mm=String(berlinNow.getMonth()+1).padStart(2,'0');
    const dd=String(berlinNow.getDate()).padStart(2,'0');
    const dateStr=`${yyyy}${mm}${dd}`; // FotMob needs YYYYMMDD
    const dateDash=`${yyyy}-${mm}-${dd}`;

    // Real API - FotMob (same as FlashScore uses)
    const res=await fetch(`https://www.fotmob.com/api/data/matches?date=${dateStr}`,{
      headers:{
        "User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept":"application/json"
      }
    });
    
    if(!res.ok) throw new Error('fotmob failed');
    const j=await res.json();
    
    let out=[];
    (j.leagues||[]).forEach(l=>{
      const ccode=(l.ccode||'').toUpperCase();
      const country=ccode||'WORLD';
      (l.matches||[]).forEach(m=>{
        // Real Berlin time from API
        let berlinTime=m.time||'';
        let statusText=m.status?.reason?.short||'';
        let liveMin=m.status?.liveTimeShort||''; // REAL minutes like "89'" from net
        let utc=m.status?.utcTime;
        
        if(utc){
          try{
            const d=new Date(utc);
            berlinTime=d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'});
          }catch{}
        }

        // Real live check from API
        const isLive = !!liveMin || statusText.toLowerCase().includes('half');
        const isFinished = statusText.toUpperCase()==='FT' || statusText.toLowerCase().includes('finished');

        // For tomorrow/upcoming, score must be null -> will show "-" in frontend
        let homeScore=m.home?.score??null;
        let awayScore=m.away?.score??null;
        if(!isLive && !isFinished){
          homeScore=null;
          awayScore=null;
        }

        out.push({
          fixture:{
            id:m.id,
            time:berlinTime,
            status:liveMin||statusText||berlinTime,
            minute:liveMin||statusText, // REAL minutes from net, not by me
            isLive:isLive,
            isFinished:isFinished
          },
          league:{
            name:l.name,
            country:country,
            ccode:ccode
          },
          teams:{
            home:{name:m.home?.name||'Home'},
            away:{name:m.away?.name||'Away'}
          },
          goals:{
            home:homeScore,
            away:awayScore
          }
        });
      });
    });

    return new Response(JSON.stringify(out),{
      headers:{
        "Content-Type":"application/json",
        "Access-Control-Allow-Origin":"*",
        "Cache-Control":"public, max-age=15"
      }
    });

  }catch(e){
    // If net API fails, return empty - NOT fake 89' - so you know it's net issue
    return new Response(JSON.stringify([]),{
      headers:{
        "Content-Type":"application/json",
        "Access-Control-Allow-Origin":"*"
      }
    });
  }
}
