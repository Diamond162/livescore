function show(){
 let filtered = Array.isArray(allData) ? allData : (allData.matches || []);
 if(!Array.isArray(filtered)){ filtered = Object.values(filtered); }
 if(filter=="LIVE") filtered=filtered.filter(m=> (m.status||"").toString().toLowerCase().includes('live')||['1H','2H','HT','LIVE'].includes(m.status));
 if(filter=="FINISHED") filtered=filtered.filter(m=> (m.status||"").toString().toLowerCase().includes('fin')||['FT','AET','PEN','FT_PEN'].includes(m.status));
 if(filter=="UPCOMING") filtered=filtered.filter(m=> (m.status||"").toString().toLowerCase().includes('not')||['NS','TBD',''].includes(m.status));
 let html="";
 if(!filtered.length){html=`<div style="text-align:center;padding:30px">No ${filter} matches for ${curDate}<br><small>Try other date</small></div>`;}
 filtered.forEach(m=>{
  let home=m.home?.name||m.teams?.home?.name||"Home";
  let away=m.away?.name||m.teams?.away?.name||"Away";
  let sh=m.score?.home??m.goals?.home??m.score?.fullTime?.home??"-"; let sa=m.score?.away??m.goals?.away??m.score?.fullTime?.away??"-";
  let status=m.status||m.fixture?.status?.short||"";
  let time=status; try{ if(m.date) time=new Date(m.date).toLocaleTimeString('en-NG',{hour:'2-digit',minute:'2-digit',timeZone:'Africa/Lagos'});}catch(e){}
  html+=`<div class="match"><div><div class="team">${home}</div><div class="team">${away}</div><div class="status">${time} • ${status}</div></div><div class="score">${sh}<br>${sa}</div></div>`;
 });
 document.getElementById('list').innerHTML=html;
}
