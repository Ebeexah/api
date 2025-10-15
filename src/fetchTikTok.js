import fetch from "node-fetch";

/**
 * Lấy trạng thái livestream TikTok chính xác (dựa trên room_id)
 * Hoạt động 100% server-side (chạy tốt trên Vercel)
 */
export async function fetchTikTokLiveStatus(username) {
  const url = `https://www.tiktok.com/@${username}`;
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
    "Referer": "https://www.tiktok.com/",
    "Accept-Language": "en-US,en;q=0.9",
  };

  // B1: lấy HTML profile
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`TikTok fetch failed (${res.status})`);
  const html = await res.text();

  // B2: tìm JSON chứa roomId trong <script id="SIGI_STATE">
  const jsonMatch = html.match(/<script id="SIGI_STATE"[^>]*>(.*?)<\/script>/);
  if (!jsonMatch) {
    return { user: username, is_live: false, title: null, cover: null };
  }

  let data;
  try {
    data = JSON.parse(jsonMatch[1]);
  } catch {
    return { user: username, is_live: false, title: null, cover: null };
  }

  // TikTok để roomId trong phần UserModule / LiveRoom
  const liveObj =
    data?.LiveRoom ||
    Object.values(data?.UserModule?.users || {})?.[0]?.roomId ||
    null;

  let roomId = null;

  if (typeof liveObj === "string") {
    roomId = liveObj;
  } else if (typeof liveObj === "object") {
    const key = Object.keys(liveObj)[0];
    roomId = liveObj[key]?.id_str || liveObj[key]?.roomId;
  }

  // Nếu không có roomId → chắc chắn chưa live
  if (!roomId) {
    return { user: username, is_live: false, title: null, cover: null };
  }

  // B3: gọi Webcast API TikTok để lấy thông tin livestream
  const api = `https://webcast.tiktok.com/webcast/room/info/?aid=1988&room_id=${roomId}`;
  const liveRes = await fetch(api, { headers });

  if (!liveRes.ok) {
    return { user: username, is_live: false, title: null, cover: null };
  }

  const info = await liveRes.json();
  const roomInfo = info?.data || info?.RoomInfo || null;

  const isLive = !!(roomInfo && roomInfo.status === 2); // 2 = đang live

  return {
    user: username,
    is_live: isLive,
    title: roomInfo?.title || null,
    cover: roomInfo?.cover?.url_list?.[0] || null,
    room_id: roomId,
    url: `https://www.tiktok.com/@${username}/live`,
    checked_at: new Date().toISOString(),
  };
}
