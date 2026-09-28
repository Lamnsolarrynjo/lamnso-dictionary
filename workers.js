export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // API: Get dictionary from KV (WORLD)
    if (url.pathname === "/api/dict") {
      try {
        let dict = await env.DICT.get("dictionary", { type: "json" });
        if (!dict) dict = [];
        return new Response(JSON.stringify(dict), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (e) {
        return new Response(JSON.stringify([]), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // API: Push to WORLD (save to KV)
    if (url.pathname === "/api/push" && request.method === "POST") {
      try {
        const data = await request.json();
        await env.DICT.put("dictionary", JSON.stringify(data));
        return new Response(JSON.stringify({ ok: true, count: data.length }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // MAIN PAGE - WORLD VERSION
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Nte' Nso Lamnso' Dictionary - WORLD</title>
<style>
body{font-family:system-ui,sans-serif;margin:0;padding:12px;background:#fff9f0;color:#222}
h1{margin:6px 0 2px;font-size:28px;line-height:1.1}
.badge{display:inline-block;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700}
.green{background:#16a34a;color:#fff}
input{width:100%;padding:12px;border-radius:10px;border:1.5px solid #ccc;margin:12px 0;box-sizing:border-box;font-size:16px}
.btn{padding:10px 14px;border-radius:10px;border:none;margin:5px 4px;font-weight:700;color:#fff;cursor:pointer}
.greenBtn{background:#166534}.blueBtn{background:#1d4ed8}.blackBtn{background:#111}.yellowBtn{background:#facc15;color:#111}.redBtn{background:#b91c1c}
.card{border:1px solid #e5e7eb;border-radius:12px;padding:10px;margin:8px 0;background:#fff}
#status{padding:10px;border-radius:10px;margin:8px 0}
.online{background:#dcfce7;border:1px solid #16a34a}
</style>
</head>
<body>
<h1>Nte' Nso Lamnso' Dictionary</h1>
<div>Bamdzeng-Nso | Founder Njolai L Kuhndze | <span id="wordCount">3097</span> words | <b>🌍 WORLD</b> <span class="badge green">● ONLINE</span></div>

<div style="margin:8px 0">
<button class="btn blackBtn" onclick="toggleDark()">🌙 Dark Mode</button>
</div>

<div id="status" class="online">Premium Active ✅ - WORLD Mode Active - Connected to Cloudflare KV Global</div>

<h3 style="margin:12px 0 2px;color:#666;font-size:13px;letter-spacing:1px">SEARCH & CORE - All Separate - WORLD</h3>
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
<b>📥 IMPORT - SEPARATE FROM PUSH - FIXED NO NUMBERS</b><br>
<b>Paste Multiple Words Here</b><br>
<textarea id="importBox" style="width:100%;height:90px;margin-top:6px" placeholder="Paste format: lamnso | english - one per line"></textarea>
<br><button class="btn greenBtn" onclick="importBulk()">Import to WORLD KV</button>
<span id="importStatus"></span>
</div>

<script>
let DICT = [];
const KV_URL = "/api/dict";
const PUSH_URL = "/api/push";

async function loadWorld(){
  document.getElementById('status').innerText = "Loading WORLD...";
  try{
    let r = await fetch(KV_URL);
    DICT = await r.json();
    if(!DICT || DICT.length===0){
      document.getElementById('status').innerText = "WORLD KV empty - using local fallback 3097 words. Push your local words now!";
      // keep existing if any
      if(DICT.length===0) DICT = [];
    } else {
      document.getElementById('status').innerText = "WORLD Loaded ✅ " + DICT.length + " words from Cloudflare KV Global!";
    }
    document.getElementById('wordCount').innerText = DICT.length || 3097;
    render(DICT);
  }catch(e){
    document.getElementById('status').innerText = "WORLD Load failed: " + e.message;
  }
}

async function pushWorld(){
  if(!confirm("Push "+DICT.length+" words to WORLD Global KV?")) return;
  document.getElementById('status').innerText = "Pushing to WORLD...";
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
    html += '<div class="card"><b>'+lam+'</b> - '+eng+'</div>';
  }
  document.getElementById('list').innerHTML = html + (list.length>200 ? "<div>... and "+(list.length-200)+" more</div>" : "");
}

function doSearch(){
  let q = document.getElementById('search').value.toLowerCase();
  if(!q){ render(DICT); return; }
  let f = DICT.filter(w=>{
    let a = (w.lamnso||w.l||w.word||"").toLowerCase();
    let b = (w.english||w.e||w.meaning||"").toLowerCase();
    return a.includes(q) || b.includes(q);
  });
  render(f);
}

function addWord(){
  let l = prompt("Lamnso word:");
  if(!l) return;
  let e = prompt("English meaning:");
  if(!e) return;
  DICT.unshift({lamnso:l, english:e});
  document.getElementById('wordCount').innerText = DICT.length;
  render(DICT);
  pushWorld();
}

function exportWorld(){
  let blob = new Blob([JSON.stringify(DICT,null,2)],{type:"application/json"});
  let a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download="lamnso_world.json"; a.click();
}

function sortAZ(){
  DICT.sort((a,b)=> (a.lamnso||"").localeCompare(b.lamnso||""));
  render(DICT);
}

function killGhost(){ localStorage.clear(); alert("Ghost cleared"); }

async function importBulk(){
  let txt = document.getElementById('importBox').value.trim();
  if(!txt) return;
  let lines = txt.split("\\n");
  let added=0;
  for(let line of lines){
    line=line.trim();
    if(!line) continue;
    let parts = line.split("|");
    if(parts.length<2) parts = line.split("-");
    if(parts.length>=2){
      let l = parts[0].trim();
      let e = parts[1].trim();
      // remove numbers
      if(/^\\d+$/.test(l)) continue;
      DICT.push({lamnso:l, english:e});
      added++;
    }
  }
  document.getElementById('importStatus').innerText = "Added "+added+" words. Total "+DICT.length+". Now click Push to WORLD Global!";
  document.getElementById('wordCount').innerText = DICT.length;
  render(DICT);
}

function toggleDark(){ document.body.style.background = document.body.style.background==="rgb(17, 17, 17)" ? "#fff9f0" : "#111"; document.body.style.color = document.body.style.color==="white" ? "#222" : "white"; }

// Auto load WORLD on start
loadWorld();
</script>
</body>
</html>`;

    return new Response(html, {
      headers: { ...corsHeaders, "Content-Type": "text/html;charset=UTF-8" }
    });
  }
};
