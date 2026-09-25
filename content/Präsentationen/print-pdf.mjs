#!/usr/bin/env node
// Renders a built reveal-md deck (_site/<slug>/index.html) to two PDFs using
// reveal.js's own print-pdf mode, driven by Puppeteer instead of reveal-md's
// --print CLI (which can't add the showNotes query param we need for the
// "mit Notizen" variant). Output lands next to the deck folder in _site/,
// so it's picked up by the workflow's existing publish-copy step.
import puppeteer from "puppeteer"
import path from "node:path"
import { pathToFileURL } from "node:url"

const slug = process.argv[2]
if (!slug) {
  console.error("Usage: node print-pdf.mjs <slug>")
  process.exit(1)
}

const htmlPath = path.resolve("_site", slug, "index.html")
const fileUrl = pathToFileURL(htmlPath).href

const variants = [
  { suffix: "", query: "" },
  { suffix: "-mit-notizen", query: "&showNotes=true" },
]

const browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] })
try {
  for (const { suffix, query } of variants) {
    const outPath = path.resolve("_site", `${slug}${suffix}.pdf`)
    const page = await browser.newPage()
    await page.goto(`${fileUrl}?print-pdf${query}`, { waitUntil: "networkidle0" })
    await page.pdf({ path: outPath, printBackground: true, width: 960, height: 700 })
    await page.close()
    console.log(`Geschrieben: _site/${slug}${suffix}.pdf`)
  }
} finally {
  await browser.close()
}
