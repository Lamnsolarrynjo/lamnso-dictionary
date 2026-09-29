export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const headers = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"content-type"};
    if(req.method==="OPTIONS") return new Response(null,{headers});
    if(url.pathname === "/api/dict" && req.method === "GET"){
      let single = await env.DICT.get("DICTIONARY");
      if(single){ try{ return new Response(single, {headers:{...headers,"content-type":"application/json"}}); }catch(e){} }
      let list = await env.DICT.list(); let words = [];
      for(let k of list.keys){ if(k.name==="DICTIONARY") continue; let v = await env.DICT.get(k.name); try{ words.push(JSON.parse(v)); }catch(e){} }
      return new Response(JSON.stringify(words), {headers:{...headers,"content-type":"application/json"}});
    }
    if(url.pathname === "/api/dict" && req.method === "POST"){
      let body = await req.json(); let words = Array.isArray(body) ? body : body.words || [];
      if(words.length===0) return new Response(JSON.stringify({ok:false,count:0}), {headers});
      await env.DICT.put("DICTIONARY", JSON.stringify(words));
      return new Response(JSON.stringify({ok:true,count:words.length,mode:"single-key"}), {headers:{...headers,"content-type":"application/json"}});
    }
    if(url.pathname === "/api/clear" && req.method==="POST"){
      await env.DICT.delete("DICTIONARY"); let list = await env.DICT.list();
      for(let k of list.keys) await env.DICT.delete(k.name);
      return new Response(JSON.stringify({ok:true}), {headers:{...headers,"content-type":"application/json"}});
    }
    return new Response(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Nte' Nso Lamnso' Dictionary</title>
<style>
body{font-family:sans-serif;padding:12px;max-width:900px;margin:auto;background:#f8fafc}
button{padding:10px 14px;margin:4px;border-radius:8px;border:none;font-weight:bold;cursor:pointer}
input,textarea{width:100%;padding:12px;margin:6px 0;border:1px solid #ccc;border-radius:8px;box-sizing:border-box}
#list{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px;margin-top:15px}
.card{border:1px solid #ddd;padding:10px;border-radius:8px;background:#fff}
.editBtn{background:#f59e0b;color:white;padding:5px 10px;font-size:12px}
.delBtn{background:#ef4444;color:white;padding:5px 10px;font-size:12px}
#editModal,#donateModal{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:999;align-items:center;justify-content:center}
#editBox,#donateBox{background:white;padding:20px;border-radius:12px;width:90%;max-width:500px}
.donateCard{background:linear-gradient(135deg,#facc15,#f59e0b);padding:14px;border-radius:12px;margin:12px 0;border:2px solid #eab308}
</style>
</head><body>
<h1>Nte' Nso Lamnso' Dictionary</h1>
<div style="margin-bottom:8px">Bamdzeng-Nso | Founder Njolai L Kuhndze | <b><span id="wordCount">0</span> words</b> | 🌍 <span style="background:#22c55e;color:white;padding:3px 10px;border-radius:12px">● ONLINE - SINGLE KEY + EDIT</span></div>

<div class="donateCard">
<h3 style="margin:0">❤️ Support Nso Culture - Keep Lamnso' Alive!</h3>
<p style="margin:6px 0;font-size:14px">This dictionary is <b>FREE</b> for all Nso children worldwide. Your donation helps Founder <b>Lawrence Kuhndze Njolai</b> pay for internet, research & adding new words.</p>
<button style="background:#111827;color:white;width:100%" onclick="openDonate()">💛 Donate via MTN MoMo</button>
</div>

<div id="status" style="background:#dcfce7;padding:10px;margin:10px 0;border-radius:8px;border:1px solid #22c55e;font-weight:bold">Ready - Tap Edit on any word!</div>

<div style="border:2px dashed #22c55e;padding:12px;margin:12px 0;border-radius:10px;background:#f0fdf4">
<h3 style="margin:0 0 8px 0">📥 IMPORT</h3>
<input type="file" id="fileInput" accept=".json"><div id="importStatus" style="background:#fff;padding:8px;margin:6px 0;border-radius:5px;font-weight:bold;min-height:20px"></div>
<button style="background:#22c55e;color:white" onclick="importBulk()">📥 Import Local</button>
</div>

<div>
<button style="background:#16a34a;color:white" onclick="loadWorld()">🌍 Load WORLD</button>
<button style="background:#3b82f6;color:white" onclick="pushWorld()">⬆️ Push WORLD (1 PUT)</button>
<button style="background:#111827;color:white" onclick="exportW()">⬇️ Export</button>
<button style="background:#ef4444;color:white" onclick="killGhost()">👻 Clear All</button>
</div>

<input type="text" id="search" placeholder="Search Lamnso' or English..." oninput="doSearch()" style="margin-top:12px">
<div id="list"></div>

<div id="editModal"><div id="editBox">
<h3>Edit Word</h3><input type="hidden" id="editIndex">
<label>Lamnso'</label><input id="editLamnso"><label>Part of Speech</label><input id="editPOS">
<label>English</label><textarea id="editEnglish"></textarea><label>Example</label><textarea id="editEx"></textarea><label>Example English</label><textarea id="editExEn"></textarea>
<div style="margin-top:10px"><button style="background:#22c55e;color:white" onclick="saveEdit()">💾 Save</button><button style="background:#6b7280;color:white" onclick="closeEdit()">Cancel</button></div>
</div></div>

<div id="donateModal"><div id="donateBox">
<h3>❤️ Donate to Nte' Nso Dictionary</h3>
<p><b>Founder: Lawrence Kuhndze Njolai</b><br>MTN MoMo: <b style="font-size:18px">674061571</b></p>
<div style="background:#fef9c3;padding:10px;border-radius:8px;margin:10px 0">
<b>🇨🇲 In Cameroon:</b><br>1. Dial <b>*126#</b><br>2. Choose Send Money<br>3. Enter <b>674061571</b><br>4. Amount: 2000frs, 5000frs, 10000frs<br>5. Name: Lawrence Kuhndze Njolai
</div>
<div style="background:#dcfce7;padding:10px;border-radius:8px;margin:10px 0">
<b>🇺🇸 In USA / Europe (Diaspora):</b><br>Use <b>WorldRemit, SendWave, or MTN MoMo International</b><br>Send to Cameroon MTN: <b>674061571</b><br>Name: Lawrence Kuhndze Njolai<br>Your $10 = ~6000frs support!
</div>
<p style="font-size:13px;color:#666">Every franc keeps Lamnso' alive for our children! Wiykiiy! 🙏</p>
<button style="background:#111827;color:white;width:100%" onclick="closeDonate()">Close</button>
</div></div>

<script>
let DICT=[];
async function loadWorld(){ document.getElementById('status').innerText='Loading...'; try{ let r=await fetch('/api/dict'); let data=await r.json(); DICT=data; document.getElementById('wordCount').innerText=DICT.length; document.getElementById('status').innerText='✅ Loaded '+DICT.length+' words!'; render(DICT);}catch(e){ document.getElementById('status').innerText='Load failed'; } }
async function pushWorld(){ if(DICT.length==0){ alert('No words!'); return; } if(!confirm('Push '+DICT.length+' words? 1 PUT only!')) return; document.getElementById('status').innerText='Pushing 1 PUT...'; try{ let r=await fetch('/api/dict',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(DICT)}); let j=await r.json(); document.getElementById('status').innerText='✅ Pushed '+j.count+' words!'; alert('SUCCESS! '+j.count+' words pushed!'); }catch(e){ document.getElementById('status').innerText='Failed: '+e.message; } }
function exportW(){ let blob=new Blob([JSON.stringify(DICT,null,2)],{type:'application/json'}); let a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='nte_nso_'+Date.now()+'.json'; a.click(); }
async function killGhost(){ if(!confirm('Clear ALL?')) return; await fetch('/api/clear',{method:'POST'}); DICT=[]; document.getElementById('wordCount').innerText='0'; render([]); }
async function importBulk(){ let f=document.getElementById('fileInput'); let s=document.getElementById('importStatus'); if(f.files.length==0){ alert('Choose file'); return; } let file=f.files[0]; s.innerText='Reading...'; try{ let text=await file.text(); let parsed=JSON.parse(text); let arr = Array.isArray(parsed) ? parsed : (parsed.words||parsed.data||[]); if(arr.length>0){ DICT=arr; document.getElementById('wordCount').innerText=DICT.length; s.innerText='✅ Loaded '+DICT.length+' words! Edit then Push!'; render(DICT); } }catch(e){ s.innerText='Error: '+e.message; } }
function doSearch(){ let q=document.getElementById('search').value.toLowerCase(); if(!q){ render(DICT); return; } let f=DICT.filter(w=>(w.lamnso||'').toLowerCase().includes(q)||(w.english||'').toLowerCase().includes(q)); render(f.slice(0,300)); }
function render(arr){ let html=''; for(let i=0;i<arr.slice(0,300).length;i++){ let w=arr[i]; let real=DICT.indexOf(w); html+='<div class=card><b style="font-size:18px">'+(w.lamnso||'')+'</b> <small>'+(w.partOfSpeech||'')+'</small><br>'+(w.english||'')+'<br><small>'+(w.example||'')+'</small><br><small style="color:#999">'+(w.exampleEnglish||'')+'</small><div style="margin-top:8px"><button class=editBtn onclick="openEdit('+real+')">✏️ Edit</button> <button class=delBtn onclick="deleteWord('+real+')">🗑️</button></div></div>'; } document.getElementById('list').innerHTML=html||'<p>No words</p>'; }
function openEdit(idx){ let w=DICT[idx]; document.getElementById('editIndex').value=idx; document.getElementById('editLamnso').value=w.lamnso||''; document.getElementById('editPOS').value=w.partOfSpeech||''; document.getElementById('editEnglish').value=w.english||''; document.getElementById('editEx').value=w.example||''; document.getElementById('editExEn').value=w.exampleEnglish||''; document.getElementById('editModal').style.display='flex'; }
function closeEdit(){ document.getElementById('editModal').style.display='none'; }
function saveEdit(){ let idx=parseInt(document.getElementById('editIndex').value); DICT[idx].lamnso=document.getElementById('editLamnso').value; DICT[idx].partOfSpeech=document.getElementById('editPOS').value; DICT[idx].english=document.getElementById('editEnglish').value; DICT[idx].example=document.getElementById('editEx').value; DICT[idx].exampleEnglish=document.getElementById('editExEn').value; closeEdit(); render(DICT); document.getElementById('status').innerText='✅ Edited! Push to save globally!'; }
function deleteWord(idx){ if(!confirm('Delete '+DICT[idx].lamnso+'?')) return; DICT.splice(idx,1); document.getElementById('wordCount').innerText=DICT.length; render(DICT); }
function openDonate(){ document.getElementById('donateModal').style.display='flex'; }
function closeDonate(){ document.getElementById('donateModal').style.display='none'; }
loadWorld();
<\/script></body></html>`, {headers:{"content-type":"text/html"}});
  }
}
