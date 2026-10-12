export async function onRequest() {
  const today = new Date().toISOString().split('T')[0].replace(/-/g,"");
  const COUNTRY_MAP = {
    ENG:"ENGLAND", ESP:"SPAIN", ITA:"ITALY", GER:"GERMANY", FRA:"FRANCE",
    BRA:"BRAZIL", ARG:"ARGENTINA", INT:"INT", AFC:"ASIA", UEFA:"EUROPE",
    POR:"PORTUGAL", NED:"NETHERLANDS", TUR:"TURKEY", BEL:"BELGIUM", SCO:"SCOTLAND",
    USA:"USA", MEX:"MEXICO", JPN:"JAPAN", KOR:"SOUTH KOREA", SAU:"SAUDI ARABIA",
    IRN:"IRAN", ALG:"ALGERIA", KEN:"KENYA", NAM:"NAMIBIA", CMR:"CAMEROON",
    COD:"D.R. CONGO", ATG:"ANTIGUA & BARBUDA", AF:"AFRICA", EU:"EUROPE"
  };
  try{
    const r = await fetch(`https://www.fotmob.com/api/data/matches?date=${today}`, {headers:{"User-Agent":"Mozilla/5.0"}});
    const j = await r.json();
    let out=[];
    (j.leagues||[]).forEach(l=>{
      const ccode = (l.ccode||l.name||"").toUpperCase().slice(0,3);
      const fullCountry = COUNTRY_MAP[ccode] || COUNTRY_MAP[l.ccode] || (l.ccode? l.ccode.toUpperCase() : "WORLD");
      // Better: try to extract real full from league page - fallback to ccode
      let realCountry = l.name.includes(":")? l.name.split(":")[0] : fullCountry;
      // FotMob gives clean country in 'ccode' - map it
      const countryFull = COUNTRY_MAP[l.ccode?.toUpperCase()] || fullCountry;

      (l.matches||[]).forEach(m=>{
        let berlin = m.time || "00:00";
        if(m.status?.utcTime){
          try{
            const d=new Date(m.status.utcTime);
            berlin=d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'});
          }catch{}
        }
        const liveMin = m.status?.liveTimeShort || m.status?.reason?.short || "";
        const statusShort = m.status?.liveTimeShort || m.status?.reason?.short || berlin;

        out.push({
          fixture:{
            id:m.id,
            time:berlin,
            status:{short:statusShort, display:statusShort, liveMinute:liveMin},
            minute: liveMin
          },
          league:{
            name: l.name.replace(/^.*?:/,'').trim() || l.name,
            country: countryFull,
            full: `${countryFull}: ${l.name}`,
            ccode: l.ccode
          },
          teams:{home:{name:m.home?.name}, away:{name:m.away?.name}},
          goals:{home:m.home?.score??null, away:m.away?.score??null}
        });
      });
    });
    // If ccode is short like ENG, replace with full for display
    out = out.map(o=>{
      o.league.country = COUNTRY_MAP[o.league.ccode?.toUpperCase()] || o.league.country;
      // Fix: if league.name already contains country, clean it
      if(o.league.country==="ENGLAND") o.league.name="Premier League";
      if(o.league.country==="SPAIN") o.league.name="LaLiga";
      if(o.league.country==="ITALY") o.league.name="Serie A";
      return o;
    });

    return new Response(JSON.stringify(out), {headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Cache-Control":"public, max-age=30"}});
  }catch(e){
    return new Response(JSON.stringify([]), {headers:{"Access-Control-Allow-Origin":"*"}});
  }
}
