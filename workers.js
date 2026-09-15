// Larry Njo Lamnso Dictionary Worker - v7.0 - DICT KV for ALL phones
const GITHUB_RAW = "https://raw.githubusercontent.com/Lamnsolarrynjo/lamnso-dictionary/main/index.html";
const GITHUB_JSON = "https://raw.githubusercontent.com/Lamnsolarrynjo/lamnso-dictionary/main/lamnso.json";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // --- API: Get words from Cloudflare KV (works on ANY phone) ---
    if (url.pathname === "/api/words") {
      try {
        const countStr = await env.DICT.get("COUNT");
        if (countStr) {
          const list = await env.DICT.list();
          const words = [];
          for (const k of list.keys) {
            if (k.name === "COUNT") continue;
            const v = await env.DICT.get(k.name);
            if (v) try{words.push(JSON.parse(v))}catch{}
            if (words.length >= 1500) break;
          }
          return new Response(JSON.stringify({source:"KV", count: parseInt(countStr), words}), {
            headers: {"content-type":"application/json","Access-Control-Allow-Origin":"*","Cache-Control":"no-cache"}
          });
        }
      } catch(e) {}
      // Fallback: if KV empty, fetch lamnso.json from GitHub directly
      const r = await fetch(GITHUB_JSON, {cf:{cacheTtl:0}});
      const json = await r.text();
      return new Response(json, {headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}});
    }

    // --- API: Seed KV (call once from /admin) ---
    if (url.pathname === "/api/seed" && request.method === "POST") {
      try {
        const words = await request.json();
        let c = 0;
        for (const w of words) {
          const key = w.lamnso || w.word || w.Lamnso || `w-${c}`;
          if(!key) continue;
          await env.DICT.put(key, JSON.stringify(w));
          c++;
        }
        await env.DICT.put("COUNT", c.toString());
        return new Response(`SUCCESS! ${c} words saved to DICT forever! Now ALL phones will work!`, {headers:{"content-type":"text/plain"}});
      } catch(e) { return new Response("Seed error: "+e.message, {status:500}); }
    }

    // --- ADMIN: Push page ---
    if (url.pathname === "/admin") {
      return new Response(`
        <html><body style="font-family:sans-serif;padding:20px">
        <h2>Larry Njo - Push to Cloudflare</h2>
        <p>Tap to push lamnso.json to DICT KV so ALL phones work far from Bamenda.</p>
        <button id="btn" style="padding:15px;background:green;color:white;font-size:18px">PUSH 1,225 WORDS NOW</button>
        <pre id="log"></pre>
        <script>
          document.getElementById('btn').onclick=async()=>{
            document.getElementById('log').textContent='Loading lamnso.json from GitHub...';
            const r=await fetch('${GITHUB_JSON}');
            const words=await r.json();
            document.getElementById('log').textContent=words.length+' words loaded. Pushing to KV...';
            const res=await fetch('/api/seed',{method:'POST',body:JSON.stringify(words),headers:{'content-type':'application/json'}});
            const t=await res.text();
            document.getElementById('log').textContent=t;
          }
        </script>
        </body></html>
      `, {headers:{"content-type":"text/html"}});
    }

    // --- MAIN: Serve latest index.html (your existing v6.6 logic) ---
    try {
      const res = await fetch(GITHUB_RAW, {
        cf: { cacheTtl: 0, cacheEverything: false },
        headers: { "Cache-Control": "no-cache" }
      });
      if (!res.ok) throw new Error(`GitHub fetch failed: ${res.status}`);
      let html = await res.text();
      return new Response(html, {
        headers: {"content-type":"text/html","Cache-Control":"no-store, no-cache","Access-Control-Allow-Origin":"*"}
      });
    } catch(e) {
      return new Response("Error: "+e.message, {status:500});
    }
  }
}