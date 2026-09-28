export default {
  async fetch(req, env) {
    let url = new URL(req.url);
    if(url.pathname === "/api/dict" && req.method === "GET"){
      let list = await env.DICT.list();
      let words = [];
      for(let k of list.keys){
        let v = await env.DICT.get(k.name);
        try{ words.push(JSON.parse(v)); }catch(e){}
      }
      return new Response(JSON.stringify(words), {headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}});
    }
    if(url.pathname === "/api/dict" && req.method === "POST"){
      let body = await req.json();
      let words = Array.isArray(body) ? body : body.words || [];
      for(let w of words){
        if(w.id) await env.DICT.put(String(w.id), JSON.stringify(w));
      }
      return new Response(JSON.stringify({ok:true,count:words.length}), {headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}});
    }
    if(url.pathname === "/api/clear"){
      let list = await env.DICT.list();
      for(let k of list.keys) await env.DICT.delete(k.name);
      return new Response(JSON.stringify({ok:true}), {headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}});
    }
    return new Response(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Nte' Nso Lamnso' Dictionary</title>
<style>body{font-family:sans-serif;padding:10px}button{padding:12px;margin:5px;border-radius:8px;border:none;font-weight:bold;cursor:pointer}input{width:100%;padding:12px;margin:5px 0;border:1px solid #ccc;border-radius:8px;box-sizing:border-box}#list{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}.card{border:1px solid #ddd;padding:10px;border-radius:8px}</style>
</head><body>
<h1>Nte' Nso Lamnso' Dictionary</h1>
<div>Bamdzeng-Nso | Founder Njolai L Kuhndze | <span id="wordCount">0</span> words | 🌍 WORLD <span style="background:#22c55e;color:white;padding:2px 8px;border-radius:10px">● ONLINE</span></div>
<div id="status" style="background:#dcfce7;padding:10px;margin:10px 0;border-radius:8px;border:1px solid #22c55e">Ready</div>

<div style="border:2px dashed #22c55e;padding:10px;margin:10px 0;border-radius:8px">
<h3>📥 IMPORT - FIXED - Supports your exported JSON file!</h3>
<input type="file" id="fileInput" accept=".json">
<div id="importStatus" style="background:#f0fdf4;padding:8px;margin:5px 0;border-radius:5px;font-weight:bold"></div>
<button style="background:#22c55e;color:white" onclick="importBulk()">📥 Import to WORLD KV</button>
<button onclick="document.getElementById('fileInput').value='';document.getElementById('importStatus').innerText='Cleared'">🧹 Clear File</button>
</div>

<div>
<button style="background:#16a34a;color:white" onclick="loadWorld()">🌍 Load WORLD (Separate)</button>
<button style="background:#3b82f6;color:white" onclick="pushWorld()">⬆️ Push to WORLD Global</button>
<button style="background:#111827;color:white" onclick="exportW()">⬇️ Export WORLD</button>
<button style="background:#ef4444;color:white" onclick="killGhost()">👻 Kill Ghost</button>
</div>

<input type="text" id="search" placeholder="Search Lamnso' or English..." oninput="doSearch()" style="margin-top:10px">
<div id="list" style="margin-top:15px"></div>

<script>
let DICT=[];
async function loadWorld(){
 document.getElementById('status').innerText='Loading WORLD...';
 try{
  let r=await fetch('/api/dict'); let data=await r.json();
  DICT=data; document.getElementById('wordCount').innerText=DICT.length;
  document.getElementById('status').innerText='✅ Loaded '+DICT.length+' words from WORLD!';
  render(DICT);
 }catch(e){ document.getElementById('status').innerText='Load failed: '+e.message; }
}
async function pushWorld(){
 if(DICT.length==0){ alert('No words loaded! Import first!'); return; }
 if(!confirm('Push '+DICT.length+' words to WORLD Global?')) return;
 document.getElementById('status').innerText='Pushing '+DICT.length+'...';
 let r=await fetch('/api/dict',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(DICT)});
 let j=await r.json(); document.getElementById('status').innerText='✅ Pushed '+j.count+' words to WORLD Global!'; alert('✅ Pushed '+j.count+' words!'); loadWorld();
}
function exportW(){
 let blob=new Blob([JSON.stringify(DICT,null,2)],{type:'application/json'});
 let a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='nte_nso_dictionary_'+Date.now()+'.json'; a.click();
}
async function killGhost(){ if(!confirm('Clear ALL WORLD?')) return; await fetch('/api/clear',{method:'POST'}); DICT=[]; document.getElementById('wordCount').innerText='0'; document.getElementById('status').innerText='Cleared'; render([]); }

async function importBulk(){
 let fileInput=document.getElementById('fileInput');
 let s=document.getElementById('importStatus');
 if(fileInput.files.length==0){ alert('Choose your 375kB file first!'); return; }
 let file=fileInput.files[0];
 alert('Step 1: Reading file '+file.name+' '+Math.round(file.size/1024)+'KB');
 s.innerText='Reading '+file.name+'...';
 try{
  let text=await file.text();
  alert('Step 2: File read! '+text.length+' chars. Now parsing JSON...');
  s.innerText='Parsing...';
  let parsed=JSON.parse(text);
  alert('Step 3: Parsed! Found '+(Array.isArray(parsed)?parsed.length:'not array')+' items. Loading to memory...');
  if(Array.isArray(parsed)){
   DICT=parsed;
   document.getElementById('wordCount').innerText=DICT.length;
   s.innerText='✅ File Loaded! '+DICT.length+' words! Now tap Push to WORLD Global!';
   render(DICT);
   alert('✅ SUCCESS! Loaded '+DICT.length+' words! Now tap Push to WORLD Global to save permanently!');
  } else { alert('File is not an array!'); s.innerText='Error: Not array'; }
 }catch(e){ alert('ERROR: '+e.message); s.innerText='Error: '+e.message; }
}
function doSearch(){
 let q=document.getElementById('search').value.toLowerCase();
 let f=DICT.filter(w=>(w.lamnso||'').toLowerCase().includes(q)||(w.english||'').toLowerCase().includes(q));
 render(f.slice(0,200));
}
function render(arr){
 let html=''; for(let w of arr.slice(0,200)){ html+='<div class=card><b>'+(w.lamnso||'')+'</b><br>'+(w.english||'')+'<br><small>'+(w.example||'')+'</small></div>'; }
 document.getElementById('list').innerHTML=html;
}
loadWorld();
<\/script></body></html>`, {headers:{"content-type":"text/html"}});
  }
}
