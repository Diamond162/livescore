export async function onRequest() {
  const today = new Date().toISOString().split('T')[0].replace(/-/g,"");
  try{
    const r = await fetch(`https://www.fotmob.com/api/data/matches?date=${today}`);
    const j = await r.json();
    let out=[];
    (j.leagues||[]).forEach(l=>{
      (l.matches||[]).forEach(m=>{
        let berlin = m.time || "TBD";
        if(m.status?.utcTime){
          try{
            const d=new Date(m.status.utcTime);
            berlin=d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'});
          }catch{}
        }
        out.push({
          fixture:{id:m.id, time:berlin, status:{short:m.status?.liveTimeShort||m.status?.reason?.short||berlin, display:m.status?.reason?.short||berlin}},
          league:{name:l.name, country:l.ccode||""},
          teams:{home:{name:m.home?.name}, away:{name:m.away?.name}},
          goals:{home:m.home?.score??null, away:m.away?.score??null}
        });
      });
    });
    return new Response(JSON.stringify(out), {headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Cache-Control":"public, max-age=60"}});
  }catch(e){
    return new Response(JSON.stringify([]), {headers:{"Access-Control-Allow-Origin":"*"}});
  }
}
