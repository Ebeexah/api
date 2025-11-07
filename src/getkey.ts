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

    // Load trang, Puppeteer tự xử lý redirect
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });

    // Kiểm tra key hết hạn (expired)
    const isExpired = await page.$eval('main h2', el => el.textContent?.includes('Error')).catch(() => false);
    if (isExpired) {
      const msg = await page.$eval('main .alert', el => el.textContent?.trim() || 'Link đã hết hạn').catch(() => 'Link đã hết hạn');
      return res.status(410).json({ error: msg });
    }

    // Lấy nội dung key
    const key = await page.$eval('#keyText', el => el.textContent?.trim() || '').catch(() => '');
    if (!key) {
      return res.status(404).json({ error: 'Key không tìm thấy trên trang' });
    }

    return res.status(200).json({ key });

  } catch (err) {
    console.error('Error in getkey.ts:', err);
    return res.status(500).json({ error: 'Failed to get key', detail: (err as Error).message });
  } finally {
    if (browser) {
      try { await browser.close(); } catch {}
    }
  }
}
