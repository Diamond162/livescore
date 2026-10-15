<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>LiveScore 2026</title>
<style>
body{font-family:Arial;margin:0;background:#fff}
.header{background:#0f2d3d;color:#fff;padding:12px;font-size:20px;font-weight:bold}
.header span{color:#00e676}
.tabs{display:flex;gap:8px;padding:10px;background:#eee;overflow-x:auto}
.tabs button{border:1px solid #ccc;border-radius:20px;padding:6px 14px;white-space:nowrap;background:#fff}
.tabs button.active{background:#0f2d3d;color:#fff}
.filters{display:flex;gap:10px;padding:8px 10px;background:#f5f5f5}
.filters button{border:none;background:#ddd;border-radius:15px;padding:5px 12px}
.filters button.active{background:#00e676;color:#000}
.league{background:#e9eef2;padding:8px 10px;font-weight:bold;margin-top:8px}
.match{display:flex;justify-content:space-between;padding:10px;border-bottom:1px solid #eee}
.match.teams{line-height:1.4}
.time{font-weight:bold;text-align:right}
.live{color:red}
.finished{color:#0066cc;font-weight:bold}
</style>
</head>
<body>
<div class="header">Flash<span>score</span> 2026</div>

<div class="tabs" id="dateTabs"></div>

<div class="filters">
<button onclick="filterGames('all')" id="f-all" class="active">ALL</button>
<button onclick="filterGames('live')" id="f-live">LIVE</button>
<button onclick="filterGames('finished')" id="f-finished">RESULTS / FINISHED</button>
<button onclick="filterGames('scheduled')" id="f-scheduled">UPCOMING</button>
</div>

<div id="games">Loading...</div>

<script>
let allData=[], currentFilter='all';
let dates=[];

function getDateStr(offset){
  let d=new Date(); d.setDate(d.getDate()+offset);
  return d.toISOString().split('T')[0];
}
function formatTab(dateStr, isToday){
  let d=new Date(dateStr);
  let m=d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
  return isToday? `TODAY ${m}` : m;
}

function initTabs(){
  let container=document.getElementById('dateTabs');
  dates=[
    {offset:-2, label:formatTab(getDateStr(-2),false), date:getDateStr(-2)},
    {offset:-1, label:formatTab(getDateStr(-1),false), date:getDateStr(-1)},
    {offset:0, label:formatTab(getDateStr(0),true), date:getDateStr(0)},
    {offset:1, label:formatTab(getDateStr(1),false), date:getDateStr(1)},
    {offset:2, label:formatTab(getDateStr(2),false), date:getDateStr(2)},
  ];
  container.innerHTML='';
  dates.forEach((d,i)=>{
    let btn=document.createElement('button');
    btn.textContent=d.label;
    if(i==2) btn.classList.add('active');
    btn.onclick=()=>{
      document.querySelectorAll('.tabs button').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      loadGames(d.date);
    };
    container.appendChild(btn);
  });
}

async function loadGames(date){
  document.getElementById('games').innerHTML='Loading...';
  let res=await fetch(`/api/matches?date=${date}`);
  let data=await res.json();
  allData=data.response||[];
  render();
}

function filterGames(type){
  currentFilter=type;
  document.querySelectorAll('.filters button').forEach(b=>b.classList.remove('active'));
  document.getElementById('f-'+type).classList.add('active');
  render();
}

function render(){
  let cont=document.getElementById('games');
  let filtered=allData.filter(g=>{
    let status=(g.fixture.status.short||'').toLowerCase();
    if(currentFilter==='live') return status.includes('live')||status.includes('1h')||status.includes('2h')||status.includes('ht');
    if(currentFilter==='finished') return status.includes('fin')||status.includes('ft')||status.includes('aet')||status.includes('pen');
    if(currentFilter==='scheduled') return status.includes('ns')||status.includes('not');
    return true;
  });

  // Group by league
  let groups={};
  filtered.forEach(m=>{
    let key=m.league.fullName||`${m.league.country} - ${m.league.name}`;
    if(!groups[key]) groups[key]=[];
    groups[key].push(m);
  });

  let html='';
  for(let league in groups){
    html+=`<div class="league">🌍 ${league}</div>`;
    groups[league].forEach(g=>{
      let status=g.fixture.status.short||'NS';
      let isLive=status.toLowerCase().includes('live')||status.toLowerCase().includes('h');
      let isFinished=status.toLowerCase().includes('fin')||status.toLowerCase().includes('ft')||g.goals.display!=='-:-' && g.goals.display!=='--:--';
      let scoreClass=isLive?'live': isFinished?'finished':'';
      let displayScore = g.goals.display;
      if(displayScore==='-:-' && isLive) displayScore='LIVE';

      html+=`<div class="match">
        <div class="teams">${g.teams.home.name}<br>${g.teams.away.name}</div>
        <div class="time"><div>${g.fixture.berlinTime}</div><div class="${scoreClass}">${displayScore}</div><div style="font-size:11px">${status}</div></div>
      </div>`;
    });
  }
  cont.innerHTML=html||'No games for this filter';
}

initTabs();
loadGames(getDateStr(0));
</script>
</body>
</html>
