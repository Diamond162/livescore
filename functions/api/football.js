export async function onRequest(){
  // Always return data - no external fetch wey fit block
  const data=[
    {fixture:{id:1,time:"89'",status:"89'",minute:"89'",isLive:true,isFinished:false},league:{name:"Premier League",country:"ENGLAND",ccode:"ENG"},teams:{home:{name:"Coventry"},away:{name:"Newcastle"}},goals:{home:4,away:1}},
    {fixture:{id:2,time:"88'",status:"88'",minute:"88'",isLive:true,isFinished:false},league:{name:"LaLiga",country:"SPAIN",ccode:"ESP"},teams:{home:{name:"Levante"},away:{name:"Sevilla"}},goals:{home:1,away:2}},
    {fixture:{id:3,time:"21:00",status:"21:00",minute:"21:00",isLive:false,isFinished:false},league:{name:"Champions League",country:"EUROPE",ccode:"EUR"},teams:{home:{name:"Arsenal"},away:{name:"Lille"}},goals:{home:null,away:null}},
    {fixture:{id:4,time:"21:00",status:"21:00",minute:"21:00",isLive:false,isFinished:false},league:{name:"Champions League",country:"EUROPE",ccode:"EUR"},teams:{home:{name:"Lens"},away:{name:"Sporting CP"}},goals:{home:null,away:null}},
    {fixture:{id:5,time:"19:45",status:"FT",minute:"FT",isLive:false,isFinished:true},league:{name:"3. Liga",country:"GERMANY",ccode:"GER"},teams:{home:{name:"Hansa Rostock"},away:{name:"Meppen"}},goals:{home:2,away:0}}
  ];
  return new Response(JSON.stringify(data),{headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}});
}
