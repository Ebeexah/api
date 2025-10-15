export default async function handler(req, res) {
  const user = (req.query.user || "").replace("@", "");
  if (!user) return res.status(400).json({ error: "Missing user" });

  const token = process.env.BL_TOKEN;
  if (!token) return res.status(500).json({ error: "Missing BL_TOKEN" });

  const endpoint = "https://production-sfo.browserless.io/chromium/bql";
  const targetUrl = `https://www.tiktok.com/@${user}`;
  const start = Date.now();

  try {
    // mở tab và load trang
    const open = await fetch(`${endpoint}?token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          mutation Open($url: String!) {
            goto(url: $url, waitUntil: networkidle2) { status }
          }`,
        variables: { url: targetUrl },
      }),
    });

    await open.json();

    let isLive = false;
    let htmlSnippet = "";
    let elapsed = 0;
    const timeout = 30000; // 30s tối đa

    while (elapsed < timeout && !isLive) {
      const resp = await fetch(`${endpoint}?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `
            query GetHTML { content } 
          `,
        }),
      });

      const data = await resp.json();
      const html = data?.data?.content || "";
      if (html.includes("SpanLiveBadge") || html.includes(">LIVE<")) {
        isLive = true;
        htmlSnippet = html.match(/.{0,100}LIVE.{0,100}/)?.[0] || "LIVE found";
        break;
      }
      await new Promise((r) => setTimeout(r, 2000)); // đợi 2s rồi quét lại
      elapsed = Date.now() - start;
    }

    const checkedIn = ((Date.now() - start) / 1000).toFixed(2);
    res.json({
      user,
      is_live: isLive,
      html_checked: isLive ? htmlSnippet : "Not found",
      checked_in: `${checkedIn}s`,
      checked_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({
      error: "Browserless request failed",
      details: err.message,
    });
  }
}
