const els={};const el=()=>({textContent:'',innerHTML:'',hidden:true,classList:{toggle(){}}});
global.document={querySelector:s=>els[s]||(els[s]=el()),addEventListener(){}};
global.setTimeout=(f)=>setImmediate(f);
