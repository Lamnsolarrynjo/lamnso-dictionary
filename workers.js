export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const DICT = env.DICT;

    const isValid = (w) => {
      if (!w) return false;
      const l = (w.lamnso || w.lam || w.word || '').toString().trim();
      const e = (w.english || w.eng || w.meaning || w.definition || w.senses?.[0]?.eng || '').toString().trim();
      if (!l ||!e) return false;
      if (l.toLowerCase() === 'undefined' || e.toLowerCase() === 'undefined') return false;
      // REJECT GHOST JSON FRAGMENTS
      if (l.startsWith('{') || l.startsWith('[') || l.includes('"id"') || l.includes('"lam"') || l.includes('"senses"') || l.includes('"eng"') || l.includes('—') && l.includes(',')) return false;
      if (l.length > 80 || e.length > 300) {
        // If it looks like JSON stringified, reject
        if (l.includes('id') && l.includes('lam') && l.includes('senses')) return false;
      }
      if (e.startsWith('{') || e.includes('"senses"')) return false;
      return true;
    };
    const clean = (arr) => (arr || []).filter(isValid).map(w => {
      let lam = (w.lamnso || w.lam || w.word || '').toString().trim().replace(/^["']|["']$/g,'').replace(/"/g, "'");
      let eng = (w.english || w.eng || w.meaning || w.definition || (w.senses && w.senses[0] && w.senses[0].eng) || '').toString().trim().replace(/^["']|["']$/g,'').replace(/"/g, "'");
      let pos = (w.pos || (w.senses && w.senses[0] && w.senses[0].pos) || 'n').toString().trim().toLowerCase();
      if (pos.length > 20) pos = 'n';
      // Normalize pos
      if (['noun','verb','adjective','adverb','pronoun','preposition','other','greeting','symbol'].includes(pos)) {}
      else if (pos === 'n' || pos.startsWith('n')) pos = 'n';
      else if (pos.startsWith('v')) pos = 'v';
      else pos = 'n';
      return {
        lamnso: lam,
        english: eng,
        pos: pos,
        id: w.id || Date.now() + Math.random()
      };
    });

    if (url.pathname === "/api/dictionary") {
      if (request.method === "GET") {
        let data = await DICT.get("dictionary_world", "json") || [];
        return new Response(JSON.stringify(clean(data)), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }
      if (request.method === "POST") {
        let body = await request.json();
        body = clean(body);
        await DICT.put("dictionary_world", JSON.stringify(body));
        return new Response(JSON.stringify({ ok: true, count: body.length }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }
    }

    if (url.pathname === "/api/check-access") {
      let { code } = await request.json();
      let sub = await DICT.get(`sub_${code}`, "json");
      if (!sub) return new Response(JSON.stringify({ ok: false }), { headers: { "Content-Type": "application/json" } });
      let expired = Date.now() > sub.expires;
      return new Response(JSON.stringify({ ok:!expired, data: sub }), { headers: { "Content-Type": "application/json" } });
    }

    if (url.pathname === "/api/subscribe") {
      let { email, phone, code } = await request.json();
      if(!code) return new Response(JSON.stringify({ ok:false, error:"No code" }), { headers: { "Content-Type": "application/json" } });
      let expires = Date.now() + 365*24*60*60*1000;
      await DICT.put(`sub_${code}`, JSON.stringify({ email, phone, code, expires, created: Date.now() }));
      return new Response(JSON.stringify({ ok: true, expires }), { headers: { "Content-Type": "application/json" } });
    }

    if (url.pathname === "/api/generate-code") {
      let code = "NTE-" + Math.random().toString(36).substring(2,8).toUpperCase() + "-" + Date.now().toString().slice(-4);
      return new Response(JSON.stringify({ code }), { headers: { "Content-Type": "application/json" } });
    }

    return new Response(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Nte' Nso Lamnso' Dictionary</title>
<style>
:root{--bg:#fff;--text:#111;--card:#f5f5f5;--primary:#0b5e2f}
.dark{--bg:#121212;--text:#eee;--card:#1e1e1e;--primary:#2ecc71}
body{background:var(--bg);color:var(--text);font-family:system-ui;margin:0;padding:12px;transition:0.3s}
.header{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap}
.btn{padding:9px 13px;margin:4px;border:none;border-radius:7px;cursor:pointer;font-weight:600}
.btn-primary{background:var(--primary);color:#fff}
.btn-blue{background:#1565c0;color:#fff}
.btn-red{background:#b00020;color:#fff}
.btn-yellow{background:#ffcc00;color:#000}
.btn-gray{background:#444;color:#fff}
.card{background:var(--card);padding:12px;border-radius:12px;margin:12px 0;border:1px solid #ddd}
.word-row{display:flex;justify-content:space-between;align-items:center;padding:10px;border-bottom:1px solid #ccc3}
textarea{width:98%;min-height:180px;padding:10px;border-radius:10px;border:2px solid var(--primary);font-size:15px;background:var(--bg);color:var(--text)}
input,select{padding:10px;border-radius:8px;border:1px solid #999;width:95%;margin:5px 0;background:var(--bg);color:var(--text)}
#importBox{border:2px dashed var(--primary)}
#paywall{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.92);color:#fff;z-index:9999;justify-content:center;align-items:center;text-align:center;padding:20px}
.label{font-size:12px;font-weight:800;letter-spacing:1px;color:#666;margin:8px 0 4px 0;display:block}
</style>
</head>
<body>
<div class="header">
  <div>
    <h1 style="margin:0">Nte' Nso Lamnso' Dictionary</h1>
    <small>Bamdzeng-Nso | Founder Njolai L Kuhndze | <span id="wordCount">0 words</span> | <span id="status">LOCAL</span></small>
  </div>
  <button class="btn btn-gray" onclick="toggleDark()">🌙 Dark Mode</button>
</div>

<div class="card">
  <span class="label">SEARCH & CORE - All Separate</span>
  <input id="searchBox" placeholder="Search Lāmso' or English..." oninput="handleSearch()">
  <div style="display:flex;flex-wrap:wrap;margin-top:8px">
    <button class="btn btn-primary" onclick="addWord()">+ Add Word (LOCAL)</button>
    <button class="btn btn-blue" onclick="loadWorld()">🌍 Load WORLD (Separate)</button>
    <button class="btn btn-blue" style="border:2px solid #fff" onclick="pushToWorld()">⬆️ Push to WORLD Global (Separate)</button>
    <button class="btn btn-gray" onclick="exportData()">⬇️ Export LOCAL</button>
    <button class="btn btn-yellow" onclick="sortAZ()">🔤 Sort A-Z (LOCAL)</button>
    <button class="btn btn-red" onclick="killGhost()">👻 Kill Ghost</button>
  </div>
</div>

<div class="card" style="border:2px dashed var(--primary);background:#e8f5e980">
  <span class="label">📥 IMPORT - SEPARATE FROM PUSH - No File Search</span>
  <h3 style="margin:4px 0">Paste Multiple Words Here</h3>
  <small>This does NOT search phone. Paste JSON or lines like wán - child, then Import adds to LOCAL only. Push to WORLD is separate.</small>
  <textarea id="importBox" placeholder="Paste JSON like:
[{&quot;lam&quot;:&quot;wán&quot;,&quot;eng&quot;:&quot;child&quot;,&quot;pos&quot;:&quot;n&quot;}]
OR lines like:
wán - child
kikum - leg
shuu - water
SUPPORTS: JSON, - | :,"></textarea><br>
  <button class="btn btn-primary" onclick="bulkImport()">✅ Import Pasted Words to LOCAL Only</button>
  <button class="btn btn-gray" onclick="document.getElementById('importBox').value='';document.getElementById('importStatus').innerText=''">Clear Box</button>
  <div id="importStatus" style="margin-top:8px;font-weight:bold;color:var(--primary)"></div>
</div>

<div class="card">
  <span class="label">🧹 DUPLICATES - All Separate</span>
  <div style="display:flex;flex-wrap:wrap">
    <button class="btn btn-gray" onclick="viewDuplicates()">👀 View Duplicates</button>
    <button class="btn btn-gray" onclick="mergeDuplicates()">🔗 Merge Duplicates (LOCAL)</button>
    <button class="btn btn-red" onclick="removeDuplicates()">🗑️ Remove Duplicates (LOCAL)</button>
    <button class="btn btn-primary" onclick="startLearn()">📚 Learn Mode</button>
  </div>
</div>

<div class="card">
  <h3>Subscription — Premium Access (Separate System)</h3>
  <input id="subEmail" placeholder="Email">
  <input id="subPhone" placeholder="Phone (MTN/Orange)">
  <input id="accessCode" placeholder="Activation Code">
  <div>
    <button class="btn btn-blue" onclick="checkAccess()">🔓 Check Access</button>
    <button class="btn btn-primary" onclick="subscribe()">💳 Subscribe 365 Days</button>
    <button class="btn btn-gray" onclick="generateCode()">⚙️ Generate Code (Admin)</button>
  </div>
  <small>MoMo: +237 674 061 571 — 10,000 FCFA / Year — 7 Days Free Trial</small>
  <div id="subStatus" style="font-weight:bold;margin-top:6px"></div>
</div>

<div id="list" class="card"></div>

<div id="paywall">
  <div>
    <h1>Your 7-Day Free Trial Ended</h1>
    <p>Pay <b>10,000 FCFA</b> to MTN MoMo: <b>+237 674 061 571</b></p>
    <input id="payCode" placeholder="Enter Activation Code" style="color:#000;background:#fff;padding:10px;width:80%">
    <br><br><button class="btn btn-primary" onclick="unlock()">Unlock Now</button>
  </div>
</div>

<script>
let localData = JSON.parse(localStorage.getItem('nte_dict')||'[]');
let WORLD_URL = location.origin + '/api/dictionary';
const TRIAL_KEY = 'nte_trial_start';
if(!localStorage.getItem(TRIAL_KEY)) localStorage.setItem(TRIAL_KEY, Date.now());
checkTrial();

const isValid = (w) => {
  if (!w) return false;
  const l = (w.lamnso || w.lam || w.word || '').toString().trim();
  const e = (w.english || w.eng || w.meaning || w.definition || (w.senses && w.senses[0] && w.senses[0].eng) || '').toString().trim();
  if (!l ||!e) return false;
  if (l.toLowerCase() === 'undefined' || e.toLowerCase() === 'undefined') return false;
  if (l.startsWith('{') || l.startsWith('[') || l.includes('"id"') || l.includes('"lam"') || l.includes('"senses"')) return false;
  if (e.startsWith('{') || e.includes('"senses"')) return false;
  return true;
};
const clean = (arr) => (arr||[]).filter(isValid).map(w=>{
  let lam = (w.lamnso || w.lam || w.word || '').toString().trim().replace(/^["']|["']$/g,'').replace(/"/g, "'");
  let eng = (w.english || w.eng || w.meaning || w.definition || (w.senses && w.senses[0] && w.senses[0].eng) || '').toString().trim().replace(/^["']|["']$/g,'').replace(/"/g, "'");
  let pos = (w.pos || (w.senses && w.senses[0] && w.senses[0].pos) || 'n').toString().trim().toLowerCase();
  if (pos.length > 20) pos = 'n';
  return {lamnso: lam, english: eng, pos: pos, id: w.id || Date.now()+Math.random()};
});

localData = clean(localData); saveLocal();

function toggleDark(){ document.body.classList.toggle('dark'); localStorage.setItem('dark', document.body.classList.contains('dark')) }
if(localStorage.getItem('dark')==='true') document.body.classList.add('dark');

function checkTrial(){
  let start = parseInt(localStorage.getItem(TRIAL_KEY));
  let days = (Date.now()-start)/(1000*60*60*24);
  let codeOk = localStorage.getItem('premium_code_ok');
  if(days>7 &&!codeOk){ document.getElementById('paywall').style.display='flex'; }
}

function render(data=localData){
  data = clean(data);
  document.getElementById('wordCount').innerText = data.length + ' words';
  let html = data.slice(0,500).map((w,idx)=>{
    let realIdx = localData.findIndex(x=>x.lamnso===w.lamnso && x.english===w.english);
    if(realIdx===-1) realIdx = idx;
    return \`<div class="word-row"><div><b>\${w.lamnso}</b> — \${w.english} \${w.pos?'<small>[ '+w.pos+' ]</small>':''}</div><div><button class="btn btn-yellow" style="padding:5px 8px" onclick="editWord(\${realIdx})">Edit</button><button class="btn btn-red" style="padding:5px 8px" onclick="deleteWord(\${realIdx})">Del</button></div></div>\`;
  }).join('') || '<small>No valid words — Use IMPORT box or Load WORLD</small>';
  document.getElementById('list').innerHTML = html;
}
render();

function handleSearch(){
  let q = document.getElementById('searchBox').value.toLowerCase();
  let f = localData.filter(w=> JSON.stringify(w).toLowerCase().includes(q));
  render(f);
}

function addWord(){
  let lam = prompt('Lāmso word:'); if(!lam || lam.toLowerCase()==='undefined') return;
  let eng = prompt('English meaning:'); if(!eng || eng.toLowerCase()==='undefined') return;
  localData.push({lamnso:lam.trim(), english:eng.trim(), pos:'n', id:Date.now()});
  saveLocal(); render(); document.getElementById('status').innerText='LOCAL - Not yet pushed';
}
function editWord(i){ let w=localData[i]; if(!w) return; let l=prompt('Edit Lāmso:',w.lamnso); if(l===null) return; let e=prompt('Edit English:',w.english); if(e===null) return; if(!l.trim()||!e.trim()) return; localData[i]={lamnso:l.trim(), english:e.trim(), pos:w.pos, id:w.id}; saveLocal(); render(); }
function deleteWord(i){ if(!localData[i]) return; if(confirm('Delete '+localData[i].lamnso+'? (LOCAL only, push to delete globally)')){ localData.splice(i,1); saveLocal(); render(); } }
function saveLocal(){ localData = clean(localData); localStorage.setItem('nte_dict', JSON.stringify(localData)); }

function killGhost(){
  let before = localData.length;
  let raw = JSON.parse(localStorage.getItem('nte_dict')||'[]');
  let cleaned = clean(raw);
  localData = cleaned;
  saveLocal(); render();
  alert('Ghost killed: '+(before-cleaned.length)+' invalid removed (like {"id -...}). Now Push to WORLD Global separately to kill globally.');
}

function exportData(){
  let blob = new Blob([JSON.stringify(clean(localData),null,2)], {type:'application/json'});
  let a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='nte_nso_dictionary_'+Date.now()+'.json'; a.click();
}

function bulkImport(){
  let text=document.getElementById('importBox').value.trim();
  if(!text) return alert('Paste words in box first');
  let imported=[];

  // 1. TRY JSON FIRST (your format with senses)
  let triedJson = false;
  if(text.startsWith('[') || text.startsWith('{')){
    try {
      let data = JSON.parse(text);
      if(!Array.isArray(data)) data = [data];
      data.forEach(item=>{
        let lam = (item.lamnso || item.lam || item.word || '').toString().trim();
        let eng = (item.english || item.eng || item.meaning || item.definition || (item.senses && item.senses[0] && item.senses[0].eng) || '').toString().trim();
        let pos = (item.pos || (item.senses && item.senses[0] && item.senses[0].pos) || 'n').toString().trim();
        if(lam && eng &&!lam.startsWith('{') &&!lam.includes('"id"')){
          imported.push({lamnso: lam.replace(/"/g,"'"), english: eng.replace(/"/g,"'"), pos: pos, id: item.id || Date.now()+Math.random()});
        }
      });
      triedJson = true;
    } catch(e){
      triedJson = false;
    }
  }

  // 2. IF NOT JSON, FALL BACK TO LINE PARSING (wán - child)
  if(!triedJson){
    let lines=text.split('\\n');
    for(let line of lines){
      line=line.trim(); if(!line) continue;
      // Skip lines that look like JSON fragments
      if(line.startsWith('{') || line.startsWith('[') || line.includes('"id"') || line.includes('"lam"') || line.includes('"senses"')) continue;
      let parts=null;
      if(line.includes(' - ')) parts=line.split(' - ');
      else if(line.includes(' | ')) parts=line.split(' | ');
      else if(line.includes('|')) parts=line.split('|');
      else if(line.includes(' : ')) parts=line.split(' : ');
      else if(line.includes(':')) parts=line.split(':');
      else if(line.includes(',')) parts=line.split(',');
      else if(line.includes('-')) parts=line.split('-');
      else continue;
      if(parts && parts.length>=2){
        let lam=parts[0].trim().replace(/^["']|["']$/g,'');
        let eng=parts.slice(1).join(' ').trim().replace(/^["']|["']$/g,'');
        if(lam && eng &&!lam.startsWith('{') && lam.toLowerCase()!=='undefined' && eng.toLowerCase()!=='undefined'){
          imported.push({lamnso:lam, english:eng, pos:'n', id:Date.now()+Math.random()});
        }
      }
    }
  }

  imported=clean(imported);
  if(!imported.length){
    document.getElementById('importStatus').innerText='❌ No valid words. You pasted JSON fragments like {"id... which are now rejected as ghost. Paste clean JSON array like [{"lam":"bánén","eng":"to gather together","pos":"verb"}] or lines like wán - child';
    return;
  }
  let existing=new Set(localData.map(w=>w.lamnso.toLowerCase()));
  let added=0;
  for(let w of imported){ if(!existing.has(w.lamnso.toLowerCase())){ localData.push(w); existing.add(w.lamnso.toLowerCase()); added++; } }
  saveLocal(); render();
  document.getElementById('importStatus').innerText='✅ Parsed '+imported.length+' | Added '+added+' new to LOCAL only. Duplicate skipped '+(imported.length-added)+'. Now separately Push to WORLD Global if you want worldwide.';
  document.getElementById('status').innerText='LOCAL - Imported, not yet pushed';
}

async function loadWorld(){
  if(!confirm('Load WORLD will replace LOCAL. Export first if needed. Continue?')) return;
  let r = await fetch(WORLD_URL); let data = await r.json();
  data = clean(data);
  localData = data; saveLocal(); render();
  document.getElementById('status').innerText='WORLD Loaded';
  alert('WORLD Loaded: '+data.length+' words (cleaned)');
}
async function pushToWorld(){
  let c = clean(localData);
  if(!c.length) return alert('LOCAL is empty — cannot push empty to WORLD');
  if(!confirm('Push '+c.length+' words to WORLD Global? This will OVERWRITE world database. This is SEPARATE from Import.')) return;
  await fetch(WORLD_URL,{method:'POST', body:JSON.stringify(c), headers:{'Content-Type':'application/json'}});
  document.getElementById('status').innerText='WORLD Pushed';
  alert('✅ Pushed to WORLD Global: '+c.length+' words. Import remains separate.');
}

function viewDuplicates(){
  let seen={}; let dups=[];
  localData.forEach(w=>{ let k=(w.lamnso||'').toLowerCase(); if(seen[k]) dups.push(w); else seen[k]=1 });
  alert(dups.length? 'Duplicates ('+dups.length+'): '+dups.map(d=>d.lamnso).join(', ') : 'No duplicates');
}
function mergeDuplicates(){
  let map={}; localData.forEach(w=>{ let k=(w.lamnso||'').toLowerCase(); if(!map[k]) map[k]=w; else map[k].english+='; '+w.english });
  localData=Object.values(map); saveLocal(); render(); alert('Merged! Now '+localData.length+' unique');
}
function removeDuplicates(){
  let map={}; localData.forEach(w=>{ let k=(w.lamnso||'').toLowerCase(); map[k]=w });
  let before=localData.length; localData=Object.values(map); saveLocal(); render(); alert('Removed '+(before-localData.length)+' duplicates! Now '+localData.length);
}
function sortAZ(){ localData.sort((a,b)=>(a.lamnso||'').localeCompare(b.lamnso||'')); saveLocal(); render(); }

function startLearn(){
  if(!localData.length) return alert('No words');
  let i=0; let show=()=>{ let w=localData[i]; alert((i+1)+'/'+localData.length+'\\n'+w.lamnso+' = '+w.english); i=(i+1)%localData.length };
  show(); let t=setInterval(()=>{ if(confirm('Next word?')) show(); else clearInterval(t) },150);
}

async function checkAccess(){
  let code=document.getElementById('accessCode').value.trim();
  if(!code) return alert('Enter code');
  let r=await fetch('/api/check-access',{method:'POST', body:JSON.stringify({code}), headers:{'Content-Type':'application/json'}});
  let j=await r.json(); document.getElementById('subStatus').innerText=j.ok?'✅ Access Valid 365 days':'❌ Invalid / Expired';
  if(j.ok){ localStorage.setItem('premium_code_ok','1'); document.getElementById('paywall').style.display='none' }
}
async function subscribe(){
  let email=document.getElementById('subEmail').value;
  let phone=document.getElementById('subPhone').value;
  let code=document.getElementById('accessCode').value;
  if(!code) return alert('Enter Activation Code after payment to +237 674 061 571');
  let r=await fetch('/api/subscribe',{method:'POST', body:JSON.stringify({email,phone,code}), headers:{'Content-Type':'application/json'}});
  let j=await r.json(); if(j.ok){ alert('Subscribed! Valid 365 days'); localStorage.setItem('premium_code_ok','1'); document.getElementById('paywall').style.display='none' }
}
async function generateCode(){
  if(prompt('Admin key:')!=='njolaik2026') return alert('Wrong key');
  let r=await fetch('/api/generate-code'); let j=await r.json();
  document.getElementById('accessCode').value=j.code; alert('New Code: '+j.code+' - Give to user');
}
function unlock(){
  let c=document.getElementById('payCode').value.trim()||document.getElementById('accessCode').value.trim();
  if(!c) return alert('Enter code');
  document.getElementById('accessCode').value=c; checkAccess();
}
</script>
</body>
</html>`, { headers: { "Content-Type": "text/html" } });
  }
}
