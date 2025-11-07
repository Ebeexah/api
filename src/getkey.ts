import chromium from "chrome-aws-lambda"; // tối ưu cho serverless
import puppeteer from "puppeteer-core";

export default async function handler(req, res) {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "Missing URL" });

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: true,
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2" });

    // Lấy nội dung key
    const key = await page.$eval("#keyText", el => el.textContent.trim());

    await browser.close();

    res.status(200).json({ key });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get key" });
  }
}
