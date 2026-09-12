// Larry Njo Digital Lāmnso' Dictionary - v7.0 Media Edition
// Bamdzeng-Nso | 1201 words | Premium 674061572

const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/Lamnsolarrynjo/lamnso-dictionary/main";
const PREMIUM_NUMBERS = ["674061572", "237674061572"];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    try {
      // Check Access - Sub verification
      if (path.includes("check-access")) {
        let phone = url.searchParams.get("phone") || "";
        if (!phone && request.method === "POST") {
          try { const b = await request.json(); phone = b.phone || ""; } catch(e) {}
        }
        const clean = phone.replace(/[^0-9]/g,"").slice(-9);
        const isPremium = clean === "674061572";
        return new Response(JSON.stringify({
          hasAccess: isPremium, isPremium, days: isPremium? 7 : 0,
          message: isPremium? "Premium 7 days | 1201 words" : "Not subscribed. Contact 674061572",
          words: isPremium? 1201 : 100
        }), { headers: {...cors, "Content-Type": "application/json"} });
      }

      // Upload image/audio to R2 (fallback to base64 if no R2)
      if (path.includes("upload-image") || path.includes("upload-audio")) {
        if (!env.MEDIA_BUCKET) {
          return new Response(JSON.stringify({useBase64:true}),
            { headers: {...cors, "Content-Type":"application/json"} });
        }
        const fd = await request.formData();
        const file = fd.get("image") || fd.get("audio");
        const key = `${path.includes("image")?"images":"audio"}/${Date.now()}-${file.name}`;
        await env.MEDIA_BUCKET.put(key, file.stream());
        return new Response(JSON.stringify({success:true, url:`https://${url.hostname}/media/${key}`}),
          { headers: {...cors, "Content-Type":"application/json"} });
      }

      // Serve media from R2
      if (path.startsWith("/media/")) {
        const obj = await env.MEDIA_BUCKET.get(path.replace("/media/",""));
        if (!obj) return new Response("Not found", {status:404, headers:cors});
        const h = new Headers(cors); obj.writeHttpMetadata(h);
        return new Response(obj.body, {headers:h});
      }

      // Serve lamnso.json
      if (path.endsWith("lamnso.json")) {
        const r = await fetch(`${GITHUB_RAW_BASE}/lamnso.json`);
        return new Response(await r.text(), {headers:{...cors,"Content-Type":"application/json"}});
      }

      // Serve index.html by default
      const r = await fetch(`${GITHUB_RAW_BASE}/index.html`);
      return new Response(await r.text(), {headers:{...cors,"Content-Type":"text/html"}});

    } catch(e) {
      return new Response(JSON.stringify({error:e.message}), {status:500, headers:cors});
    }
  }
}
