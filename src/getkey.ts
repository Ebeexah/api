import type { VercelRequest, VercelResponse } from '@vercel/node';
import chromium from 'chrome-aws-lambda';
import puppeteer from 'puppeteer-core';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing URL parameter' });
  }

  let browser: puppeteer.Browser | null = null;

  try {
    const execPath = await chromium.executablePath || undefined;
    console.log('Chromium executable path:', execPath || 'using default puppeteer');

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: execPath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    // Giảm timeout, load nhanh trang đơn giản
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 8000 });

    // Lấy nội dung #keyText
    const key = await page.$eval('#keyText', el => el.textContent?.trim() || '');

    if (!key) {
      return res.status(404).json({ error: 'Key not found in page' });
    }

    res.status(200).json({ key });

  } catch (err) {
    console.error('Error in getkey.ts:', err);
    res.status(500).json({ error: 'Failed to get key', detail: (err as Error).message });
  } finally {
    if (browser) {
      try { await browser.close(); } catch {}
    }
  }
}
