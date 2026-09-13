// Larry Njo Lamnso Dictionary Worker - v6.6 - Forces fresh index.html - No cache
const GITHUB_RAW = "https://raw.githubusercontent.com/Lamnsolarrynjo/lamnso-dictionary/main/index.html";

export default {
  async fetch(request, env, ctx) {
    try {
      // Fetch latest index.html from GitHub - bypass all caches
      const res = await fetch(GITHUB_RAW, {
        cf: { cacheTtl: 0, cacheEverything: false },
        headers: { "Cache-Control": "no-cache" }
      });

      if (!res.ok) throw new Error(`GitHub fetch failed: ${res.status}`);

      let html = await res.text();

      return new Response(html, {
        headers: {
          "Content-Type": "text/html;charset=UTF-8",
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          "Pragma": "no-cache",
          "Expires": "0",
          "Access-Control-Allow-Origin": "*"
        }
      });
    } catch (e) {
      return new Response(`Worker Error: ${e.message}\n\nCheck: 1) GitHub repo name is lamnso-dictionary 2) index.html exists in main branch`, {
        status: 500,
        headers: { "Content-Type": "text/plain" }
      });
    }
  }
}
