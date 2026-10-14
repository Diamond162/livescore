export async function onRequest(){
  const demo = [
    { fixture:{id:101, date:new Date().toISOString(), timestamp:Math.floor(new Date().setHours(18,45)/1000), status:{short:'NS',long:'Not Started',elapsed:null}}, league:{name:'Champions League',country:'EUROPE'}, teams:{home:{name:'Real Madrid'},away:{name:'Man City'}}, goals:{home:null,away:null}},
    { fixture:{id:102, date:new Date().toISOString(), timestamp:Math.floor(new Date().setHours(21,0)/1000), status:{short:'NS',long:'Not Started',elapsed:null}}, league:{name:'Premier League',country:'ENGLAND'}, teams:{home:{name:'Arsenal'},away:{name:'Liverpool'}}, goals:{home:null,away:null}},
    { fixture:{id:103, date:new Date().toISOString(), timestamp:Math.floor(Date.now()/1000), status:{short:'LIVE',long:'Second Half',elapsed:67}}, league:{name:'La Liga',country:'SPAIN'}, teams:{home:{name:'Barcelona'},away:{name:'Real Madrid'}}, goals:{home:1,away:0}},
    { fixture:{id:104, date:new Date(Date.now()-86400000).toISOString(), timestamp:Math.floor((Date.now()-86400000)/1000), status:{short:'FT',long:'Finished',elapsed:90}}, league:{name:'Serie A',country:'ITALY'}, teams:{home:{name:'AC Milan'},away:{name:'Inter'}}, goals:{home:2,away:1}},
    { fixture:{id:105, date:new Date(Date.now()-86400000).toISOString(), timestamp:Math.floor((Date.now()-86400000)/1000), status:{short:'FT',long:'Finished',elapsed:90}}, league:{name:'Bundesliga',country:'GERMANY'}, teams:{home:{name:'Bayern Munich'},away:{name:'Dortmund'}}, goals:{home:3,away:2}},
    { fixture:{id:106, date:new Date().toISOString(), timestamp:Math.floor(new Date().setHours(19,30)/1000), status:{short:'NS',long:'Not Started',elapsed:null}}, league:{name:'Ligue 1',country:'FRANCE'}, teams:{home:{name:'PSG'},away:{name:'Marseille'}}, goals:{home:null,away:null}},
    { fixture:{id:107, date:new Date().toISOString(), timestamp:Math.floor(new Date().setHours(20,45)/1000), status:{short:'NS',long:'Not Started',elapsed:null}}, league:{name:'Europa League',country:'EUROPE'}, teams:{home:{name:'Man United'},away:{name:'Roma'}}, goals:{home:null,away:null}}
  ];
  return new Response(JSON.stringify({response:demo}),{
    headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Cache-Control":"no-store"}
  });
}
