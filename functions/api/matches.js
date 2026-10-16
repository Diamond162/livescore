export async function onRequest(context){
  const apiKey = context.env.FOOTBALL_API_KEY;
  const url = new URL(context.request.url);
  const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
  const lang = 'en';

  // CORRECT endpoint for live-football-api.com
  const apiUrl = `https://api.live-football-api.com/matches?date=${date}&lang=${lang}`;

  try{
    const res = await fetch(apiUrl, {
      headers: {
        'X-API-Key': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });

    const data = await res.json();

    // data structure: { data: { matches: [...] } }
    let list = [];
    if(data.data && data.data.matches) list = data.data.matches;
    else if(data.matches) list = data.matches;
    else if(Array.isArray(data)) list = data;
    else if(data.data && Array.isArray(data.data)) list = data.data;

    return new Response(JSON.stringify({
      matches: list,
      date: date,
      count: list.length,
      status: res.status
    }),{
      headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}
    });
  }catch(e){
    return new Response(JSON.stringify({matches:[], error:e.message, date, count:0}),{
      headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}
    });
  }
}
