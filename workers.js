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
    if(url.pathname === "/api/keys/generate" && req.method==="POST"){
      if(!isAdmin()) return new Response(JSON.stringify({ok:false}), {status:401, headers});
      let body = await req.json();
      let type = body.type || "MONTHLY";
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
      if(!k) return new Response(JSON.stringify({ok:false,error:"Access key required"}), {status:400, headers});
      let dataStr = await env.DICT.get("SUB_"+k);
      if(!dataStr) return new Response(JSON.stringify({ok:false,error:"Invalid access key. Please check your key or contact support."}), {status:401, headers});
      let d = JSON.parse(dataStr);
      if(!d.active) return new Response(JSON.stringify({ok:false,error:"This access key has been deactivated. Contact support for assistance."}), {status:401, headers});
      if(Date.now() > d.expires) return new Response(JSON.stringify({ok:false,error:"Your subscription has expired. Please renew to continue access."}), {status:401, headers});
      d.uses = (d.uses||0)+1; await env.DICT.put("SUB_"+k, JSON.stringify(d));
      return new Response(JSON.stringify({ok:true, type:d.type, name:d.name, expires:d.expires}), {headers:{...headers,"content-type":"application/json"}});
    }

    return new Response(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Nte' Nso Dictionary</title>
<style>
body{font-family:system-ui,sans-serif;padding:12px;max-width:900px;margin:auto;background:#f8fafc;line-height:1.5}
button{padding:10px 14px;margin:4px;border-radius:8px;border:none;font-weight:600;cursor:pointer;transition:0.2s}
button:hover{opacity:0.9}
input,select,textarea{width:100%;padding:12px;margin:6px 0;border:1px solid #d1d5db;border-radius:8px;box-sizing:border-box;font-size:14px}
#list{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px;margin-top:16px}
.card{border:1px solid #e5e7eb;padding:12px;border-radius:10px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,0.05)}
#editModal,#donateModal,#payModal{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);z-index:999;align-items:center;justify-content:center;padding:16px}
#editBox,#donateBox,#payBox{background:white;padding:24px;border-radius:12px;width:100%;max-width:500px;max-height:90vh;overflow:auto}
.adminOnly{display:none}
#paywall{display:none;background:#111827;color:white;padding:32px;border-radius:16px;text-align:center;margin:20px 0}
.keyCard{background:#f9fafb;border:1px solid #e5e7eb;padding:10px;border-radius:8px;margin:6px 0;font-size:13px}
.badge{padding:3px 8px;border-radius:20px;font-size:11px;font-weight:bold}
</style>
</head><body>
<h1 style="margin-bottom:4px">Nte' Nso Lamnso' Dictionary</h1>
<p style="color:#6b7280;font-size:13px;margin-top:0">Preserving the Nso Language & Culture</p>
<div style="margin-bottom:12px;font-size:13px">Founder Njolai L Kuhndze | <b><span id="wordCount">0</span> words</b> | <button onclick="adminLogin()" style="background:#111827;color:white;padding:5px 10px;font-size:12px">🔐 Founder</button> <button onclick="subscriberLogin()" style="background:#2563eb;color:white;padding:5px 10px;font-size:12px">🔑 Subscriber</button> <span id="adminBadge" style="display:none;background:#dc2626;color:white" class="badge">FOUNDER</span> <span id="subBadge" style="display:none;background:#2563eb;color:white" class="badge">PREMIUM</span></div>

<div id="trialBanner" style="background:linear-gradient(135deg,#fef9c3,#fde047);padding:16px;border-radius:12px;margin:14px 0;border:1px solid #eab308">
<h3 style="margin:0;color:#422006">Welcome to Nte' Nso Dictionary</h3>
<p style="margin:8px 0 0 0;font-size:14px;color:#422006">Enjoy complimentary trial access until December 29, 2026. After the trial period, a premium subscription will be required to support continued development and cultural preservation efforts.</p>
<button style="background:#111827;color:white;width:100%;margin-top:12px" onclick="openDonate()">View Subscription Plans - MTN MoMo 674061571</button>
</div>

<div id="paywall">
<h2 style="margin-top:0">Premium Access Required</h2>
<p style="color:#d1d5db">Your trial period has concluded. Thank you for being part of our early community. Please subscribe to continue enjoying full access to the dictionary.</p>
<div style="background:#1f2937;padding:18px;border-radius:12px;text-align:left;margin:18px 0;font-size:14px;line-height:1.8">
<b style="color:#facc15">Subscription Plans:</b><br>
• Daily Access - 200 FCFA / $0.50 - 24 hours<br>
• Monthly Access - 1,000 FCFA / $2.00 - 30 days<br>
• Yearly Access - 5,000 FCFA / $10.00 - 365 days<br>
• School / Institution - 25,000 FCFA / $50.00 - 365 days + Editing Rights<br>
</div>
<p>Secure Payment via MTN Mobile Money: <b style="font-size:22px;color:#facc15">674061571</b><br><span style="font-size:12px;color:#9ca3af">After payment, send receipt via WhatsApp to receive your personal access key</span></p>
<button style="background:#facc15;color:#111827;width:100%;padding:14px;font-size:15px" onclick="subscriberLogin()">🔑 Enter Your Access Key</button>
</div>

<div id="status" style="background:#dcfce7;padding:10px;margin:12px 0;border-radius:8px;border:1px solid #86efac;font-weight:600;font-size:13px">Initializing...</div>

<div id="adminPanel" class="adminOnly" style="border:2px solid #dc2626;padding:16px;margin:16px 0;border-radius:12px;background:#fef2f2">
<h3 style="color:#dc2626;margin-top:0">🔐 Founder Control Panel</h3>
<div style="background:#fff;padding:16px;border-radius:10px;margin:12px 0;border:1px solid #3b82f6;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
<h4 style="margin:0 0 10px 0;color:#1e40af">🔑 Generate Subscriber Access Key</h4>
<p style="font-size:12px;color:#6b7280;margin:0 0 8px 0">Create a unique, time-limited access key after confirming payment</p>
<input id="custName" placeholder="Customer Full Name (e.g. John Doe, USA)">
<input id="custPhone" placeholder="Customer WhatsApp / Phone">
<select id="keyType"><option value="DAILY">Daily - 200 FCFA / $0.50 - 1 day</option><option value="MONTHLY" selected>Monthly - 1,000 FCFA / $2.00 - 30 days</option><option value="YEARLY">Yearly - 5,000 FCFA / $10.00 - 365 days</option><option value="SCHOOL">School/Institution - 25,000 FCFA / $50.00 - 365 days</option></select>
<button style="background:#2563eb;color:white;width:100%;padding:12px" onclick="generateKey()">Generate Unique Access Key</button>
<div id="newKeyResult" style="background:#dcfce7;padding:12px;margin-top:10px;border-radius:8px;display:none;border:1px solid #86efac"></div>
</div>
<div style="background:#fff;padding:16px;border-radius:10px;margin:12px 0">
<h4 style="margin:0 0 10px 0">📊 Active Subscriptions <button style="background:#6b7280;color:white;padding:4px 10px;font-size:11px" onclick="loadKeys()">Refresh List</button></h4>
<div id="keysList" style="max-height:350px;overflow:auto"></div>
</div>
<div style="border:1px solid #86efac;padding:16px;margin:12px 0;border-radius:10px;background:#f0fdf4">
<h4 style="margin-top:0">📚 Dictionary Management</h4>
<input type="file" id="fileInput" accept=".json"><textarea id="pasteJson" placeholder='Paste JSON dictionary data here' style="height:90px"></textarea>
<div id="importStatus" style="background:#fff;padding:8px;margin:8px 0;border-radius:6px;font-weight:600;font-size:12px;border:1px solid #e5e7eb"></div>
<button style="background:#16a34a;color:white" onclick="importBulk()">Import from File</button>
<button style="background:#2563eb;color:white" onclick="importFromPaste()">Import from Paste</button>
</div>
<div style="display:flex;flex-wrap:wrap;gap:6px">
<button style="background:#16a34a;color:white" onclick="loadWorld()">🌍 Load Dictionary</button>
<button style="background:#2563eb;color:white" onclick="pushWorld()">⬆️ Save to Cloud</button>
<button style="background:#111827;color:white" onclick="exportW()">⬇️ Export Backup (Founder Only)</button>
<button style="background:#ef4444;color:white" onclick="killGhost()">Clear All</button>
<button style="background:#6b7280;color:white" onclick="adminLogout()">Logout</button>
</div>
</div>

<div id="publicPanel"><button style="background:#16a34a;color:white" onclick="loadWorld()">🌍 Reload Dictionary</button></div>
<input type="text" id="search" placeholder="Search Lamnso' or English..." oninput="doSearch()" style="margin-top:16px">
<div id="list"></div>

<div id="donateModal"><div id="donateBox"><h3 style="margin-top:0">Subscription Information</h3><p style="font-size:14px;line-height:1.6">Thank you for supporting the preservation of the Nso language and culture.<br><br><b>Payment Method:</b><br>MTN Mobile Money: <b>674061571</b><br>Account Name: Njolai L Kuhndze<br><br><b>After Payment:</b><br>1. Send payment receipt via WhatsApp<br>2. You will receive a unique personal access key<br>3. Enter the key to unlock premium access<br><br><b>Plans:</b><br>Daily: 200 FCFA / $0.50<br>Monthly: 1,000 FCFA / $2<br>Yearly: 5,000 FCFA / $10<br>School: 25,000 FCFA / $50</p><button style="background:#111827;color:white;width:100%" onclick="closeDonate()">Close</button></div></div>
<div id="payModal"><div id="payBox"><h3 style="margin-top:0">Enter Access Key</h3><p style="font-size:12px;color:#6b7280">Enter the unique access key sent to you after payment</p><input id="subKeyInput" placeholder="e.g. NSO-MONT-ABCD-2026" style="text-transform:uppercase"><div id="subStatus" style="padding:10px;margin:10px 0;border-radius:6px;font-size:13px"></div><button style="background:#2563eb;color:white;width:100%;padding:12px" onclick="verifySub()">Unlock Dictionary</button><button style="background:#e5e7eb;color:#111827;width:100%;margin-top:8px" onclick="closePay()">Cancel</button></div></div>

<script>
let DICT=[];
const EXPIRY_DATE = new Date('2026-12-29T23:59:59Z');
function isExpired(){ return new Date() > EXPIRY_DATE; }
function getAdminKey(){ return localStorage.getItem('nso_admin_key') || ''; }
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
  let trialBanner = document.getElementById('trialBanner');
  if(expired && !admin && !sub){ 
    paywall.style.display='block'; search.style.display='none'; list.style.display='none'; 
    document.getElementById('publicPanel').style.display='none'; trialBanner.style.display='none';
    document.getElementById('status').innerText='Premium access required. Please subscribe to continue.';
  } else { 
    paywall.style.display='none'; search.style.display='block'; list.style.display='grid'; 
    trialBanner.style.display='block';
    if(!admin) document.getElementById('publicPanel').style.display='block'; 
    document.getElementById('status').innerText= admin ? 'Founder Mode Active - Full Control' : (sub ? 'Premium Access Active - Thank you for your support' : 'Trial Access Active - Expires Dec 29, 2026'); 
    if(admin) loadKeys(); 
  }
}
function adminLogin(){ let p=prompt('Enter Founder Password:'); if(p==='njolaik2026'){ localStorage.setItem('nso_admin_key','njolaik2026'); alert('Welcome Founder! Full access granted.'); checkAdminUI(); loadWorld(); } else if(p){ alert('Incorrect password'); } }
function adminLogout(){ localStorage.removeItem('nso_admin_key'); localStorage.removeItem('nso_sub_key'); localStorage.removeItem('nso_sub_valid'); checkAdminUI(); loadWorld(); }
function subscriberLogin(){ document.getElementById('payModal').style.display='flex'; document.getElementById('subKeyInput').focus(); }
function closePay(){ document.getElementById('payModal').style.display='none'; }
function openDonate(){ document.getElementById('donateModal').style.display='flex'; }
function closeDonate(){ document.getElementById('donateModal').style.display='none'; }
async function generateKey(){
  if(!isAdminNow()) return;
  let name=document.getElementById('custName').value.trim(); let phone=document.getElementById('custPhone').value.trim(); let type=document.getElementById('keyType').value;
  if(!name){ alert('Please enter customer name'); return; }
  document.getElementById('newKeyResult').style.display='block';
  document.getElementById('newKeyResult').innerHTML='Generating key...';
  let r=await fetch('/api/keys/generate?key='+getAdminKey(),{method:'POST',headers:{'content-type':'application/json','x-admin-key':getAdminKey()},body:JSON.stringify({name,phone,type})});
  let j=await r.json();
  if(j.ok){
    document.getElementById('newKeyResult').innerHTML='<b>✅ Access Key Generated Successfully</b><br><br><b style="font-size:20px;color:#1d4ed8;letter-spacing:1px">'+j.key+'</b><br><br>Type: '+j.type+' ('+j.days+' days)<br>Customer: '+j.name+'<br>Phone: '+j.phone+'<br>Expires: '+new Date(j.expires).toLocaleDateString()+'<br><br><span style="font-size:12px;color:#6b7280">Copy this key and send to customer via WhatsApp. Each key is unique and cannot be reused after blocking.</span>';
    document.getElementById('custName').value=''; document.getElementById('custPhone').value=''; loadKeys();
  } else {
    document.getElementById('newKeyResult').innerHTML='❌ Failed to generate key';
  }
}
async function loadKeys(){
  if(!isAdminNow()) return;
  let r=await fetch('/api/keys/list?key='+getAdminKey(),{headers:{'x-admin-key':getAdminKey()}});
  let keys=await r.json();
  keys.sort((a,b)=> b.created - a.created);
  let html=''; if(keys.length==0) html='<small style="color:#6b7280">No active subscriptions yet. Generate a key after payment confirmation.</small>';
  for(let k of keys){
    let expired = Date.now() > k.expires; let expDate = new Date(k.expires).toLocaleDateString(); let createdDate = new Date(k.created).toLocaleDateString();
    html+='<div class=keyCard><b style="font-size:14px">'+k.key+'</b> <span style="background:'+(expired?'#ef4444':(k.active?'#16a34a':'#6b7280'))+';color:white;padding:2px 8px;border-radius:10px;font-size:10px;margin-left:6px">'+(expired?'EXPIRED':(k.active?'ACTIVE':'INACTIVE'))+'</span><br><span style="color:#374151">'+k.type+' - '+k.days+' days | '+k.name+'</span><br><span style="font-size:11px;color:#6b7280">'+k.phone+' | Created: '+createdDate+' | Exp: '+expDate+' | Uses: '+(k.uses||0)+'</span> <button style="background:#ef4444;color:white;padding:3px 8px;font-size:11px;float:right" onclick="deleteKey(\\''+k.key+'\\')">Deactivate</button></div>';
  }
  document.getElementById('keysList').innerHTML=html;
}
async function deleteKey(key){ if(!confirm('Deactivate this access key? Customer will lose access: '+key)) return; await fetch('/api/keys/'+key+'?key='+getAdminKey(),{method:'DELETE',headers:{'x-admin-key':getAdminKey()}}); loadKeys(); }
async function verifySub(){
  let k=document.getElementById('subKeyInput').value.trim().toUpperCase(); let s=document.getElementById('subStatus');
  if(!k){ s.style.background='#fef2f2'; s.style.color='#dc2626'; s.innerText='Please enter your access key'; return; }
  s.style.background='#f3f4f6'; s.style.color='#374151'; s.innerText='Verifying...';
  try{ let r=await fetch('/api/verify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key:k})}); let j=await r.json(); if(r.ok && j.ok){ localStorage.setItem('nso_sub_key',k); localStorage.setItem('nso_sub_valid','1'); s.style.background='#dcfce7'; s.style.color='#166534'; s.innerText='Access granted! Welcome, '+j.name+'. Valid until: '+new Date(j.expires).toLocaleDateString(); setTimeout(()=>{ closePay(); checkAdminUI(); loadWorld(); },1500); } else { s.style.background='#fef2f2'; s.style.color='#dc2626'; s.innerText=j.error; } }catch(e){ s.style.background='#fef2f2'; s.style.color='#dc2626'; s.innerText='Verification failed. Please check connection and try again.'; }
}
async function loadWorld(){ if(isExpired() && !isSubNow()){ checkAdminUI(); return; } document.getElementById('status').innerText='Loading dictionary...'; try{ let r=await fetch('/api/dict'); let data=await r.json(); DICT=data; document.getElementById('wordCount').innerText=DICT.length; checkAdminUI(); render(DICT); document.getElementById('status').innerText= isAdminNow() ? 'Founder Mode - '+DICT.length+' entries loaded' : 'Dictionary loaded - '+DICT.length+' entries'; }catch(e){ document.getElementById('status').innerText='Unable to load dictionary. Please try again.'; } }
async function pushWorld(){ if(!isAdminNow()) return; if(DICT.length==0){ alert('No data to save'); return; } if(!confirm('Save '+DICT.length+' entries to cloud? This will update the live dictionary.')) return; document.getElementById('status').innerText='Saving to cloud...'; let r=await fetch('/api/dict?key='+getAdminKey(),{method:'POST',headers:{'content-type':'application/json','x-admin-key':getAdminKey()},body:JSON.stringify(DICT)}); let j=await r.json(); document.getElementById('status').innerText='Successfully saved '+j.count+' entries to cloud'; }
function exportW(){ if(!isAdminNow()){ alert('Founder access required for export'); return; } let blob=new Blob([JSON.stringify(DICT,null,2)],{type:'application/json'}); let a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='nte_nso_dictionary_backup_'+new Date().toISOString().slice(0,10)+'.json'; a.click(); document.getElementById('status').innerText='Backup exported - '+DICT.length+' entries'; }
async function killGhost(){ if(!isAdminNow()) return; if(!confirm('Are you sure? This will permanently delete all dictionary entries. This cannot be undone.')) return; if(!confirm('Final confirmation: Delete entire dictionary?')) return; await fetch('/api/clear?key='+getAdminKey(),{method:'POST',headers:{'x-admin-key':getAdminKey()}}); DICT=[]; document.getElementById('wordCount').innerText='0'; render([]); document.getElementById('status').innerText='Dictionary cleared'; }
async function importBulk(){ if(!isAdminNow()) return; let f=document.getElementById('fileInput'); let s=document.getElementById('importStatus'); if(f.files.length==0){ alert('Select a file first'); return; } try{ let text=await f.files[0].text(); let arr=JSON.parse(text); arr=Array.isArray(arr)?arr:arr.words||[]; let added=0; let skipped=0; for(let nw of arr){ let key=(nw.lamnso||'').toLowerCase().trim(); if(!key) continue; if(!DICT.some(e=>(e.lamnso||'').toLowerCase().trim()===key)){ DICT.push(nw); added++; } else { skipped++; } } document.getElementById('wordCount').innerText=DICT.length; s.style.background='#dcfce7'; s.innerText='Import complete: '+added+' new, '+skipped+' duplicates skipped. Total: '+DICT.length; render(DICT); } catch(e){ s.style.background='#fef2f2'; s.innerText='Import failed: '+e.message; } }
async function importFromPaste(){ if(!isAdminNow()) return; let txt=document.getElementById('pasteJson').value.trim(); let s=document.getElementById('importStatus'); if(!txt){ alert('Paste JSON first'); return; } try{ let arr=JSON.parse(txt); arr=Array.isArray(arr)?arr:arr.words||[]; let added=0; let skipped=0; for(let nw of arr){ let key=(nw.lamnso||'').toLowerCase().trim(); if(!key) continue; if(!DICT.some(e=>(e.lamnso||'').toLowerCase().trim()===key)){ DICT.push(nw); added++; } else { skipped++; } } document.getElementById('wordCount').innerText=DICT.length; s.style.background='#dcfce7'; s.innerText='Import complete: '+added+' new, '+skipped+' skipped. Total: '+DICT.length; render(DICT); document.getElementById('pasteJson').value=''; } catch(e){ s.style.background='#fef2f2'; s.innerText='Paste import failed: '+e.message; } }
function doSearch(){ if(isExpired() && !isSubNow()){ alert('Premium subscription required to search'); return; } let q=document.getElementById('search').value.toLowerCase().trim(); if(!q){ render(DICT); return; } let f=DICT.filter(w=> (w.lamnso||'').toLowerCase().includes(q) || (w.english||'').toLowerCase().includes(q) || (w.partOfSpeech||'').toLowerCase().includes(q)); render(f.slice(0,300)); }
function render(arr){ let html=''; let limit = arr.slice(0,400); for(let i=0;i<limit.length;i++){ let w=limit[i]; html+='<div class=card><div style="display:flex;justify-content:space-between;align-items:start"><b style="font-size:15px;color:#111827">'+(w.lamnso||'')+'</b><small style="background:#f3f4f6;padding:2px 6px;border-radius:4px;color:#6b7280">'+(w.partOfSpeech||'')+'</small></div><div style="margin-top:6px;color:#374151;font-size:14px">'+(w.english||'')+'</div>'+(w.example?'<div style="margin-top:8px;font-size:12px;color:#6b7280;font-style:italic">Ex: '+(w.example||'')+'</div>':'')+(w.exampleEnglish?'<div style="font-size:12px;color:#6b7280">'+(w.exampleEnglish||'')+'</div>':'')+'</div>'; } document.getElementById('list').innerHTML=html||'<p style="text-align:center;color:#6b7280;padding:20px">No entries found. Try a different search term.</p>'; }
checkAdminUI(); loadWorld();
<\/script></body></html>`, {headers:{"content-type":"text/html"}});
  }
}
