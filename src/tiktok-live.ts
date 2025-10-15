export default async function handler(req, res) {
  const user = (req.query.user || "").replace("@", "");
  if (!user) return res.status(400).json({ error: "Missing user" });

  const token = process.env.BL_TOKEN;
  if (!token) return res.status(500).json({ error: "Missing BL_TOKEN" });

  const endpoint = "https://production-sfo.browserless.io/chromium/bql";
  const targetUrl = `https://www.tiktok.com/@${user}`;
  const start = Date.now();

  try {
    const query = `
      query CheckLive($url: String!) {
        goto(url: $url, waitUntil: networkidle2) { status }
        content
      }
    `;

    const response = await fetch(`${endpoint}?token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { url: targetUrl } }),
    });

    const data = await response.json();
    const html = data?.data?.content || "";
    const isLive = html.includes(">LIVE<") || html.includes("LIVE</span>");
    const elapsed = ((Date.now() - start) / 1000).toFixed(2);

    res.json({
      user,
      is_live: isLive,
      html_checked: isLive ? "LIVE badge found" : "Not found",
      checked_in: `${elapsed}s`,
      checked_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({
      error: "BrowserQL request failed",
      details: err.message,
    });
  }
}
