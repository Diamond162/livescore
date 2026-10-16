export async function onRequest(context){
  try{
    const origin = new URL(context.request.url).origin;

    // Fetch YOUR OWN matches.json
    let r = await fetch(origin + '/matches.json', { cache: 'no-store' });

    // If matches.json no dey yet, use fallback
    let data;
    try{
      data = await r.json();
    }catch(e){
      data = {
        date: new Date().toISOString().split('T')[0],
        matches: [
          {"lg":"NPFL - Nigeria","h":"Enyimba FC","a":"Remo Stars","hs":2,"as":1,"st":"LIVE","tm":"67'"},
          {"lg":"Premier League","h":"Arsenal","a":"Man City","hs":2,"as":1,"st":"LIVE","tm":"78'"},
          {"lg":"La Liga","h":"Real Madrid","a":"Barcelona","hs":1,"as":0,"st":"FINISHED","tm":"FT"}
        ]
      };
    }

    const url = new URL(context.request.url);
    let status = url.searchParams.get('status');
    let lg = url.searchParams.get('lg');

    let matches = data.matches || [];

    // Filter?status=LIVE or?lg=NPFL
    if(status) matches = matches.filter(m => m.st === status.toUpperCase());
    if(lg) matches = matches.filter(m => m.lg.toLowerCase().includes(lg.toLowerCase()));

    return new Response(JSON.stringify({
      source: "my-own-api",
      owner: "Diamond162/livescore",
      date: data.date,
      count: matches.length,
      matches: matches
    }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "max-age=10"
      }
    });

  }catch(err){
    return new Response(JSON.stringify({
      source: "error-fallback",
      count: 1,
      matches: [
        {"lg":"NPFL - Nigeria","h":"Enyimba FC","a":"Remo Stars","hs":1,"as":0,"st":"LIVE","tm":"34'"}
      ],
      error: err.message
    }), {
      headers: { "Content-Type":"application/json" }
    });
  }
}
