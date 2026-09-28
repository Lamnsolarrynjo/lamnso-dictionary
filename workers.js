export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const headers = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"content-type"};
    if(req.method==="OPTIONS") return new Response(null,{headers});

    if(url.pathname === "/api/dict" && req.method === "GET"){
      let single = await env.DICT.get("DICTIONARY");
      if(single){
        try{ return new Response(single, {headers:{...headers,"content-type":"application/json"}}); }catch(e){}
      }
      let list = await env.DICT.list();
      let words = [];
      for(let k of list.keys){
        if(k.name==="DICTIONARY") continue;
        let v = await env.DICT.get(k.name);
        try{ words.push(JSON.parse(v)); }catch(e){}
      }
      return new Response(JSON.stringify(words), {headers:{...headers,"content-type":"application/json"}});
    }
    if(url.pathname === "/api/dict" && req.method === "POST"){
      let body = await req.json();
      let words = Array.isArray(body) ? body : body.words || [];
      if(words.length===0) return new Response(JSON.stringify({ok:false,count:0}), {headers});
      await env.DICT.put("DICTIONARY", JSON.stringify(words));
      return new Response(JSON.stringify({ok:true,count:words.length,mode:"single-key"}), {headers:{...headers,"content-type":"application/json"}});
    }
    if(url.pathname === "/api/clear" && req.method==="POST"){
      await env.DICT.delete("DICTIONARY");
      let list = await env.DICT.list();
      for(let k of list.keys) await env.DICT.delete(k.name);
      return new Response(JSON.stringify({ok:true}), {headers:{...headers,"content-type":"application/json"}});
    }

    return new Response(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Nte' Nso Lamnso' Dictionary</title>
<style>
body{font-family:sans-serif;padding:12px;max-width:900px;margin:auto}
button{padding:12px 16px;margin:5px;border-radius:8px;border:none;font-weight:bold;cursor:pointer}
input{width:100%;padding:12px;margin:6px 0;border:1px solid #ccc;border-radius:8px;box-sizing:border-box}
#list{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px;margin-top:15px}
.card{border:1px solid #ddd;padding:10px;border-radius:8px;background:#fff}
</style>
</head><body>
<h1>Nte' Nso Lamnso' Dictionary</h1>
<div style="margin-bottom:8px">Bamdzeng-Nso | Founder Njolai L Kuhndze | <b><span id="wordCount">0</span> words</b> | 🌍 WORLD <span style="background:#22c55e;color:white;padding:3px 10px;border-radius:12px">● ONLINE - SINGLE KEY MODE (1 PUT)</span></div>
<div id="status" style="background:#dcfce7;padding:10px;margin:10px 0;border-radius:8px;border:1px solid #22c55e;font-weight:bold">Ready - New mode uses only 1 PUT for 3098 words!</div>

<div style="border:2px dashed #22c55e;padding:12px;margin:12px 0;border-radius:10px;background:#f0fdf4">
<h3 style="margin:0 0 8px 0">📥 IMPORT - FINAL FIX - 1 PUT MODE!</h3>
<input type="file" id="fileInput" accept=".json">
<div id="importStatus" style="background:#fff;padding:8px;margin:6px 0;border-radius:5px;font-weight:bold;min-height:20px"></div>
<button style="background:#22c55e;color:white" onclick="importBulk()">📥 Import to WORLD KV</button>
<button style="background:#e5e7eb" onclick="document.getElementById('fileInput').value='';document.getElementById('importStatus').innerText='Cleared'">🧹 Clear File</button>
</div>

<div>
<button style="background:#16a34a;color:white" onclick="loadWorld()">🌍 Load WORLD (Separate)</button>
<button style="background:#3b82f6;color:white" onclick="pushWorld()">⬆️ Push to WORLD Global (1 PUT)</button>
<button style="background:#111827;color:white" onclick="exportW()">⬇️ Export WORLD</button>
<button style="background:#ef4444;color:white" onclick="killGhost()">👻 Kill Ghost</button>
</div>

<input type="text" id="search" placeholder="Search Lamnso' or English..." oninput="doSearch()" style="margin-top:12px">
<div id="list"></div>

<script>
let DICT=[];

async function loadWorld(){
 document.getElementById('status').innerText='Loading WORLD...';
 try{
  let r=await fetch('/api/dict');
  let data=await r.json();
  DICT=data;
  document.getElementById('wordCount').innerText=DICT.length;
  document.getElementById('status').innerText='✅ Loaded '+DICT.length+' words from WORLD! Mode: Single-Key (1 PUT)';
  render(DICT);
 }catch(e){
  document.getElementById('status').innerText='Load failed: '+e.message;
 }
}

async function pushWorld(){
 if(DICT.length==0){ alert('No words loaded! Import first!'); return; }
 if(!confirm('Push '+DICT.length+' words to WORLD Global? New mode uses ONLY 1 PUT operation!')) return;
 document.getElementById('status').innerText='Pushing '+DICT.length+' words in ONE PUT...';
 try{
  let r=await fetch('/api/dict',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(DICT)});
  let j=await r.json();
  document.getElementById('status').innerText='✅ Pushed '+j.count+' words to WORLD Global in 1 PUT! All phones will see it!';
  alert('✅ SUCCESS! Pushed '+j.count+' words using only 1 PUT! KV limit problem solved! Now wife phone Load WORLD!');
  loadWorld();
 }catch(e){
  document.getElementById('status').innerText='Push failed (KV still blocked until 1am). Try after 1am Bamenda time: '+e.message;
  alert('KV blocked until 1am tonight (00:00 UTC). After 1am, push will work in 1 PUT and never block again!');
 }
}

function exportW(){
 let blob=new Blob([JSON.stringify(DICT,null,2)],{type:'application/json'});
 let a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='nte_nso_dictionary_'+Date.now()+'.json'; a.click();
}

async function killGhost(){
 if(!confirm('Clear ALL WORLD? This deletes everything!')) return;
 await fetch('/api/clear',{method:'POST'});
 DICT=[]; document.getElementById('wordCount').innerText='0';
 document.getElementById('status').innerText='WORLD Cleared';
 render([]);
}

async function importBulk(){
 let fileInput=document.getElementById('fileInput');
 let s=document.getElementById('importStatus');
 if(fileInput.files.length==0){ alert('Choose your 366KB JSON file first!'); return; }
 let file=fileInput.files[0];
 alert('Step 1: Reading '+file.name+' '+Math.round(file.size/1024)+'KB');
 s.innerText='Reading '+file.name+'...';
 try{
  let text=await file.text();
  alert('Step 2: File read '+text.length+' chars. Parsing...');
  s.innerText='Parsing JSON...';
  let parsed=JSON.parse(text);
  let arr = Array.isArray(parsed) ? parsed : (parsed.words || parsed.data || []);
  alert('Step 3: Parsed '+arr.length+' items. Loading...');
  if(arr.length>0){
   DICT=arr;
   document.getElementById('wordCount').innerText=DICT.length;
   s.innerText='✅ Loaded! '+DICT.length+' words! Now Push (1 PUT)!';
   render(DICT);
   alert('✅ SUCCESS! Loaded '+DICT.length+' words! Now Push to WORLD Global - only 1 PUT needed!');
  }else{
   alert('No words found!');
   s.innerText='No words';
  }
 }catch(e){
  alert('ERROR: '+e.message);
  s.innerText='Error: '+e.message;
 }
}

function doSearch(){
 let q=document.getElementById('search').value.toLowerCase();
 if(!q){ render(DICT); return; }
 let f=DICT.filter(w=>(w.lamnso||'').toLowerCase().includes(q)||(w.english||'').toLowerCase().includes(q)||(w.partOfSpeech||'').toLowerCase().includes(q));
 render(f.slice(0,300));
}
function render(arr){
 let html=''; 
 for(let w of arr.slice(0,300)){
  html+='<div class=card><b style="font-size:18px">'+(w.lamnso||'')+'</b> <small style="color:#666">'+(w.partOfSpeech||'')+'</small><br>'+(w.english||'')+'<br><small style="color:#444">'+(w.example||'')+'</small><br><small style="color:#999">'+(w.exampleEnglish||'')+'</small></div>';
 }
 document.getElementById('list').innerHTML=html || '<p>No words</p>';
}
loadWorld();
<\/script></body></html>`, {headers:{"content-type":"text/html"}});
  }
}
