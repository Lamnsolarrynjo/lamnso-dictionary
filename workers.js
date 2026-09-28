export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    if (url.pathname === "/api/dict") {
      try {
        let dict = await env.DICT.get("dictionary", { type: "json" });
        if (!dict) dict = [];
        return new Response(JSON.stringify(dict), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify([]), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    if (url.pathname === "/api/push" && request.method === "POST") {
      try {
        const data = await request.json();
        if(!data || data.length===0) throw new Error("Cannot push 0 words!");
        await env.DICT.put("dictionary", JSON.stringify(data));
        return new Response(JSON.stringify({ ok: true, count: data.length }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Nte' Nso Lamnso' Dictionary - WORLD</title>
<style>
body{font-family:system-ui,sans-serif;margin:0;padding:12px;background:#fff9f0;color:#222}
h1{margin:6px 0 2px;font-size:28px}
.badge{display:inline-block;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700}
.green{background:#16a34a;color:#fff}
input,textarea{width:100%;padding:12px;border-radius:10px;border:1.5px solid #ccc;margin:8px 0;box-sizing:border-box;font-size:16px}
.btn{padding:10px 14px;border-radius:10px;border:none;margin:5px 4px;font-weight:700;color:#fff;cursor:pointer}
.greenBtn{background:#166534}.blueBtn{background:#1d4ed8}.blackBtn{background:#111}.yellowBtn{background:#facc15;color:#111}.redBtn{background:#b91c1c}
.card{border:1px solid #e5e7eb;border-radius:12px;padding:10px;margin:8px 0;background:#fff}
#status{padding:10px;border-radius:10px;margin:8px 0}
.online{background:#dcfce7;border:1px solid #16a34a}
</style>
</head>
<body>
<h1>Nte' Nso Lamnso' Dictionary</h1>
<div>Bamdzeng-Nso | Founder Njolai L Kuhndze | <span id="wordCount">0</span> words | <b>🌍 WORLD</b> <span class="badge green">● ONLINE</span></div>
<div id="status" class="online">Loading WORLD...</div>
<h3 style="margin:12px 0 2px;color:#666;font-size:13px">SEARCH & CORE - All Separate - WORLD</h3>
<input id="search" placeholder="Search Lāmnso' or English... WORLD search" oninput="doSearch()" />
<div>
<button class="btn greenBtn" onclick="addWord()">+ Add Word (WORLD)</button>
<button class="btn blueBtn" onclick="loadWorld()">🌍 Load WORLD (Separate)</button>
<button class="btn blueBtn" onclick="pushWorld()">⬆️ Push to WORLD Global (Separate)</button>
<button class="btn blackBtn" onclick="exportWorld()">⬇️ Export WORLD</button>
<button class="btn yellowBtn" onclick="sortAZ()">🔤 Sort A-Z (WORLD)</button>
<button class="btn redBtn" onclick="killGhost()">👻 Kill Ghost</button>
</div>
<div id="list"></div>

<div style="border:2px dashed #16a34a;padding:10px;border-radius:10px;margin-top:14px">
<b>📥 IMPORT - FIXED - Supports your exported JSON file!</b><br>
<small>How to use your exported làmnso file: Choose File -> Import -> Push</small><br>
<input type="file" id="fileInput" accept=".json" />
<textarea id="importBox" style="height:90px" placeholder="Or paste: lamnso | english - one per line"></textarea>
<div style="display:flex;gap:6px">
<button onclick="document.getElementById('importBox').value=''; document.getElementById('importStatus').innerText='Paste cleared';">🧹 Clear Paste</button>
<button onclick="document.getElementById('fileInput').value=''; document.getElementById('importStatus').innerText='File cleared';">🧹 Clear File</button>
</div>
<br><button class="btn greenBtn" onclick="importBulk()">Import to WORLD KV</button>
<span id="importStatus" style="color:green;font-weight:bold;margin-left:8px"></span>
</div>

<script>
let DICT = [];
const KV_URL = "/api/dict";
const PUSH_URL = "/api/push";

async function loadWorld(){
  document.getElementById('status').innerText = "Loading WORLD...";
  try{
    let r = await fetch(KV_URL);
    let data = await r.json();
    if(!data || data.length===0){
      if(DICT.length>0){
        document.getElementById('status').innerText = "WORLD KV empty - You have "+DICT.length+" words ready in browser. Tap Push now!";
      } else {
        document.getElementById('status').innerText = "WORLD KV empty - No words yet. Import your 375kB file now!";
      }
    } else {
      DICT = data;
      document.getElementById('status').innerText = "WORLD Loaded ✅ " + DICT.length + " words from KV Global!";
      document.getElementById('wordCount').innerText = DICT.length;
      render(DICT);
    }
  }catch(e){
    document.getElementById('status').innerText = "Load failed: " + e.message;
  }
}

async function pushWorld(){
  if(DICT.length===0){
    alert("DICT is 0! You must Import your 375kB file first! Choose File -> Import -> then Push!");
    return;
  }
  if(!confirm("Push "+DICT.length+" words to WORLD Global KV?")) return;
  document.getElementById('status').innerText = "Pushing "+DICT.length+" words to WORLD...";
  let r = await fetch(PUSH_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(DICT)});
  let j = await r.json();
  if(j.ok) document.getElementById('status').innerText = "✅ Pushed " + j.count + " words to WORLD Global! Everyone can see it now!";
  else document.getElementById('status').innerText = "Push failed: " + j.error;
}

function render(list){
  let html = "";
  let show = list.slice(0,200);
  for(let w of show){
    let lam = w.lamnso || w.l || w.word || "";
    let eng = w.english || w.e || w.meaning || "";
    if(!lam) continue;
    html += '<div class="card"><b>'+lam+'</b> - '+eng+'</div>';
  }
  document.getElementById('list').innerHTML = html + (list.length>200 ? "<div>... and "+(list.length-200)+" more</div>" : "");
}

function doSearch(){
  let q = document.getElementById('search').value.toLowerCase();
  if(!q){ render(DICT); return; }
  let f = DICT.filter(w=>{
    let a = (w.lamnso||"").toLowerCase();
    let b = (w.english||"").toLowerCase();
    return a.includes(q) || b.includes(q);
  });
  render(f);
}

function addWord(){
  let l = prompt("Lamnso word:"); if(!l) return;
  let e = prompt("English meaning:"); if(!e) return;
  DICT.unshift({lamnso:l, english:e});
  document.getElementById('wordCount').innerText = DICT.length;
  render(DICT);
}

function exportWorld(){
  let blob = new Blob([JSON.stringify(DICT,null,2)],{type:"application/json"});
  let a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download="lamnso_world_"+DICT.length+"words.json"; a.click();
}

function sortAZ(){
  if(DICT.length===0){ alert("No words loaded yet! Import first!"); return; }
  DICT.sort((a,b)=> (a.lamnso||"").localeCompare(b.lamnso||""));
  render(DICT);
}

function killGhost(){ localStorage.clear(); alert("Ghost cleared"); }

async function importBulk(){
  let fileInput = document.getElementById('fileInput');
  let status = document.getElementById('importStatus');
  
  // 1. Try File first - FOR YOUR EXPORTED JSON FILE!
  if(fileInput.files.length>0){
    try{
      let text = await fileInput.files[0].text();
      let parsed = JSON.parse(text);
      if(Array.isArray(parsed)){
        DICT = parsed;
        status.innerText = "✅ File Loaded! "+DICT.length+" words! Now tap Push to WORLD Global!";
        document.getElementById('wordCount').innerText = DICT.length;
        render(DICT);
        return;
      }
    }catch(e){ alert("JSON File error: "+e.message); return; }
  }
  
  // 2. Try Paste box - supports both JSON and lamnso | english
  let txt = document.getElementById('importBox').value.trim();
  if(!txt){ alert("Choose your 375kB exported file first, or paste words!"); return; }
  
  try{
    // If paste is JSON
    if(txt.startsWith("[") || txt.startsWith("{")){
      let parsed = JSON.parse(txt);
      DICT = Array.isArray(parsed) ? parsed : [parsed];
      status.innerText = "✅ JSON Pasted! "+DICT.length+" words! Now Push!";
      document.getElementById('wordCount').innerText = DICT.length;
      render(DICT);
      return;
    }
  }catch(e){}
  
  // If paste is lamnso | english lines
  let lines = txt.split("\n");
  let added=0;
  for(let line of lines){
    line=line.trim(); if(!line) continue;
    let parts = line.split("|");
    if(parts.length<2) parts = line.split(" - ");
    if(parts.length>=2){
      let l = parts[0].trim(); let e = parts[1].trim();
      if(/^\\d+$/.test(l)) continue;
      if(!l || !e) continue;
      DICT.push({lamnso:l, english:e}); added++;
    }
  }
  status.innerText = "Added "+added+" words. Total "+DICT.length+". Now Push!";
  document.getElementById('wordCount').innerText = DICT.length;
  render(DICT);
}

function toggleDark(){}
loadWorld();
<\/script>
</body>
</html>`;
    return new Response(html, { headers: { ...corsHeaders, "Content-Type": "text/html;charset=UTF-8" } });
  }
};
