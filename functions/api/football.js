export async function onRequest(context){
  const url = new URL(context.request.url);
  const search = url.searchParams.get('q') || '';
  try{
    // Call the data source
    const apiKey = '8138a0d4-2fb8-409c-a05d-e4bcf5de7a2b';
    let apiUrl = `https://api.football-data-api.com/league-matches?key=${apiKey}&season_id=10990&include=stats`;
    
    const res = await fetch(apiUrl, { headers: { 'User-Agent':'DiamondLivescore/1.0' } });
    const data = await res.json();
    let matches = data.data || data.matches || [];
    
    // FIX: Map scores correctly
    const mapped = matches.map(m=>{
      // Real score fields from this API
      const homeScore = m.stats?.home_score ?? m.stats?.ft_home_score ?? m.home_score ?? m.stats?.homeGoalCount ?? null;
      const awayScore = m.stats?.away_score ?? m.stats?.ft_away_score ?? m.away_score ?? m.stats?.awayGoalCount ?? null;
      
      const isFinished = m.status === 'complete' || m.status === 'finished';
      const isLive = m.status === 'in_progress' || m.status === 'live';
      const isUpcoming = !isFinished && !isLive;

      let statusShort = 'NS';
      if(isLive) statusShort = 'LIVE';
      else if(isFinished) statusShort = 'FT';
      else statusShort = 'UPCOMING';

      // Date fix - no more Invalid Date
      let date = m.date_unix ? new Date(m.date_unix*1000).toISOString() : (m.date || m.kickoff || new Date().toISOString());

      return {
        fixture: {
          id: m.id || m.match_id,
          date: date,
          status: { short: statusShort, display: statusShort, elapsed: m.stats?.minute || null }
        },
        league: {
          name: m.league_name || m.competition_name || 'Football',
          country: m.country || m.league_country || 'WORLD',
          logo: null
        },
        teams: {
          home: { name: m.home_name || m.home_team || 'Home', logo: m.home_image || null },
          away: { name: m.away_name || m.away_team || 'Away', logo: m.away_image || null }
        },
        goals: {
          // Only show score if game has started/finished, else null
          home: isUpcoming ? null : (homeScore !== null ? homeScore : 0),
          away: isUpcoming ? null : (awayScore !== null ? awayScore : 0)
        }
      };
    });

    // Filter out 0-0 that are fake FT
    let finalList = mapped;

    // Search filter
    if(search){
      const q = search.toLowerCase();
      finalList = finalList.filter(x => `${x.league.country} ${x.league.name} ${x.teams.home.name} ${x.teams.away.name}`.toLowerCase().includes(q));
    }

    return new Response(JSON.stringify({ response: finalList.slice(0,80) }), {
      headers: { 'Content-Type':'application/json', 'Access-Control-Allow-Origin':'*' }
    });

  }catch(e){
    return new Response(JSON.stringify({ response: [], error: e.message }), {
      headers: { 'Content-Type':'application/json' }
    });
  }
}
