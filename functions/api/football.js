export async function onRequest() {
  const today = new Date().toISOString().split('T')[0].replace(/-/g,"");
  const COUNTRY_FULL = {
    "ENG":"ENGLAND","ESP":"SPAIN","ITA":"ITALY","GER":"GERMANY","FRA":"FRANCE",
    "BRA":"BRAZIL","ARG":"ARGENTINA","POR":"PORTUGAL","NED":"NETHERLANDS",
    "TUR":"TURKEY","BEL":"BELGIUM","SCO":"SCOTLAND","USA":"USA","MEX":"MEXICO",
    "SAU":"SAUDI ARABIA","IRN":"IRAN","IND":"INDIA","JPN":"JAPAN"
  };
  // FlashScore order - top leagues first
  const LEAGUE_ORDER = [
    "Premier League","LaLiga","Serie A","Bundesliga","Ligue 1",
    "Africa Cup of Nations U20 - Qualification","Olympic Games Women - Qualification",
    "Ligue 1","ABFA Premier League","Liga Profesional - Clausura","Primera Nacional"
  ];

  try{
    const r = await fetch(`https://www.fotmob.com/api/data/matches?date=${today}`, {headers:{"User-Agent":"Mozilla/5.0"}});
    const j = await r.json();
    let out=[];
    (j.leagues||[]).forEach(l=>{
      const ccode = (l.ccode||"").toUpperCase();
      let country = COUNTRY_FULL[ccode] || ccode || "WORLD";
      // Keep REAL league name from FotMob, no forcing!
      const leagueName = l.name || "Unknown";

      // Skip junk if league name contains weird FC like VZN FC inside Premier League
      // FotMob gives correct grouping, so we keep as is

      (l.matches||[]).forEach(m=>{
        let berlin = m.time || "00:00";
        if(m.status?.utcTime){
          try{const d=new Date(m.status.utcTime); berlin=d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'});}catch{}
        }
        const liveMin = m.status?.liveTimeShort || m.status?.reason?.short || "";
        out.push({
          fixture:{id:m.id,time:berlin,status:{short:liveMin||berlin, display:liveMin||berlin},minute:liveMin},
          league:{name:leagueName, country:country, ccode:ccode, order: LEAGUE_ORDER.findIndex(x=>leagueName.includes(x))},
          teams:{home:{name:m.home?.name}, away:{name:m.away?.name}},
          goals:{home:m.home?.score??null, away:m.away?.score??null}
        });
      });
    });

    // Sort: England first, then Italy, Spain, then Africa, then others alphabetically
    out.sort((a,b)=>{
      const orderA = a.league.order===-1?999:a.league.order;
      const orderB = b.league.order===-1?999:b.league.order;
      if(orderA!==orderB) return orderA-orderB;
      return a.league.country.localeCompare(b.league.country);
    });

    return new Response(JSON.stringify(out), {headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Cache-Control":"public, max-age=30"}});
  }catch(e){
    return new Response(JSON.stringify([]), {headers:{"Access-Control-Allow-Origin":"*"}});
  }
}
