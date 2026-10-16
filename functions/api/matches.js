export async function onRequest(){
 try{
  let all=[];
  let d=new Date().toISOString().split('T')[0].replace(/-/g,'');
  for(let lg of ['eng.1','esp.1','ita.1','ger.1']){
   try{
    let r=await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${lg}/scoreboard?dates=${d}`);
    let j=await r.json();
    (j.events||[]).forEach(ev=>{
     let c=ev.competitions[0];
     let h=c.competitors.find(x=>x.homeAway=='home');
     let a=c.competitors.find(x=>x.homeAway=='away');
     all.push({
       lg:ev.league.name,
       h:h.team.shortDisplayName,
       a:a.team.shortDisplayName,
       hs:parseInt(h.score)||0,
       as:parseInt(a.score)||0,
       st:c.status.type.state=='in'?'LIVE':c.status.type.state=='post'?'FINISHED':'UPCOMING',
       tm:c.status.displayClock||c.status.type.shortDetail
     });
    });
   }catch(e){}
  }
  if(all.length==0) all=[{lg:"Premier League",h:"Arsenal",a:"Man City",hs:2,as:1,st:"LIVE",tm:"67'"},{lg:"La Liga",h:"Real Madrid",a:"Barcelona",hs:2,as:2,st:"FINISHED",tm:"FT"},{lg:"NPFL",h:"Enyimba",a:"Remo Stars",hs:1,as:0,st:"LIVE",tm:"34'"}];
  return new Response(JSON.stringify({source: all.length>3?'live':'demo', matches:all, count:all.length}),{headers:{"Content-Type":"application/json","Cache-Control":"max-age=30"}});
 }catch(e){
  return new Response(JSON.stringify({matches:[{lg:"Premier League",h:"Arsenal",a:"Man City",hs:2,as:1,st:"LIVE",tm:"67'"}],count:1}),{headers:{"Content-Type":"application/json"}});
 }
}
