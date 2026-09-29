export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const ADMIN_PASSWORD = "njolaik2026";
    const headers = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"content-type,x-admin-key"};
    if(req.method==="OPTIONS") return new Response(null,{headers});
    
    function isAdmin() {
      const key = req.headers.get("x-admin-key") || url.searchParams.get("key");
      return key === ADMIN_PASSWORD || key === env.ADMIN_KEY;
    }

    if(url.pathname === "/api/dict" && req.method === "GET"){
      let single = await env.DICT.get("DICTIONARY");
      if(single){ try{ return new Response(single, {headers:{...headers,"content-type":"application/json"}}); }catch(e){} }
      let list = await env.DICT.list(); let words = [];
      for(let k of list.keys){ if(k.name==="DICTIONARY") continue; let v = await env.DICT.get(k.name); try{ words.push(JSON.parse(v)); }catch(e){} }
      return new Response(JSON.stringify(words), {headers:{...headers,"content-type":"application/json"}});
    }
    if(url.pathname === "/api/dict" && req.method === "POST"){
      if(!isAdmin()) return new Response(JSON.stringify({ok:false,error:"Unauthorized - Only Founder 674061571"}), {status:401, headers});
      let body = await req.json(); let words = Array.isArray(body) ? body : body.words || [];
      if(words.length===0) return new Response(JSON.stringify({ok:false,count:0}), {headers});
      await env.DICT.put("DICTIONARY", JSON.stringify(words));
      return new Response(JSON.stringify({ok:true,count:words.length,mode:"single-key-protected"}), {headers:{...headers,"content-type":"application/json"}});
    }
    if(url.pathname === "/api/clear" && req.method==="POST"){
      if(!isAdmin()) return new Response(JSON.stringify({ok:false,error:"Unauthorized"}), {status:401, headers});
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
.editBtn{background:#f59e0b;color:white;padding:6px 12px;font-size:13px;border-radius:6px}
.delBtn{background:#ef4444;color:white;padding:6px 12px;font-size:13px;border-radius:6px}
#editModal,#donateModal{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:999;align-items:center;justify-content:center}
#editBox,#donateBox{background:white;padding:20px;border-radius:12px;width:90%;max-width:500px}
.donateCard{background:linear-gradient(135deg,#facc15,#f59e0b);padding:14px;border-radius:12px;margin:12px 0;border:2px solid #eab308}
.adminOnly{display:none}
</style>
</head><body>
<h1>Nte' Nso Lamnso' Dictionary</h1>
<div style="margin-bottom:8px">Bamdzeng-Nso | Founder Njolai L Kuhndze | <b><span id="wordCount">0</span> words</b> | 🌍 <span style="background:#22c55e;color:white;padding:3px 10px;border-radius:12px">● ONLINE - PROTECTED</span> <button onclick="adminLogin()" style="background:#111827;color:white;padding:4px 8px;font-size:12px">🔐 Founder Login</button> <span id="adminBadge" style="display:none;background:#ef4444;color:white;padding:3px 8px;border-radius:10px;font-size:11px">🔓 ADMIN MODE</span></div>
<div class="donateCard">
<h3 style="margin:0">❤️ Support Nso Culture!</h3>
<p style="margin:6px 0;font-size:14px">FREE TRIAL until Dec 29, 2026! FREE for all Nso children. Donation helps Founder <b>Lawrence Kuhndze Njolai</b>.</p>
<button style="background:#111827;color:white;width:100%" onclick="openDonate()">💛 Donate via MTN MoMo - 674061571</button>
</div>
<div id="status" style="background:#dcfce7;padding:10px;margin:10px 0;border-radius:8px;border:1px solid #22c55e;font-weight:bold">Ready - Protected Mode!</div>
<div id="adminPanel" class="adminOnly" style="border:2px dashed #ef4444;padding:12px;margin:12px 0;border-radius:10px;background:#fef2f2">
<h3 style="margin:0 0 8px 0;color:#ef4444">🔐 FOUNDER ADMIN</h3>
<div style="border:2px dashed #22c55e;padding:12px;margin:12px 0;border-radius:10px;background:#f0fdf4">
<h4 style="margin:0 0 8px 0">📥 IMPORT</h4>
<input type="file" id="fileInput" accept=".json"><div id="importStatus" style="background:#fff;padding:8px;margin:6px 0;border-radius:5px;font-weight:bold;min-height:20px"></div>
<button style="background:#22c55e;color:white" onclick="importBulk()">📥 Import Local</button>
</div>
<div>
<button style="background:#16a34a;color:white" onclick="loadWorld()">🌍 Load WORLD</button>
<button style="background:#3b82f6;color:white" onclick="pushWorld()">⬆️ Push WORLD (1 PUT)</button>
<button style="background:#111827;color:white" onclick="exportW()">⬇️ Export</button>
<button style="background:#ef4444;color:white" onclick="killGhost()">👻 Clear All</button>
<button style="background:#6b7280;color:white" onclick="adminLogout()">🔒 Logout</button>
</div>
</div>
<div id="publicPanel">
<button style="background:#16a34a;color:white" onclick="loadWorld()">🌍 Reload Dictionary</button>
<button style="background:#111827;color:white" onclick="exportW()">⬇️ Export for Study</button>
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
<div style="background:#fef9c3;padding:10px;border-radius:8px;margin:10px 0"><b>🇨🇲 Cameroon:</b> Dial <b>*126#</b> -> Send Money -> <b>674061571</b></div>
<div style="background:#dcfce7;padding:10px;border-radius:8px;margin:10px 0"><b>🇺🇸 Diaspora:</b> WorldRemit / SendWave to MTN Cameroon <b>674061571</b></div>
<button style="background:#111827;color:white;width:100%" onclick="closeDonate()">Close</button>
</div></div>
<script>
let DICT=[]; 
function getAdminKey(){ return localStorage.getItem('nso_admin_key') || ''; }
function isAdminNow(){ return getAdminKey()==='njolaik2026'; }
function checkAdminUI(){ 
  let admin = isAdminNow();
  document.querySelectorAll('.adminOnly').forEach(e=>e.style.display= admin ? 'block' : 'none'); 
  document.getElementById('publicPanel').style.display= admin ? 'none' : 'block'; 
  document.getElementById('adminBadge').style.display= admin ? 'inline-block' : 'none'; 
  document.getElementById('status').innerText= admin ? '🔓 ADMIN MODE - You can edit & push. Protected!' : '✅ READ-ONLY Mode - Login to edit'; 
}
function adminLogin(){ let p=prompt('Enter Founder Password:'); if(!p) return; if(p==='njolaik2026'){ localStorage.setItem('nso_admin_key','njolaik2026'); alert('✅ Welcome Founder Lawrence!'); checkAdminUI(); loadWorld(); } else { alert('❌ Wrong password!'); } }
function adminLogout(){ localStorage.removeItem('nso_admin_key'); checkAdminUI(); loadWorld(); alert('Logged out - Read-only'); }
async function loadWorld(){ document.getElementById('status').innerText='Loading...'; try{ let r=await fetch('/api/dict'); let data=await r.json(); DICT=data; document.getElementById('wordCount').innerText=DICT.length; checkAdminUI(); render(DICT);}catch(e){ document.getElementById('status').innerText='Load failed'; } }
async function pushWorld(){ if(!isAdminNow()){ alert('Only Founder can push! Click Founder Login'); return; } if(DICT.length==0){ alert('No words!'); return; } if(!confirm('Push '+DICT.length+' words?')) return; document.getElementById('status').innerText='Pushing...'; try{ let r=await fetch('/api/dict?key='+getAdminKey(),{method:'POST',headers:{'content-type':'application/json','x-admin-key':getAdminKey()},body:JSON.stringify(DICT)}); if(r.status===401){ alert('Unauthorized! Login again'); return; } let j=await r.json(); document.getElementById('status').innerText='✅ Pushed '+j.count+' words!'; alert('SUCCESS! '+j.count+' words pushed!'); }catch(e){ document.getElementById('status').innerText='Failed: '+e.message; } }
function exportW(){ let blob=new Blob([JSON.stringify(DICT,null,2)],{type:'application/json'}); let a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='nte_nso_'+Date.now()+'.json'; a.click(); }
async function killGhost(){ if(!isAdminNow()){ alert('Only Founder!'); return; } if(!confirm('Clear ALL?')) return; await fetch('/api/clear?key='+getAdminKey(),{method:'POST',headers:{'x-admin-key':getAdminKey()}}); DICT=[]; document.getElementById('wordCount').innerText='0'; render([]); }
async function importBulk(){ if(!isAdminNow()){ alert('Login first'); return; } let f=document.getElementById('fileInput'); let s=document.getElementById('importStatus'); if(f.files.length==0){ alert('Choose file'); return; } let file=f.files[0]; s.innerText='Reading...'; try{ let text=await file.text(); let parsed=JSON.parse(text); let arr = Array.isArray(parsed) ? parsed : (parsed.words||parsed.data||[]); if(arr.length>0){ DICT=arr; document.getElementById('wordCount').innerText=DICT.length; s.innerText='✅ Loaded '+DICT.length+' words!'; render(DICT); } }catch(e){ s.innerText='Error: '+e.message; } }
function doSearch(){ let q=document.getElementById('search').value.toLowerCase(); if(!q){ render(DICT); return; } let f=DICT.filter(w=>(w.lamnso||'').toLowerCase().includes(q)||(w.english||'').toLowerCase().includes(q)); render(f.slice(0,300)); }
function render(arr){
  let admin = isAdminNow();
  let html='';
  for(let i=0;i<arr.slice(0,300).length;i++){
    let w=arr[i];
    let real=DICT.indexOf(w);
    let editBtns = admin ? '<div style="margin-top:8px"><button class=editBtn onclick="openEdit('+real+')">✏️ Edit</button> <button class=delBtn onclick="deleteWord('+real+')">🗑️ Delete</button></div>' : '';
    html+='<div class=card><b style="font-size:18px">'+(w.lamnso||'')+'</b> <small>'+(w.partOfSpeech||'')+'</small><br>'+(w.english||'')+'<br><small>'+(w.example||'')+'</small><br><small style="color:#999">'+(w.exampleEnglish||'')+'</small>'+editBtns+'</div>';
  }
  document.getElementById('list').innerHTML=html||'<p>No words</p>';
}
function openEdit(idx){ if(!isAdminNow()){ alert('Only Founder can edit!'); return; } let w=DICT[idx]; document.getElementById('editIndex').value=idx; document.getElementById('editLamnso').value=w.lamnso||''; document.getElementById('editPOS').value=w.partOfSpeech||''; document.getElementById('editEnglish').value=w.english||''; document.getElementById('editEx').value=w.example||''; document.getElementById('editExEn').value=w.exampleEnglish||''; document.getElementById('editModal').style.display='flex'; }
function closeEdit(){ document.getElementById('editModal').style.display='none'; }
function saveEdit(){ if(!isAdminNow()) return; let idx=parseInt(document.getElementById('editIndex').value); DICT[idx].lamnso=document.getElementById('editLamnso').value; DICT[idx].partOfSpeech=document.getElementById('editPOS').value; DICT[idx].english=document.getElementById('editEnglish').value; DICT[idx].example=document.getElementById('editEx').value; DICT[idx].exampleEnglish=document.getElementById('editExEn').value; closeEdit(); render(DICT); document.getElementById('status').innerText='✅ Edited! Push to save!'; }
function deleteWord(idx){ if(!isAdminNow()){ alert('Only Founder!'); return; } if(!confirm('Delete '+DICT[idx].lamnso+'?')) return; DICT.splice(idx,1); document.getElementById('wordCount').innerText=DICT.length; render(DICT); }
function openDonate(){ document.getElementById('donateModal').style.display='flex'; }
function closeDonate(){ document.getElementById('donateModal').style.display='none'; }
checkAdminUI(); loadWorld();
<\/script></body></html>`, {headers:{"content-type":"text/html"}});
  }
}
