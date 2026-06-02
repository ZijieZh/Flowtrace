// Screenshots both WeChat 自动续费 review pages to ~/Downloads.
// Run: node scripts/screenshot-wechat-preview.mjs
// Requires the dev server (next dev) running on http://localhost:3000.

import { chromium } from "playwright";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";

const BASE = process.env.PREVIEW_BASE ?? "http://localhost:3000";
const OUT_DIR = path.join(os.homedir(), "Downloads");
const STAMP = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

const targets = [
  {
    name: "wechat-cancel-path",
    url: `${BASE}/zh-CN/preview/wechat-cancel`,
    waitFor: "text=取消自动续费",
    viewport: { width: 760, height: 980 },
  },
  {
    name: "wechat-rules",
    url: `${BASE}/zh-CN/preview/wechat-rules`,
    waitFor: "text=自动续费规则说明",
    viewport: { width: 1200, height: 1000 },
  },
  {
    // Captures the rules page with the in-app preview modal open —
    // shows reviewers exactly how a user reaches the cancel UI.
    name: "wechat-rules-with-preview-modal",
    url: `${BASE}/zh-CN/preview/wechat-rules`,
    waitFor: "text=自动续费规则说明",
    viewport: { width: 1200, height: 1100 },
    afterLoad: async (page) => {
      await page.click("text=查看订阅管理界面预览");
      await page.waitForSelector("text=这是界面预览");
      await page.waitForTimeout(300);
    },
  },
];

async function shoot() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  try {
    for (const t of targets) {
      const ctx = await browser.newContext({
        viewport: t.viewport,
        deviceScaleFactor: 2,
        locale: "zh-CN",
      });
      const page = await ctx.newPage();
      console.log(`→ ${t.url}`);
      await page.goto(t.url, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForSelector(t.waitFor, { timeout: 10000 });
      await page.waitForTimeout(400); // settle fonts/animations
      if (t.afterLoad) await t.afterLoad(page);

      const out = path.join(OUT_DIR, `${t.name}-${STAMP}.png`);
      await page.screenshot({ path: out, fullPage: true });
      console.log(`✓ ${out}`);
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
}

shoot().catch((err) => {
  console.error("✗ Screenshot failed:", err);
  process.exit(1);
});
