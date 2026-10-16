export async function onRequest(){
  return new Response(JSON.stringify({
    matches:[
      {league:"Premier League", home:"Arsenal", away:"Man City", home_score:2, away_score:1, status:"LIVE 67'"},
      {league:"NPFL", home:"Enyimba", away:"Remo Stars", home_score:1, away_score:0, status:"LIVE 34'"}
    ],
    count:2
  }),{headers:{"Content-Type":"application/json"}});
}
