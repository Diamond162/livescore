export async function onRequest({request}){
  const url=new URL(request.url);
  let dParam=url.searchParams.get('date')||'today';
  let target=new Date();
  if(dParam==='yesterday') target.setDate(target.getDate()-1);
  else if(dParam==='tomorrow') target.setDate(target.getDate()+1);
  else if(/^\d{4}-\d{2}-\d{2}$/.test(dParam)) target=new Date(dParam);
  else if(/^\d{8}$/.test(dParam)) target=new Date(dParam.slice(0,4)+'-'+dParam.slice(4,6)+'-'+dParam.slice(6,8));
  const dateStr=target.toISOString().slice(0,10).replace(/-/g,'');

  const FULL={
    ENG:"ENGLAND",SCO:"SCOTLAND",WAL:"WALES",NIR:"NORTHERN IRELAND",
    ESP:"SPAIN",ITA:"ITALY",GER:"GERMANY",FRA:"FRANCE",POR:"PORTUGAL",NED:"NETHERLANDS",
    BEL:"BELGIUM",TUR:"TURKEY",SUI:"SWITZERLAND",AUT:"AUSTRIA",GRE:"GREECE",DEN:"DENMARK",
    SWE:"SWEDEN",NOR:"NORWAY",RUS:"RUSSIA",UKR:"UKRAINE",POL:"POLAND",CZE:"CZECH REPUBLIC",
    CRO:"CROATIA",SRB:"SERBIA",ROU:"ROMANIA",BUL:"BULGARIA",HUN:"HUNGARY",
    SIN:"SINGAPORE",TAN:"TANZANIA",ALG:"ALGERIA",ARG:"ARGENTINA",BRA:"BRAZIL",
    USA:"USA",MEX:"MEXICO",JPN:"JAPAN",KOR:"SOUTH KOREA",AUS:"AUSTRALIA",
    KEN:"KENYA",NAM:"NAMIBIA",CMR:"CAMEROON",COD:"D.R. CONGO",ATB:"ANTIGUA & BARBUDA",
    ANT:"ANTIGUA & BARBUDA",AFR:"AFRICA",INT:"WORLD",EUROPE:"EUROPE",UEFA:"EUROPE"
  };

  try{
    const r=await fetch(`https://www.fotmob.com/api/data/matches?date=${dateStr}`,{headers:{"User-Agent":"Mozilla/5.0"}});
    const j=await r.json();
    let out=[];
    (j.leagues||[]).forEach(l=>{
      const ccode=(l.ccode||"").toUpperCase();
      const countryFull=FULL[ccode]||ccode||"WORLD";
      (l.matches||[]).forEach(m=>{
        let berlin=m.time||"00:00";
        if(m.status?.utcTime){
          try{const dt=new Date(m.status.utcTime); berlin=dt.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'});}catch{}
        }
        const liveMin=m.status?.liveTimeShort||""; // like 68', 80', 66'
        const reason=m.status?.reason?.short||"";
        let status=liveMin||reason||berlin;
        let isLive=!!liveMin || reason.toLowerCase().includes("half");
        let isFinished=reason.toLowerCase().includes("finished")||reason==="FT";

        out.push({
          fixture:{id:m.id,time:berlin,status:status,minute:liveMin||reason,isLive:isLive,isFinished:isFinished},
          league:{name:l.name,country:countryFull,ccode:ccode},
          teams:{home:{name:m.home?.name},away:{name:m.away?.name}},
          goals:{home:m.home?.score??null,away:m.away?.score??null}
        });
      });
    });
    return new Response(JSON.stringify(out),{headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Cache-Control":"public, max-age=20"}});
  }catch(e){
    return new Response(JSON.stringify([]),{headers:{"Access-Control-Allow-Origin":"*"}});
  }
}
