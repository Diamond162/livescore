export async function onRequest({request}){
  const url=new URL(request.url);
  const dp=(url.searchParams.get('date')||'today').toLowerCase();

  // TODAY - LIVE games
  const TODAY=[
    {fixture:{id:1,time:"89'",status:"89'",minute:"89'",isLive:true,isFinished:false},league:{name:"Premier League",country:"ENGLAND",ccode:"ENG"},teams:{home:{name:"Coventry"},away:{name:"Newcastle"}},goals:{home:4,away:1}},
    {fixture:{id:2,time:"88'",status:"88'",minute:"88'",isLive:true,isFinished:false},league:{name:"LaLiga",country:"SPAIN",ccode:"ESP"},teams:{home:{name:"Levante"},away:{name:"Sevilla"}},goals:{home:1,away:2}},
    {fixture:{id:5,time:"FT",status:"FT",minute:"FT",isLive:false,isFinished:true},league:{name:"3. Liga",country:"GERMANY",ccode:"GER"},teams:{home:{name:"Hansa Rostock"},away:{name:"Meppen"}},goals:{home:2,away:0}}
  ];

  // TOMORROW - Only upcoming, NO live, dash "-" like FlashScore
  const TOMORROW=[
    {fixture:{id:10,time:"18:45",status:"18:45",minute:"18:45",isLive:false,isFinished:false},league:{name:"Champions League",country:"EUROPE",ccode:"EUR"},teams:{home:{name:"Lens"},away:{name:"Sporting CP"}},goals:{home:null,away:null}},
    {fixture:{id:11,time:"18:45",status:"18:45",minute:"18:45",isLive:false,isFinished:false},league:{name:"Champions League",country:"EUROPE",ccode:"EUR"},teams:{home:{name:"Ajax"},away:{name:"Qarabag"}},goals:{home:null,away:null}},
    {fixture:{id:12,time:"21:00",status:"21:00",minute:"21:00",isLive:false,isFinished:false},league:{name:"Champions League",country:"EUROPE",ccode:"EUR"},teams:{home:{name:"Arsenal"},away:{name:"Lille"}},goals:{home:null,away:null}},
    {fixture:{id:13,time:"21:00",status:"21:00",minute:"21:00",isLive:false,isFinished:false},league:{name:"Champions League",country:"EUROPE",ccode:"EUR"},teams:{home:{name:"Atl. Madrid"},away:{name:"Man Utd"}},goals:{home:null,away:null}},
    {fixture:{id:14,time:"19:30",status:"19:30",minute:"19:30",isLive:false,isFinished:false},league:{name:"Premier League",country:"ENGLAND",ccode:"ENG"},teams:{home:{name:"Man City"},away:{name:"Liverpool"}},goals:{home:null,away:null}}
  ];

  // YESTERDAY - Only Finished
  const YESTERDAY=[
    {fixture:{id:20,time:"FT",status:"FT",minute:"FT",isLive:false,isFinished:true},league:{name:"Premier League",country:"ENGLAND",ccode:"ENG"},teams:{home:{name:"Arsenal"},away:{name:"Chelsea"}},goals:{home:2,away:1}},
    {fixture:{id:21,time:"FT",status:"FT",minute:"FT",isLive:false,isFinished:true},league:{name:"LaLiga",country:"SPAIN",ccode:"ESP"},teams:{home:{name:"Real Madrid"},away:{name:"Barcelona"}},goals:{home:1,away:1}},
    {fixture:{id:22,time:"FT",status:"FT",minute:"FT",isLive:false,isFinished:true},league:{name:"Bundesliga",country:"GERMANY",ccode:"GER"},teams:{home:{name:"Bayern"},away:{name:"Dortmund"}},goals:{home:3,away:2}}
  ];

  let out=TODAY;
  if(dp==='tomorrow' || dp.includes('2026-05-14') || dp.includes('2026-05-15')) out=TOMORROW;
  else if(dp==='yesterday' || dp.includes('2026-05-11')) out=YESTERDAY;
  else if(dp==='today' || dp.includes('2026-05-13')) out=TODAY;

  return new Response(JSON.stringify(out),{headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Cache-Control":"no-cache"}});
}
