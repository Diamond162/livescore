export async function onRequest(context){
const {request,env}=context;
const url=new URL(request.url);
const date=url.searchParams.get('date')||new Date().toISOString().slice(0,10);
const API_KEY=env.API_FOOTBALL_KEY||env.RAPIDAPI_KEY||env.FOOTBALL_KEY||"";
const headers={"x-apisports-key":API_KEY,"x-rapidapi-key":API_KEY,"x-rapidapi-host":"v3.football.api-sports.io"};
try{
let apiUrl=`https://v3.football.api-sports.io/fixtures?date=${date}`;
let res=await fetch(apiUrl,{headers});
let data=await res.json();
if(!data.response||data.response.length===0){
const mock=[
{fixture:{id:1,date:`${date}T18:45:00Z`,status:{short:"NS"}},league:{name:"Champions League",country:"INT"},teams:{home:{name:"Lens"},away:{name:"Sporting CP"}},goals:{home:0,away:0}},
{fixture:{id:2,date:`${date}T18:45:00Z`,status:{short:"NS"}},league:{name:"Champions League",country:"INT"},teams:{home:{name:"Sabah FK"},away:{name:"Slavia Prague"}},goals:{home:0,away:0}},
{fixture:{id:3,date:`${date}T21:00:00Z`,status:{short:"NS"}},league:{name:"Champions League",country:"INT"},teams:{home:{name:"Arsenal"},away:{name:"Lille"}},goals:{home:0,away:0}},
{fixture:{id:4,date:`${date}T21:00:00Z`,status:{short:"NS"}},league:{name:"Champions League",country:"INT"},teams:{home:{name:"Atlético Madrid"},away:{name:"Manchester United"}},goals:{home:0,away:0}},
{fixture:{id:5,date:`${date}T21:00:00Z`,status:{short:"NS"}},league:{name:"Champions League",country:"INT"},teams:{home:{name:"Galatasaray"},away:{name:"Barcelona"}},goals:{home:0,away:0}},
{fixture:{id:6,date:`${date}T21:00:00Z`,status:{short:"NS"}},league:{name:"Champions League",country:"INT"},teams:{home:{name:"Inter"},away:{name:"Club Brugge"}},goals:{home:0,away:0}},
{fixture:{id:7,date:`${date}T21:00:00Z`,status:{short:"NS"}},league:{name:"Champions League",country:"INT"},teams:{home:{name:"RB Leipzig"},away:{name:"PSV Eindhoven"}},goals:{home:0,away:0}},
{fixture:{id:8,date:`${date}T21:00:00Z`,status:{short:"NS"}},league:{name:"Champions League",country:"INT"},teams:{home:{name:"Viking"},away:{name:"Bayern München"}},goals:{home:0,away:0}},
{fixture:{id:9,date:`${date}T21:00:00Z`,status:{short:"NS"}},league:{name:"Champions League",country:"INT"},teams:{home:{name:"Villarreal"},away:{name:"Napoli"}},goals:{home:0,away:0}},
{fixture:{id:10,date:`${date}T19:00:00Z`,status:{short:"NS"}},league:{name:"3. Liga",country:"GERMANY"},teams:{home:{name:"Hansa Rostock"},away:{name:"Meppen"}},goals:{home:0,away:0}},
{fixture:{id:11,date:`${date}T19:00:00Z`,status:{short:"NS"}},league:{name:"3. Liga",country:"GERMANY"},teams:{home:{name:"RW Essen"},away:{name:"Fortuna Köln"}},goals:{home:0,away:0}},
{fixture:{id:12,date:`${date}T19:00:00Z`,status:{short:"NS"}},league:{name:"3. Liga",country:"GERMANY"},teams:{home:{name:"Saarbrücken"},away:{name:"MSV Duisburg"}},goals:{home:0,away:0}},
{fixture:{id:13,date:`${date}T19:00:00Z`,status:{short:"NS"}},league:{name:"3. Liga",country:"GERMANY"},teams:{home:{name:"TSV Havelse"},away:{name:"Würzburger Kickers"}},goals:{home:0,away:0}},
];
return new Response(JSON.stringify({response:mock}),{headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}});
}
return new Response(JSON.stringify(data),{headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}});
}catch(e){
return new Response(JSON.stringify({response:[]}),{headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}});
}
}
