const fs=require('fs');
const html=fs.readFileSync(__dirname+'/../bean-barter.html','utf8');
let src=html.split('<script>')[1].split('</script>')[0];
const el=()=>({textContent:'',innerHTML:'',hidden:true,classList:{toggle(){}}});
const els={};
global.document={querySelector:s=>els[s]||(els[s]=el()),addEventListener(){}};
global.setTimeout=(f)=>setImmediate(f);
src=src.replace('newGame();\n','');
src+=`
speed=0;autoPass=true;
async function play(g){
  newGame(); let steps=0;
  while(!S.over && steps<20000){ steps++;
    const p=me();
    if(S.cur===0 && S.phase==='plant'){
      if(p.hand.length && S.planted<1){ autoPlant(p.hand[0]); continue; }
      humanFlip(); continue;
    }
    if(S.cur===0 && S.phase==='trade'){ S.sel.face.add(0); askTable(); const k=(S.offers||[]).findIndex(o=>!o.no); if(k>=0) takeOffer(k); humanEndTrading(); continue; }
    if(S.phase==='humanPlant'){ if(p.pending.length){ autoPlant(p.pending[0]); continue;} if(S.cur===0){ humanEndTurn(); } }
    await new Promise(r=>setImmediate(r));
  }
  const total=S.players.reduce((s,p)=>s+p.coins,0);
  return S.players.map(p=>p.coins).join('/')+' steps '+steps+' over '+S.over+' runOuts '+S.runOuts+' cards '+(S.deck.length+S.discard.length+S.faceUp.length+S.players.reduce((s,p)=>s+p.hand.length+p.pending.length+p.coins+p.fields.reduce((a,f)=>a+f.n,0),0));
}
function autoPlant(t){ const p=me(); let i=p.fields.findIndex(f=>f.t===t); if(i<0) i=p.fields.findIndex(f=>!f.n);
  if(i<0){ i=p.fields.findIndex((f,k)=>canHarvest(p,k)); harvest(p,i);} clickField(i); }
(async()=>{ for(let g=0;g<5;g++) console.log(await play(g)); })().catch(e=>{console.error(e);process.exit(1)});
`;
const stub=fs.readFileSync(__dirname+'/stub.js','utf8');
fs.writeFileSync(__dirname+'/run.js',stub+src);
require(__dirname+'/run.js');
