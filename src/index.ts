import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import fsp from "fs/promises";
import axios from "axios";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import { randomUUID } from "crypto";

ffmpeg.setFfmpegPath(ffmpegPath!);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const TMP_DIR = "/tmp";
const CACHE: Record<string, { path: string; expire: number }> = {};
const MAX_MB = 100;
const MAX_FILE = MAX_MB * 1024 * 1024;

// Serve static files (CSS, images)
app.use(express.static(path.join(__dirname, "public")));

// 🧹 Cleanup tmp dir on start
try {
  fs.readdirSync(TMP_DIR).forEach(f => fs.unlinkSync(path.join(TMP_DIR, f)));
  console.log("[Init] /tmp cleaned");
} catch {}

// Auto cleanup every 10s
setInterval(() => {
  const now = Date.now();
  for (const id in CACHE) {
    if (CACHE[id].expire < now) {
      fs.unlink(CACHE[id].path, () => {});
      delete CACHE[id];
    }
  }
}, 10_000);

// ------------------- Token safe -------------------
async function getToken(): Promise<string> {
  if (process.env.TIKWM_TOKEN) return process.env.TIKWM_TOKEN;

  try {
    const raw = await fsp.readFile(path.join(process.cwd(), "src", "token.json"), "utf-8");
    const data = JSON.parse(raw);
    if (!data.tikwm) throw new Error("TikWM token not found in token.json");
    return data.tikwm;
  } catch (err) {
    console.error("[Token Error]", err);
    return "";
  }
}

// ------------------- Helpers -------------------
async function downloadFile(url: string, outPath: string) {
  const res = await axios.get(url, { responseType: "stream" });
  const writer = fs.createWriteStream(outPath);
  return new Promise<void>((resolve, reject) => {
    res.data.pipe(writer);
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

async function extractAudio(input: string, output: string, kbps: number) {
  return new Promise<void>((resolve, reject) => {
    ffmpeg(input)
      .noVideo()
      .audioCodec("libmp3lame")
      .audioBitrate(`${kbps}k`)
      .on("end", resolve)
      .on("error", reject)
      .save(output);
  });
}

// ------------------- TikTok API -------------------
app.get("/api/tiktok", async (req, res) => {
  const { url, type = "video", quality = "720p", kbps = "192", json = "true" } =
    req.query as Record<string, string>;
  if (!url) return res.status(400).json({ error: "Missing TikTok URL." });

  try {
    const token = await getToken();
    if (!token) return res.status(500).json({ error: "TikWM token missing" });

    const api = await axios.get("https://www.tikwm.com/api/", {
      params: { url },
      headers: { Authorization: `Bearer ${token}` },
    });

    const info = api.data?.data;
    if (!info) throw new Error("Failed to fetch TikTok info.");

    const title = info.title || "tiktok";
    const safe = title.replace(/[^\w\d]+/g, "_").slice(0, 40);
    const id = randomUUID();
    const base = path.join(TMP_DIR, `${safe}_${id}`);

    let outPath = "";

    if (type === "video") {
      const videoUrl =
        quality === "480p" ? info.play || info.download_addr : info.play || info.hdplay || info.download_addr;
      outPath = `${base}.mp4`;
      await downloadFile(videoUrl, outPath);
    } else if (type === "audio") {
      const videoUrl = info.play || info.download_addr;
      const videoPath = `${base}.mp4`;
      outPath = `${base}.mp3`;
      await downloadFile(videoUrl, videoPath);
      await extractAudio(videoPath, outPath, parseInt(kbps));
      fs.unlink(videoPath, () => {});
    } else if (type === "image") {
      const imgs = info.images || [];
      if (imgs.length === 0) throw new Error("No images found.");
      outPath = `${base}.zip`;
      const AdmZip = (await import("adm-zip")).default;
      const zip = new AdmZip();
      for (let i = 0; i < imgs.length; i++) {
        const imgResp = await axios.get(imgs[i], { responseType: "arraybuffer" });
        zip.addFile(`img_${i + 1}.jpg`, Buffer.from(imgResp.data));
      }
      zip.writeZip(outPath);
    }

    const stat = fs.statSync(outPath);
    if (stat.size > MAX_FILE) {
      fs.unlink(outPath, () => {});
      return res.status(413).json({ error: `File too large (${(stat.size / 1024 / 1024).toFixed(1)} MB)` });
    }

    CACHE[id] = { path: outPath, expire: Date.now() + 300_000 }; // 5 phút

    const fileUrl = `/api/tmp/${id}`;

    if (json === "true") {
      return res.json({
        success: true,
        type,
        title,
        author: info.author?.unique_id || "unknown",
        duration: info.duration || 0,
        cover: info.cover,
        images: info.images || [],
        size: `${(stat.size / 1024 / 1024).toFixed(2)} MB`,
        download: fileUrl,
        expires: "300s",
      });
    } else {
      return res.redirect(fileUrl);
    }
  } catch (err: any) {
    console.error("[TikTok API Error]", err.message);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  }
});

// ------------------- Temp download endpoint -------------------
app.get("/api/tmp/:id", (req, res) => {
  const id = req.params.id;
  const entry = CACHE[id];
  if (!entry) return res.status(404).json({ error: "File expired or not found." });
  res.download(entry.path, (err) => {
    if (!err) {
      fs.unlink(entry.path, () => {});
      delete CACHE[id];
    }
  });
});

// ------------------- HTML Home -------------------
app.get("/", (req, res) => {
  res.type("html").send(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <title>TikTok Downloader</title>
        <link rel="stylesheet" href="/style.css" />
      </head>
      <body>
        <header>
          <h1>TikTok Downloader 🚀</h1>
        </header>
        <main>
          <form id="tiktokForm">
            <input type="text" id="tiktokUrl" placeholder="Paste TikTok link..." required/>
            <select id="typeSelect">
              <option value="video">Video</option>
              <option value="audio">Audio (MP3)</option>
              <option value="image">Images (ZIP)</option>
            </select>
            <button type="submit">Download</button>
          </form>
          <div id="result"></div>
        </main>
        <script>
          const form = document.getElementById('tiktokForm');
          form.addEventListener('submit', async e => {
            e.preventDefault();
            const url = document.getElementById('tiktokUrl').value;
            const type = document.getElementById('typeSelect').value;
            const res = await fetch(\`/api/tiktok?url=\${encodeURIComponent(url)}&type=\${type}\`);
            const data = await res.json();
            if(data.success){
              document.getElementById('result').innerHTML = \`
                <p>Title: \${data.title}</p>
                <p>Author: \${data.author}</p>
                <p>Size: \${data.size}</p>
                <a href="\${data.download}">Download Here</a>
              \`;
            }else{
              document.getElementById('result').innerText = data.error || 'Failed';
            }
          });
        </script>
      </body>
    </html>
  `);
});

export default app;
