export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const DICT = env.DICT;

    if (url.pathname === "/api/dictionary") {
      if (request.method === "GET") {
        let data = await DICT.get("dictionary_world", "json") || [];
        data = data.filter(w => w && w.lamnso && w.english && w.lamnso.toString().trim().toLowerCase() !== 'undefined' && w.english.toString().trim().toLowerCase() !== 'undefined' && w.lamnso.trim() !== '' && w.english.trim() !== '');
        return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }
      if (request.method === "POST") {
        let body = await request.json();
        body = body.filter(w => w && w.lamnso && w.english && w.lamnso.toString().trim().toLowerCase() !== 'undefined' && w.english.toString().trim().toLowerCase() !== 'undefined' && w.lamnso.trim() !== '' && w.english.trim() !== '');
        await DICT.put("dictionary_world", JSON.stringify(body));
        return new Response(JSON.stringify({ ok: true, count: body.length }), { headers: { "Content-Type": "application/json" } });
      }
    }

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nte' Nso Lamnso' Dictionary</title><style>
body{font-family:system-ui;padding:12px;background:#fff;color:#111}
.btn{padding:8px 12px;margin:4px;background:#0b5e2f;color:#fff;border:none;border-radius:6px;cursor:pointer}
.btn-edit{background:#ffcc00;color:#000} .btn-del{background:#c00;color:#fff}
.card{background:#f5f5f5;padding:12px;border-radius:10px;margin:10px 0}
.word-row{display:flex;justify-content:space-between;padding:8px;border-bottom:1px solid #ccc}
textarea{width:98%;min-height:160px;padding:10px;border-radius:8px;border:2px solid #0b5e2f;font-size:15px}
input{padding:8px;border-radius:6px;border:1px solid #999;width:95%;margin:4px 0}
</style></head><body>
<h1>Nte' Nso Lamnso' Dictionary</h1><small>Bamdzeng-Nso | Founder Njolai L Kuhndze | <span id="wordCount">0 words</span></small>

<div class="card"><input id="searchBox" placeholder="Search..." oninput="handleSearch()"><br>
<button class="btn" onclick="addWord()">+ Add Word</button>
<button class="btn" onclick="loadWorld()">Load WORLD</button>
<button class="btn" style="background:#1a73e8" onclick="pushToWorld()">Push to WORLD Global (Separate)</button>
<button class="btn" style="background:#b00020" onclick="killGhost()">Kill Ghost</button>
<button class="btn" onclick="exportData()">Export</button>
</div>

<div class="card" style="border:2px dashed #0b5e2f;background:#e8f5e9"><h3 style="margin:0 0 8px 0">📥 IMPORT - Paste Multiple Words Here</h3>
<p style="margin:4px 0"><b>This is SEPARATE from Push to WORLD.</b> Paste many words, then Import adds to LOCAL only.</p>
<textarea id="importBox" placeholder="Paste MANY words here, one per line, like:
wán - love
shuu - water
kituké | head
mó' | mother
bó' - bag
Or paste JSON:
[ {&quot;lamnso&quot;:&quot;wán&quot;, &quot;english&quot;:&quot;love&quot;} ]"></textarea><br>
<button class="btn" onclick="bulkImport()">✅ Import Pasted Words to LOCAL</button>
<button class="btn" style="background:#555" onclick="document.getElementById('importBox').value='';document.getElementById('importStatus').innerText=''">Clear Box</button>
<div id="importStatus" style="margin-top:10px;font-weight:bold;color:#0b5e2f"></div>
<small>After Import, tap <b>Push to WORLD Global</b> only if you want it worldwide.</small>
</div>

<div id="list" class="card"></div>

<script>
let localData=JSON.parse(localStorage.getItem('nte_dict')||'[]');
let WORLD_URL=location.origin+'/api/dictionary';
function isValid(w){if(!w)return false;let l=(w.lamnso||'').toString().trim(),e=(w.english||'').toString().trim();if(!l||!e)return false;if(l.toLowerCase()=='undefined'||e.toLowerCase()=='undefined')return false;return true}
function clean(a){return (a||[]).filter(isValid)}
localData=clean(localData); localStorage.setItem('nte_dict',JSON.stringify(localData));
function render(d){d=clean(d||localData);document.getElementById('wordCount').innerText=d.length+' words';let h='';for(let i=0;i<d.length;i++){let w=d[i];let ri=localData.indexOf(w);h+='<div class=word-row><div><b>'+w.lamnso+'</b> - '+w.english+'</div><div><button class=btn-edit onclick=editWord('+ri+')>Edit</button><button class=btn-del onclick=deleteWord('+ri+')>Del</button></div></div>'}document.getElementById('list').innerHTML=h||'No words - paste in Import box above';}
render();
function handleSearch(){let q=document.getElementById('searchBox').value.toLowerCase();render(localData.filter(w=>JSON.stringify(w).toLowerCase().includes(q)))}
function addWord(){let l=prompt('Lamso:'),e=prompt('English:');if(!l||!e||l.toLowerCase()=='undefined'||e.toLowerCase()=='undefined')return;localData.push({lamnso:l.trim(),english:e.trim(),id:Date.now()});saveLocal();render()}
function editWord(i){let w=localData[i];let l=prompt('Edit Lamso:',w.lamnso);if(l===null)return;let e=prompt('Edit English:',w.english);if(e===null)return;localData[i]={lamnso:l.trim(),english:e.trim(),id:w.id};saveLocal();render()}
function deleteWord(i){if(confirm('Delete '+localData[i].lamnso+'?')){localData.splice(i,1);saveLocal();render()}}
function killGhost(){let b=localData.length;localData=clean(localData);saveLocal();render();alert('Ghost removed '+(b-localData.length))}
function saveLocal(){localStorage.setItem('nte_dict',JSON.stringify(clean(localData)))}
function exportData(){let blob=new Blob([JSON.stringify(clean(localData),null,2)],{type:'application/json'});let a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='nte_nso_dictionary.json';a.click();}
async function loadWorld(){let r=await fetch(WORLD_URL);let d=await r.json();d=clean(d);localData=d;saveLocal();render();alert('Loaded WORLD: '+d.length)}
async function pushToWorld(){if(!confirm('Push '+clean(localData).length+' words to WORLD Global? This is SEPARATE from Import.'))return;let c=clean(localData);await fetch(WORLD_URL,{method:'POST',body:JSON.stringify(c),headers:{'Content-Type':'application/json'}});localData=c;saveLocal();render();alert('Pushed '+c.length+' to WORLD Global')}
function bulkImport(){
  let text=document.getElementById('importBox').value.trim();
  if(!text) return alert('Paste words in box first');
  let imported=[];
  try{
    if(text.startsWith('[') || text.startsWith('{')){
      let json=JSON.parse(text); if(!Array.isArray(json)) json=[json];
      imported=json.map(o=>({lamnso:(o.lamnso||o.word||'').toString().trim(),english:(o.english||o.meaning||'').toString().trim(),id:Date.now()+Math.random()})).filter(isValid);
    } else {
      let lines=text.split('\\n');
      for(let line of lines){
        line=line.trim(); if(!line) continue;
        let parts=null;
        if(line.includes(' - ')) parts=line.split(' - ');
        else if(line.includes(' | ')) parts=line.split(' | ');
        else if(line.includes('|')) parts=line.split('|');
        else if(line.includes(' -')) parts=line.split('-');
        else if(line.includes(':')) parts=line.split(':');
        else if(line.includes(',')) parts=line.split(',');
        else continue;
        if(parts && parts.length>=2){
          let lam=parts[0].trim().replace(/^["']|["']$/g,''); let eng=parts.slice(1).join(' ').trim().replace(/^["']|["']$/g,'');
          if(lam && eng) imported.push({lamnso:lam,english:eng,id:Date.now()+Math.random()});
        }
      }
    }
  }catch(e){ document.getElementById('importStatus').innerText='❌ Error: '+e.message; return; }
  imported=clean(imported);
  if(!imported.length){ document.getElementById('importStatus').innerText='❌ No valid words. Use format: lamnso - english'; return; }
  let existing=new Set(localData.map(w=>w.lamnso.toLowerCase()+'|'+w.english.toLowerCase()));
  let added=0;
  for(let w of imported){ let k=w.lamnso.toLowerCase()+'|'+w.english.toLowerCase(); if(!existing.has(k)){localData.push(w); existing.add(k); added++;} }
  saveLocal(); render();
  document.getElementById('importStatus').innerText='✅ Imported '+added+' new words to LOCAL ('+imported.length+' parsed). Now separately tap Push to WORLD Global if you want worldwide.';
}
</script></body></html>`;
    return new Response(html, { headers: { "Content-Type": "text/html" } });
  }
};