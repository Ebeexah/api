export default async function handler(req, res) {
  const user = (req.query.user || "").replace("@", "");
  if (!user) return res.status(400).json({ error: "Missing user" });

  const start = Date.now();
  const renderURL = `https://r.jina.ai/https://www.tiktok.com/@${user}`;

  try {
    // Jina AI sẽ fetch HTML đã render
    const html = await fetch(renderURL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
      },
    }).then((r) => r.text());

    const hasLive = html.includes(">LIVE<") || html.includes("LIVE</span>");

    const elapsed = ((Date.now() - start) / 1000).toFixed(2);
    res.json({
      user,
      is_live: hasLive,
      html_checked: hasLive ? "LIVE badge found" : "Not found",
      checked_in: `${elapsed}s`,
      checked_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: "Fetch failed", details: err.message });
  }
}
