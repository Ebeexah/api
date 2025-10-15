import fetch from "node-fetch";

export async function fetchTikTokLiveStatus(username) {
  const url = `https://www.tiktok.com/@${username}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        // bắt TikTok trả về layout desktop
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
      "Referer": "https://www.tiktok.com/",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!res.ok) throw new Error(`TikTok fetch failed (${res.status})`);
  const html = await res.text();

  // ✅ Chỉ cần phát hiện badge LIVE trong HTML desktop
  const isLive =
    /<span[^>]*class="[^"]*LiveBadge[^"]*"[^>]*>\s*LIVE\s*<\/span>/i.test(html) ||
    html.includes('>LIVE<');

  // Tìm thêm thông tin (không bắt buộc)
  const titleMatch = html.match(/"liveTitle":"(.*?)"/);
  const coverMatch = html.match(/"coverUrl":"(.*?)"/);

  return {
    user: username,
    is_live: isLive,
    title: titleMatch ? decodeURIComponent(titleMatch[1]) : null,
    cover: coverMatch ? coverMatch[1].replace(/\\u0026/g, "&") : null,
    url: `https://www.tiktok.com/@${username}/live`,
    checked_at: new Date().toISOString(),
  };
}
