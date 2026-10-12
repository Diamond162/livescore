export async function onRequest(context) {
  const cache = caches.default
  const cacheKey = new Request(context.request.url)

  const cached = await cache.match(cacheKey)
  if (cached) return cached

  const url = new URL(context.request.url)
  const dateType = url.searchParams.get('date') || 'today'

  let d = new Date()
  if (dateType === 'yesterday') d.setDate(d.getDate() - 1)
  if (dateType === 'tomorrow') d.setDate(d.getDate() + 1)

  const berlin = new Date(d.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }))
  const dateStr = berlin.getFullYear() + String(berlin.getMonth() + 1).padStart(2, '0') + String(berlin.getDate()).padStart(2, '0')

  try {
    const r = await fetch(`https://www.fotmob.com/api/data/matches?date=${dateStr}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    const data = await r.json()
    let games = []

    if (data.leagues) {
      for (const lg of data.leagues) {
        for (const m of (lg.matches || [])) {
          games.push({
            fixture: { id: m.id },
            league: { name: lg.name, country: lg.ccode || 'INT' },
            teams: {
              home: { name: m.home?.name || 'Home' },
              away: { name: m.away?.name || 'Away' }
            },
            goals: {
              home: m.status?.scoreStr? Number(m.status.scoreStr.split('-')[0]) : null,
              away: m.status?.scoreStr? Number(m.status.scoreStr.split('-')[1]) : null
            },
            status: {
              short: m.status?.finished? 'FT' : (m.status?.liveTime? 'LIVE' : 'NS'),
              long: m.status?.liveTime || (m.status?.finished? 'Finished' : 'Not Started')
            }
          })
        }
      }
    }

    const res = new Response(JSON.stringify(games), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60, s-maxage=120',
        'Access-Control-Allow-Origin': '*'
      }
    })

    context.waitUntil(cache.put(cacheKey, res.clone()))
    return res

  } catch (err) {
    return new Response(JSON.stringify([]), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
}
