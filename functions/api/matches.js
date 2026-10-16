export async function onRequest(context){
  const apiKey = context.env.FOOTBALL_API_KEY;
  const url = new URL(context.request.url);
  let date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];

  // TRY real football date - API get data for past seasons
  // If user ask for 2026-10-16, try 2025-10-16 or sample date
  let tryDates = [date, '2026-07-03', '2025-10-16', '2024-10-16'];

  let finalList = [];
  let debugInfo = {};

  for(let d of tryDates){
    try{
      const apiUrl = `https://api.live-football-api.com/matches?date=${d}&lang=en`;
      const res = await fetch(apiUrl, {
        headers: {
          'X-API-Key': apiKey,
          'Authorization': `Bearer ${apiKey}`,
          'x-api-key': apiKey
        }
      });
      const data = await res.json();
      debugInfo.lastStatus = res.status;
      debugInfo.lastDateTried = d;
      debugInfo.rawKeys = Object.keys(data);

      let list = data?.data?.matches || data?.matches || [];
      if(list.length > 0){
        finalList = list;
        date = d;
        break;
      }
    }catch(e){ debugInfo.error = e.message; }
  }

  // If still empty, show DEMO so your site NO EVER empty
  if(finalList.length === 0){
    finalList = [
      {league:{name:"Premier League"}, home:{name:"Arsenal"}, away:{name:"Man City"}, score:{home:2,away:1}, status:"LIVE 67'"},
      {league:{name:"La Liga"}, home:{name:"Real Madrid"}, away:{name:"Barcelona"}, score:{home:1,away:1}, status:"HT"},
      {league:{name:"Serie A"}, home:{name:"Inter"}, away:{name:"AC Milan"}, score:{home:0,away:0}, status:"15:00"},
      {league:{name:"NPFL - Nigeria"}, home:{name:"Enyimba"}, away:{name:"Remo Stars"}, score:{home:1,away:0}, status:"LIVE 34'"}
    ];
    debugInfo.mode = "DEMO - API returned 0 for all dates";
  }

  return new Response(JSON.stringify({
    matches: finalList,
    date: date,
    count: finalList.length,
    debug: debugInfo,
    hasKey:!!apiKey
  }),{
    headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}
  });
}
