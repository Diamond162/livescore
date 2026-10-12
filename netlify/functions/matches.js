// Fetch all matches + group by league
const res = await fetch(`https://live-football-api.com/api/v1/matches?apikey=${API_KEY}&date=today`, {
  headers: { 'X-API-KEY': API_KEY }
});
const data = await res.json();

// Group like FlashScore
const grouped = {};
data.matches.forEach(m => {
  const leagueKey = `${m.country} - ${m.league}`;
  if(!grouped[leagueKey]) grouped[leagueKey] = [];
  grouped[leagueKey].push(m);
});
return grouped; // Now you have ALL leagues!
