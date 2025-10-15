import fetch from "node-fetch";

export async function fetchTikTokLiveStatus(username) {
  const url = `https://www.tiktok.com/@${username}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
      "Referer": "https://www.tiktok.com/",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!res.ok) throw new Error(`TikTok fetch failed (${res.status})`);
  const html = await res.text();

  // ✅ Dấu hiệu mới: phần tử chứa LIVE badge
  const isLive = html.includes('SpanLiveBadge') || html.includes('>LIVE<');

  // cố gắng lấy title và cover từ meta
  const titleMatch = html.match(/<title>(.*?)<\/title>/);
  const coverMatch = html.match(/property="og:image" content="(.*?)"/);

  return {
    user: username,
    is_live: !!isLive,
    title: titleMatch ? titleMatch[1].replace(/\\u0026/g, "&") : null,
    cover: coverMatch ? coverMatch[1].replace(/\\u0026/g, "&") : null,
    url: `https://www.tiktok.com/@${username}/live`,
    checked_at: new Date().toISOString(),
  };
}
