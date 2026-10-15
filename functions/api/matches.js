<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>LiveScore 2026</title>
<style>
body{margin:0;font-family:Arial;background:#fff}
.header{background:#0f2d3d;color:#fff;padding:12px 15px;font-size:20px;font-weight:bold;position:sticky;top:0;z-index:10}
.header span{color:#00e676}
.tabs{display:flex;gap:8px;padding:10px;background:#eee;overflow-x:auto;position:sticky;top:48px;z-index:9}
.tabs button{border:1px solid #ccc;border-radius:20px;padding:7px 16px;white-space:nowrap;background:#fff;cursor:pointer}
.tabs button.active{background:#0f2d3d;color:#fff;font-weight:bold}
.filters{display:flex;gap:8px;padding:8px 10px;background:#f5f5f5;overflow-x:auto}
.filters button{border:none;border-radius:20px;padding:6px 14px;cursor:pointer;background:#e0e0e0}
.filters button.active{background:#00e676;font-weight:bold}
.league{background:#e9eef2;padding:8px 10px;font-weight:bold;font-size:13px;cursor:pointer}
.match{display:flex;align-items:center;padding:10px;border-bottom:1px solid #f0f0f0;cursor:pointer}
.match:active{background:#f5f5f5}
.m-time{width:55px;font-weight:bold;font-size:14px;color:#333;text-align:left}
.m-teams{flex:1;line-height:1.5;font-size:14px;padding-left:5px}
.m-score{width:50px;text-align:right;font-weight:bold;font-size:14px}
.m-score.live{color:#e53935}
.m-score.finished{color:#111}
.m-score.upcoming{color:#e53935}
.m-status{font-size:10px;color:#888}
.dot{width:6px;height:6px;background:red;border-radius:50%;display:inline-block;margin-right:3px;animation:blink 1s infinite}
@keyframes blink{50%{opacity:0}}
</style>
</head>
<body>
<div class="header">Flash<span>score</span> 2026</div>
<div class="tabs" id="dateTabs"></div>
<div class="filters">
<button id="f-all" class="active" onclick="filterGames('all')">ALL</button>
<button id="f-live" onclick="filterGames('live')">LIVE</button>
<button id="f-finished" onclick="filterGames('finished')">FINISHED</button>
<button id="f-scheduled" onclick="filterGames('scheduled')">UPCOMING</button>
</div>
<div id="games"></div>

<script>
let allData=[], currentFilter='all';
function getDateStr(offset){let d=new Date();d.setDate(d.getDate()+offset);return d.toISOString().split('T')[0];}
function formatTab(dateStr,isToday){let d=new Date(dateStr);let txt=d.toLocaleDateString('en-US',{month:'short',day:'numeric'});return isToday?`TODAY ${txt}`:txt;}

function initTabs(){
 let c=document.getElementById('dateTabs');
 let dates=[
  {date:getDateStr(-1),label:`Yesterday ${formatTab(getDateStr(-1),false)}`},
  {date:getDateStr(0),label:formatTab(getDateStr(0),true),active:true},
  {date:getDateStr(1),label:`Tomorrow ${formatTab(getDateStr(1),false)}`},
  {date:getDateStr(2),label:formatTab(getDateStr(2),false)},
 ];
 dates.unshift({date:getDateStr(-2),label:formatTab(getDateStr(-2),false)});
 c.innerHTML='';
 dates.forEach(d=>{
  let b=document.createElement('button');b.textContent=d.label;
  if(d.active) b.classList.add('active');
  b.onclick=()=>{document.querySelectorAll('.tabs button').forEach(x=>x.classList.remove('active'));b.classList.add('active');loadGames(d.date);}
  c.appendChild(b);
 });
}

async function loadGames(date){
 document.getElementById('games').innerHTML='<div style="padding:20px;text-align:center">Loading games...</div>';
 try{
  let r=await fetch(`/api/matches?date=${date}`);let j=await r.json();allData=j.response||[];render();
 }catch(e){document.getElementById('games').innerHTML='Failed to load';}
}

function filterGames(type){
 currentFilter=type;
 document.querySelectorAll('.filters button').forEach(b=>b.classList.remove('active'));
 document.getElementById('f-'+type).classList.add('active');
 render();
}

function openMatch(id, home, away){
 // Everything clickable - go to match details
 window.location.href=`/match.html?id=${id}&home=${encodeURIComponent(home)}&away=${encodeURIComponent(away)}`;
 // If you no get match.html yet, e go just show alert
 // alert(`Match: ${home} vs ${away} - ID: ${id}`);
}

function render(){
 let cont=document.getElementById('games');
 let filtered=allData.filter(g=>{
  let s=(g.fixture.status.short||'').toLowerCase();
  let score=g.goals.display;
  if(currentFilter==='live') return s.includes('live')||s.includes('1h')||s.includes('2h')||s.includes('ht')||s.includes('et');
  if(currentFilter==='finished') return s.includes('fin')||s.includes('ft')||s.includes('aet')||s.includes('pen')|| (score!=='-:-' &&!s.includes('ns') &&!s.includes('not'));
  if(currentFilter==='scheduled') return s.includes('ns')||s.includes('not')||s.includes('sched')||score==='-:-';
  return true;
 });

 let groups={};
 filtered.forEach(m=>{let key=m.league.fullName||`${m.league.country} - ${m.league.name}`;if(!groups[key]) groups[key]=[];groups[key].push(m);});

 let html='';
 for(let league in groups){
  html+=`<div class="league" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'block'">🌍 ${league}</div><div>`;
  groups[league].forEach(g=>{
   let status=g.fixture.status.short||'NS';
   let sLow=status.toLowerCase();
   let score=g.goals.display||'-:-';
   let isLive=sLow.includes('live')||sLow.includes('1h')||sLow.includes('2h')||sLow.includes('ht');
   let isFinished=sLow.includes('fin')||sLow.includes('ft')||sLow.includes('aet')|| (score!=='-:-' &&!sLow.includes('ns'));
   let scoreClass=isLive?'live': isFinished?'finished':'upcoming';
   let timeToShow=g.fixture.berlinTime||g.fixture.realBerlinTime||'--:--'; // EUROPE TIME

   // For finished & live show results like 2-1, for upcoming show -:-
   let resultDisplay = (isLive || isFinished)? score : '-:-';

   html+=`<div class="match" onclick="openMatch('${g.fixture.id}','${g.teams.home.name}','${g.teams.away.name}')">
     <div class="m-time">${timeToShow}<div class="m-status">${isLive?'<span class=dot></span>'+status:''}</div></div>
     <div class="m-teams">${g.teams.home.name}<br>${g.teams.away.name}</div>
     <div class="m-score ${scoreClass}">${resultDisplay}<div class="m-status">${!isLive?status:''}</div></div>
   </div>`;
  });
  html+=`</div>`;
 }
 cont.innerHTML=html||'<div style="padding:20px;text-align:center">No games for this filter</div>';
}

initTabs();loadGames(getDateStr(0));
</script>
</body>
</html>
