export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const ADMIN_PASSWORD = "njolaik2026";
    const headers = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,POST,DELETE,OPTIONS","Access-Control-Allow-Headers":"content-type,x-admin-key"};
    if(req.method==="OPTIONS") return new Response(null,{headers});
    
    function isAdmin() {
      const key = req.headers.get("x-admin-key") || url.searchParams.get("key");
      return key === ADMIN_PASSWORD || key === env.ADMIN_KEY;
    }
    function genKey(prefix){
      const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let r=""; for(let i=0;i<4;i++) r+=chars[Math.floor(Math.random()*chars.length)];
      return `NSO-${prefix}-${r}-${new Date().getFullYear()}`;
    }

    if(url.pathname === "/api/dict" && req.method === "GET"){
      let single = await env.DICT.get("DICTIONARY");
      if(single){ try{ return new Response(single, {headers:{...headers,"content-type":"application/json"}}); }catch(e){} }
      let list = await env.DICT.list(); let words = [];
      for(let k of list.keys){ if(k.name==="DICTIONARY" || k.name.startsWith("SUB_")) continue; let v = await env.DICT.get(k.name); try{ words.push(JSON.parse(v)); }catch(e){} }
      return new Response(JSON.stringify(words), {headers:{...headers,"content-type":"application/json"}});
    }
    if(url.pathname === "/api/dict" && req.method === "POST"){
      if(!isAdmin()) return new Response(JSON.stringify({ok:false,error:"Unauthorized"}), {status:401, headers});
      let body = await req.json(); let words = Array.isArray(body) ? body : body.words || [];
      await env.DICT.put("DICTIONARY", JSON.stringify(words));
      return new Response(JSON.stringify({ok:true,count:words.length}), {headers:{...headers,"content-type":"application/json"}});
    }
    if(url.pathname === "/api/clear" && req.method==="POST"){
      if(!isAdmin()) return new Response(JSON.stringify({ok:false}), {status:401, headers});
      await env.DICT.delete("DICTIONARY"); let list = await env.DICT.list();
      for(let k of list.keys){ if(!k.name.startsWith("SUB_")) await env.DICT.delete(k.name); }
      return new Response(JSON.stringify({ok:true}), {headers});
    }
    // --- NEW KEY SYSTEM ---
    if(url.pathname === "/api/keys/generate" && req.method==="POST"){
      if(!isAdmin()) return new Response(JSON.stringify({ok:false}), {status:401, headers});
      let body = await req.json();
      let type = body.type || "MONTHLY"; // DAILY, MONTHLY, YEARLY, SCHOOL
      let days = type==="DAILY"?1: type==="MONTHLY"?30: type==="YEARLY"?365: type==="SCHOOL"?365:30;
      let key = genKey(type.substring(0,4));
      let data = {key, type, name:body.name||"", phone:body.phone||"", created:Date.now(), expires:Date.now()+days*24*60*60*1000, days, active:true, uses:0};
      await env.DICT.put("SUB_"+key, JSON.stringify(data));
      return new Response(JSON.stringify({ok:true, ...data}), {headers:{...headers,"content-type":"application/json"}});
    }
    if(url.pathname === "/api/keys/list" && req.method==="GET"){
      if(!isAdmin()) return new Response(JSON.stringify({ok:false}), {status:401, headers});
      let list = await env.DICT.list({prefix:"SUB_"}); let keys=[];
      for(let k of list.keys){ let v=await env.DICT.get(k.name); try{ keys.push(JSON.parse(v)); }catch(e){} }
      return new Response(JSON.stringify(keys), {headers:{...headers,"content-type":"application/json"}});
    }
    if(url.pathname.startsWith("/api/keys/") && req.method==="DELETE"){
      if(!isAdmin()) return new Response(JSON.stringify({ok:false}), {status:401, headers});
      let key = url.pathname.split("/").pop();
      await env.DICT.delete("SUB_"+key);
      return new Response(JSON.stringify({ok:true}), {headers});
    }
    if(url.pathname === "/api/verify" && req.method==="POST"){
      let body = await req.json(); let k = body.key?.trim().toUpperCase();
      if(!k) return new Response(JSON.stringify({ok:false,error:"no key"}), {status:400, headers});
      let dataStr = await env.DICT.get("SUB_"+k);
      if(!dataStr) return new Response(JSON.stringify({ok:false,error:"Invalid key - Pay MoMo 674061571"}), {status:401, headers});
      let d = JSON.parse(dataStr);
      if(!d.active) return new Response(JSON.stringify({ok:false,error:"Key blocked"}), {status:401, headers});
      if(Date.now() > d.expires) return new Response(JSON.stringify({ok:false,error:"Key expired - Renew MoMo 674061571"}), {status:401, headers});
      d.uses = (d.uses||0)+1; await env.DICT.put("SUB_"+k, JSON.stringify(d));
      return new Response(JSON.stringify({ok:true, type:d.type, name:d.name, expires:d.expires}), {headers:{...headers,"content-type":"application/json"}});
    }

    return new Response(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Nte' Nso Dictionary - Business</title>
<style>
body{font-family:sans-serif;padding:12px;max-width:900px;margin:auto;background:#f8fafc}
button{padding:10px 14px;margin:4px;border-radius:8px;border:none;font-weight:bold;cursor:pointer}
input,select,textarea{width:100%;padding:12px;margin:6px 0;border:1px solid #ccc;border-radius:8px;box-sizing:border-box}
#list{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px;margin-top:15px}
.card{border:1px solid #ddd;padding:10px;border-radius:8px;background:#fff}
#editModal,#donateModal,#payModal{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:999;align-items:center;justify-content:center}
#editBox,#donateBox,#payBox{background:white;padding:20px;border-radius:12px;width:90%;max-width:500px;max-height:90vh;overflow:auto}
.adminOnly{display:none}
#paywall{display:none;background:#111827;color:white;padding:30px;border-radius:15px;text-align:center;margin:20px 0}
.keyCard{background:#fff;border:1px solid #ddd;padding:10px;border-radius:8px;margin:5px 0;font-size:13px}
</style>
</head><body>
<h1>Nte' Nso Lamnso' Dictionary</h1>
<div style="margin-bottom:8px">Founder Njolai L Kuhndze | <b><span id="wordCount">0</span> words</b> | <button onclick="adminLogin()" style="background:#111827;color:white;padding:4px 8px;font-size:12px">🔐 Founder</button> <button onclick="subscriberLogin()" style="background:#0b5fff;color:white;padding:4px 8px;font-size:12px">🔑 Subscriber</button> <span id="adminBadge" style="display:none;background:#ef4444;color:white;padding:3px 8px;border-radius:10px;font-size:11px">ADMIN</span> <span id="subBadge" style="display:none;background:#0b5fff;color:white;padding:3px 8px;border-radius:10px;font-size:11px">PAID</span></div>
<div id="trialBanner" style="background:linear-gradient(135deg,#facc15,#f59e0b);padding:14px;border-radius:12px;margin:12px 0;border:2px solid #eab308">
<h3 style="margin:0">Nte' Nso Business Package</h3>
<p id="bannerText" style="margin:6px 0;font-size:14px">FREE TRIAL until Dec 29, 2026! After that PAID ONLY. In America, nothing goes for nothing.</p>
<button style="background:#111827;color:white;width:100%" onclick="openDonate()">💛 Pay via MTN MoMo - 674061571</button>
</div>
<div id="paywall">
<h2>🔒 PAID ACCESS ONLY</h2>
<p>Free Trial Ended Dec 29, 2026. Pay to continue.</p>
<div style="background:#1f2937;padding:15px;border-radius:10px;text-align:left;margin:15px 0">
<b>Prices:</b><br>Daily 200 FCFA / $0.50<br>Monthly 1,000 FCFA / $2<br>Yearly 5,000 FCFA / $10<br>School 25,000 FCFA / $50<br>
</div>
<p>MoMo: <b style="font-size:20px;color:#facc15">674061571</b></p>
<button style="background:#facc15;color:black;width:100%;padding:12px" onclick="subscriberLogin()">🔑 Enter Your Unique Key</button>
</div>
<div id="status" style="background:#dcfce7;padding:10px;margin:10px 0;border-radius:8px;border:1px solid #22c55e;font-weight:bold">Ready</div>

<div id="adminPanel" class="adminOnly" style="border:2px dashed #ef4444;padding:12px;margin:12px 0;border-radius:10px;background:#fef2f2">
<h3 style="color:#ef4444">🔐 FOUNDER ADMIN - Key Generator</h3>
<div style="background:#fff;padding:12px;border-radius:10px;margin:10px 0;border:2px solid #0b5fff">
<h4 style="margin:0 0 8px 0">🔑 GENERATE UNIQUE KEY (After Payment)</h4>
<input id="custName" placeholder="Customer Name e.g. John USA">
<input id="custPhone" placeholder="Phone / WhatsApp">
<select id="keyType"><option value="DAILY">DAILY - 200 FCFA / $0.5 - 1 day</option><option value="MONTHLY" selected>MONTHLY - 1,000 FCFA / $2 - 30 days</option><option value="YEARLY">YEARLY - 5,000 FCFA / $10 - 365 days</option><option value="SCHOOL">SCHOOL - 25,000 FCFA / $50 - 365 days</option></select>
<button style="background:#0b5fff;color:white;width:100%" onclick="generateKey()">⚡ Generate Unique Key</button>
<div id="newKeyResult" style="background:#dcfce7;padding:10px;margin-top:8px;border-radius:8px;display:none"></div>
</div>
<div style="background:#fff;padding:12px;border-radius:10px;margin:10px 0">
<h4 style="margin:0 0 8px 0">📋 All Active Keys <button style="background:#6b7280;color:white;padding:4px 8px;font-size:11px" onclick="loadKeys()">Refresh</button></h4>
<div id="keysList" style="max-height:300px;overflow:auto"></div>
</div>
<div style="border:2px dashed #22c55e;padding:12px;margin:12px 0;border-radius:10px;background:#f0fdf4">
<h4>📥 IMPORT</h4>
<input type="file" id="fileInput" accept=".json"><textarea id="pasteJson" placeholder='Paste JSON words' style="height:80px"></textarea>
<div id="importStatus" style="background:#fff;padding:6px;margin:6px 0;border-radius:5px;font-weight:bold"></div>
<button style="background:#22c55e;color:white" onclick="importBulk()">Import File</button>
<button style="background:#0b5fff;color:white" onclick="importFromPaste()">Import Paste</button>
</div>
<div>
<button style="background:#16a34a;color:white" onclick="loadWorld()">🌍 Load</button>
<button style="background:#3b82f6;color:white" onclick="pushWorld()">⬆️ Push WORLD</button>
<button style="background:#111827;color:white" onclick="exportW()">⬇️ Export (Founder Only)</button>
<button style="background:#ef4444;color:white" onclick="killGhost()">👻 Clear Dict</button>
<button style="background:#6b7280;color:white" onclick="adminLogout()">Logout</button>
</div>
</div>

<div id="publicPanel"><button style="background:#16a34a;color:white" onclick="loadWorld()">🌍 Reload Dictionary</button></div>
<input type="text" id="search" placeholder="Search Lamnso' or English..." oninput="doSearch()" style="margin-top:12px">
<div id="list"></div>
<div id="editModal"><div id="editBox"><h3>Edit</h3><input type="hidden" id="editIndex"><input id="editLamnso"><input id="editPOS"><textarea id="editEnglish"></textarea><textarea id="editEx"></textarea><textarea id="editExEn"></textarea><div style="margin-top:10px"><button style="background:#22c55e;color:white" onclick="saveEdit()">Save</button><button style="background:#6b7280;color:white" onclick="closeEdit()">Cancel</button></div></div></div>
<div id="donateModal"><div id="donateBox"><h3>Pay for Access</h3><p>MTN MoMo <b>674061571</b><br>After pay, WhatsApp receipt to Founder. You get unique key.</p><button style="background:#111827;color:white;width:100%" onclick="closeDonate()">Close</button></div></div>
<div id="payModal"><div id="payBox"><h3>Enter Your Unique Key</h3><input id="subKeyInput" placeholder="NSO-..."><div id="subStatus" style="padding:8px;margin:8px 0;border-radius:5px"></div><button style="background:#0b5fff;color:white;width:100%" onclick="verifySub()">Unlock</button><button style="background:#6b7280;color:white;width:100%;margin-top:6px" onclick="closePay()">Cancel</button></div></div>
<script>
let DICT=[];
const EXPIRY_DATE = new Date('2026-12-29T23:59:59Z');
function isExpired(){ return new Date() > EXPIRY_DATE; }
function getAdminKey(){ return localStorage.getItem('nso_admin_key') || ''; }
function getSubKey(){ return localStorage.getItem('nso_sub_key') || ''; }
function isAdminNow(){ return getAdminKey()==='njolaik2026'; }
function isSubNow(){ return !!localStorage.getItem('nso_sub_valid') || isAdminNow(); }
function checkAdminUI(){ 
  let admin = isAdminNow(); let sub = isSubNow(); let expired = isExpired();
  document.querySelectorAll('.adminOnly').forEach(e=>e.style.display= admin ? 'block' : 'none'); 
  document.getElementById('publicPanel').style.display= admin ? 'none' : 'block'; 
  document.getElementById('adminBadge').style.display= admin ? 'inline-block' : 'none'; 
  document.getElementById('subBadge').style.display= sub && !admin ? 'inline-block' : 'none';
  let paywall = document.getElementById('paywall');
  let search = document.getElementById('search');
  let list = document.getElementById('list');
  if(expired && !admin && !sub){ paywall.style.display='block'; search.style.display='none'; list.style.display='none'; document.getElementById('publicPanel').style.display='none'; document.getElementById('status').innerText='🔒 PAID ONLY - MoMo 674061571'; }
  else { paywall.style.display='none'; search.style.display='block'; list.style.display='grid'; if(!admin) document.getElementById('publicPanel').style.display='block'; document.getElementById('status').innerText= admin ? '🔓 ADMIN MODE' : (sub ? '✅ PAID ACCESS' : '✅ FREE TRIAL until Dec 29, 2026'); if(admin) loadKeys(); }
}
function adminLogin(){ let p=prompt('Enter Founder Password:'); if(p==='njolaik2026'){ localStorage.setItem('nso_admin_key','njolaik2026'); alert('Welcome Founder!'); checkAdminUI(); loadWorld(); } }
function adminLogout(){ localStorage.removeItem('nso_admin_key'); localStorage.removeItem('nso_sub_key'); localStorage.removeItem('nso_sub_valid'); checkAdminUI(); loadWorld(); }
function subscriberLogin(){ document.getElementById('payModal').style.display='flex'; }
function closePay(){ document.getElementById('payModal').style.display='none'; }
async function generateKey(){
  if(!isAdminNow()) return;
  let name=document.getElementById('custName').value.trim(); let phone=document.getElementById('custPhone').value.trim(); let type=document.getElementById('keyType').value;
  if(!name){ alert('Enter customer name'); return; }
  let r=await fetch('/api/keys/generate?key='+getAdminKey(),{method:'POST',headers:{'content-type':'application/json','x-admin-key':getAdminKey()},body:JSON.stringify({name,phone,type})});
  let j=await r.json();
  if(j.ok){
    document.getElementById('newKeyResult').style.display='block';
    document.getElementById('newKeyResult').innerHTML='<b>✅ Key Generated!</b><br><b style="font-size:18px;color:#0b5fff">'+j.key+'</b><br>Type: '+j.type+'<br>Customer: '+j.name+'<br>Expires: '+new Date(j.expires).toLocaleDateString()+'<br><br>Copy and send to customer on WhatsApp!';
    document.getElementById('custName').value=''; document.getElementById('custPhone').value=''; loadKeys();
  }
}
async function loadKeys(){
  if(!isAdminNow()) return;
  let r=await fetch('/api/keys/list?key='+getAdminKey(),{headers:{'x-admin-key':getAdminKey()}});
  let keys=await r.json();
  let html=''; if(keys.length==0) html='<small>No keys yet</small>';
  for(let k of keys){
    let expired = Date.now() > k.expires; let expDate = new Date(k.expires).toLocaleDateString();
    html+='<div class=keyCard><b>'+k.key+'</b> <span style="background:'+(expired?'#ef4444':'#22c55e')+';color:white;padding:2px 6px;border-radius:6px;font-size:11px">'+(expired?'EXPIRED':'ACTIVE')+'</span><br>'+k.type+' | '+k.name+' | '+k.phone+'<br>Uses: '+(k.uses||0)+' | Exp: '+expDate+' <button style="background:#ef4444;color:white;padding:2px 6px;font-size:11px" onclick="deleteKey(\\''+k.key+'\\')">Block</button></div>';
  }
  document.getElementById('keysList').innerHTML=html;
}
async function deleteKey(key){ if(!confirm('Block key '+key+'?')) return; await fetch('/api/keys/'+key+'?key='+getAdminKey(),{method:'DELETE',headers:{'x-admin-key':getAdminKey()}}); loadKeys(); }
async function verifySub(){
  let k=document.getElementById('subKeyInput').value.trim().toUpperCase(); let s=document.getElementById('subStatus');
  if(!k){ s.innerText='Enter key'; return; }
  try{ let r=await fetch('/api/verify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key:k})}); let j=await r.json(); if(r.ok && j.ok){ localStorage.setItem('nso_sub_key',k); localStorage.setItem('nso_sub_valid','1'); s.innerText='✅ Success! Type: '+j.type+' Expires: '+new Date(j.expires).toLocaleDateString(); setTimeout(()=>{ closePay(); checkAdminUI(); loadWorld(); },1000); } else { s.innerText='❌ '+j.error; } }catch(e){ s.innerText='Error: '+e.message; }
}
async function loadWorld(){ if(isExpired() && !isSubNow()){ checkAdminUI(); return; } document.getElementById('status').innerText='Loading...'; try{ let r=await fetch('/api/dict'); let data=await r.json(); DICT=data; document.getElementById('wordCount').innerText=DICT.length; checkAdminUI(); render(DICT);}catch(e){ document.getElementById('status').innerText='Load failed'; } }
async function pushWorld(){ if(!isAdminNow()) return; if(DICT.length==0) return; if(!confirm('Push '+DICT.length+'?')) return; document.getElementById('status').innerText='Pushing...'; let r=await fetch('/api/dict?key='+getAdminKey(),{method:'POST',headers:{'content-type':'application/json','x-admin-key':getAdminKey()},body:JSON.stringify(DICT)}); let j=await r.json(); document.getElementById('status').innerText='Pushed '+j.count; }
function exportW(){ if(!isAdminNow()){ alert('Founder only!'); return; } let blob=new Blob([JSON.stringify(DICT,null,2)],{type:'application/json'}); let a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='nte_nso_'+Date.now()+'.json'; a.click(); }
async function killGhost(){ if(!isAdminNow()) return; if(!confirm('Clear?')) return; await fetch('/api/clear?key='+getAdminKey(),{method:'POST',headers:{'x-admin-key':getAdminKey()}}); DICT=[]; document.getElementById('wordCount').innerText='0'; render([]); }
async function importBulk(){ if(!isAdminNow()) return; let f=document.getElementById('fileInput'); let s=document.getElementById('importStatus'); if(f.files.length==0) return; let text=await f.files[0].text(); let arr=JSON.parse(text); arr=Array.isArray(arr)?arr:arr.words||[]; let added=0; for(let nw of arr){ let key=(nw.lamnso||'').toLowerCase().trim(); if(!key) continue; if(!DICT.some(e=>(e.lamnso||'').toLowerCase().trim()===key)){ DICT.push(nw); added++; } } document.getElementById('wordCount').innerText=DICT.length; s.innerText='Merged '+added; render(DICT); }
async function importFromPaste(){ if(!isAdminNow()) return; let txt=document.getElementById('pasteJson').value.trim(); let arr=JSON.parse(txt); arr=Array.isArray(arr)?arr:arr.words||[]; let added=0; for(let nw of arr){ let key=(nw.lamnso||'').toLowerCase().trim(); if(!key) continue; if(!DICT.some(e=>(e.lamnso||'').toLowerCase().trim()===key)){ DICT.push(nw); added++; } } document.getElementById('wordCount').innerText=DICT.length; document.getElementById('importStatus').innerText='Merged '+added; render(DICT); }
function doSearch(){ if(isExpired() && !isSubNow()){ alert('Paid only'); return; } let q=document.getElementById('search').value.toLowerCase(); if(!q){ render(DICT); return; } let f=DICT.filter(w=>(w.lamnso||'').toLowerCase().includes(q)||(w.english||'').toLowerCase().includes(q)); render(f.slice(0,300)); }
function render(arr){ let html=''; for(let i=0;i<arr.slice(0,300).length;i++){ let w=arr[i]; html+='<div class=card><b>'+(w.lamnso||'')+'</b> <small>'+(w.partOfSpeech||'')+'</small><br>'+(w.english||'')+'</div>'; } document.getElementById('list').innerHTML=html||'<p>No words</p>'; }
function openDonate(){ document.getElementById('donateModal').style.display='flex'; }
function closeDonate(){ document.getElementById('donateModal').style.display='none'; }
function closeEdit(){}
checkAdminUI(); loadWorld();
<\/script></body></html>`, {headers:{"content-type":"text/html"}});
  }
}
