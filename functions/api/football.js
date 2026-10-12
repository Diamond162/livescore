export async function onRequest(context) {
  const cache = caches.default
  const cacheKey = new Request(context.request.url)

  // 1. Serve from Cloudflare cache first - for 100M fans
  let cachedResponse = await cache.match(cacheKey)
  if (cachedResponse) {
    return cachedResponse
  }

  try {
    const url = new URL(context.request.url)
    let dateParam = url.searchParams.get('date') || 'today'

    let targetNow = new Date()
    if (dateParam === 'yesterday') targetNow.setDate(targetNow.getDate() - 1)
    if (dateParam === 'tomorrow') targetNow.setDate(targetNow.getDate() + 1)

    const berlinNow = new Date(targetNow.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }))
    const yyyy = berlinNow.getFullYear()
    const mm = String(berlinNow.getMonth() + 1).padStart(2, '0')
    const dd = String(berlinNow.getDate()).padStart(2, '0')
    const dateStr = `${yyyy}${mm}${dd}`

    const fotmobRes = await fetch(`https://www.fotmob.com/api/data/matches?date=${dateStr}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    })

    if (!fotmobRes.ok) throw new Error(`FotMob status ${fotmobRes.status}`)

    const j = await fotmobRes.json()
    let out = []

    if (j && j.leagues) {
      j.leagues.forEach(league => {
        const leagueName = league.name || 'Unknown League'
        const country = league.ccode ? league.ccode.toUpperCase() : 'INT'
        if (league.matches && league.matches.length > 0) {
          league.matches.forEach(m => {
            let homeScore = null
            let awayScore = null
            if (m.status && m.status.scoreStr) {
              const parts = m.status.scoreStr.split('-')
              homeScore = parseInt(parts[0]) || 0
              awayScore = parseInt(parts[1]) || 0
            }

            out.push({
              fixture: { id: m.id, date: m.time || m.status?.utcTime },
              league: {
                name: leagueName,
                country: country,
                logo: `https://images.fotmob.com/image_resources/logo/leaguelogo/${league.id}.png`
              },
              teams: {
                home: { name: m.home?.name || 'Home', logo: `https://images.fotmob.com/image_resources/logo/teamlogo/${m.home?.id}_xsmall.png` },
                away: { name: m.away?.name || 'Away', logo: `https://images.fotmob.com/image_resources/logo/teamlogo/${m.away?.id}_xsmall.png` }
              },
              goals: { home: homeScore, away: awayScore },
              score: { fulltime: { home: homeScore, away: awayScore } },
              status: {
                short: m.status?.liveTime ? 'LIVE' : (m.status?.finished ? 'FT' : 'NS'),
                long: m.status?.reason?.long || m.status?.liveTime || 'Not Started'
              }
            })
          })
        }
      })
    }

    const response = new Response(JSON.stringify(out), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60, s-maxage=120',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      }
    })

    // Save to Cloudflare cache for 120 sec
    context.waitUntil(cache.put(cacheKey, response.clone()))

    return response

  } catch (e) {
    // If FotMob fails, try return old cache instead of blank
    const fallback = await cache.match(cacheKey)
    if (fallback) return fallback

    return new Response(JSON.stringify([]), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
}
