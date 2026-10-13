export async function onRequest(context) {
  const url = new URL(context.request.url);
  const dateParam = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
  const fotmobDate = dateParam.replaceAll('-', '');

  try {
    // Generate x-mas header dynamically
    const bodyStr = `/api/matches?date=${fotmobDate}`;
    const xmasObj = { body: { url: bodyStr }, signature: "NO" };
    const xmas = btoa(JSON.stringify(xmasObj));

    const fotmobUrl = `https://www.fotmob.com/api/matches?date=${fotmobDate}`;

    const res = await fetch(fotmobUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://www.fotmob.com/',
        'x-mas': xmas
      }
    });

    const text = await res.text();

    // If FotMob still return HTML, show it for debug
    if (text.trim().startsWith('<')) {
      throw new Error('FotMob returned HTML blocked page. Try adding &ccode3=ENG - ' + text.slice(0,100));
    }

    const data = JSON.parse(text);
    let matches = [];

    if (data.leagues) {
      data.leagues.forEach(league => {
        (league.matches || []).forEach(m => {
          matches.push({
            league: { name: league.name, country: league.ccode || 'INT', flag: league.ccode },
            teams: {
              home: { name: m.home?.name, logo: m.home?.id },
              away: { name: m.away?.name, logo: m.away?.id }
            },
            fixture: {
              date: m.status?.utcTime || new Date().toISOString(),
              status: {
                short: m.status?.finished? 'FT' : m.status?.started? 'LIVE' : 'NS',
                elapsed: m.status?.liveTime?.short || ''
              }
            },
            goals: { home: m.home?.score?? null, away: m.away?.score?? null }
          });
        });
      });
    }

    return new Response(JSON.stringify({ response: matches }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (e) {
    return new Response(JSON.stringify({ response: [], error: e.message }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
