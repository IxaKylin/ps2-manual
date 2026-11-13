#!/usr/bin/env node
// Draw the memory-map figures from docs/data/memmap.yaml.
// Regions are drawn with equal height (not to scale), highest address on top.
import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'

const ROOT = path.resolve(import.meta.dirname, '..')
const maps = yaml.load(fs.readFileSync(path.join(ROOT, 'docs/data/memmap.yaml'), 'utf8'))
const outDir = path.join(ROOT, 'docs/public/img')

const COLORS = {
  ram: ['#fde7c8', '#c07a1a'],
  rom: ['#f6d6d6', '#b04848'],
  io: ['#dbe8f8', '#2f6fb2'],
  gfx: ['#e9defa', '#7a4bb3'],
  iop: ['#d9f0e2', '#2e8b57'],
  alias: ['#e8f5f0', '#3f8f7f'],
  unimp: ['#eeeeee', '#8a8f96'],
  gap: ['#ffffff', '#c8ccd3']
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const hex = (v) => '0x' + v.toString(16).toUpperCase().padStart(8, '0')

for (const m of maps) {
  const regs = [...m.regions].sort((a, b) => b.start - a.start)
  const H = 34
  const W = 820
  const X = 180
  const BW = 300
  const top = 56
  let y = top
  let body = ''
  for (const r of regs) {
    const end = r.start + r.size - 1
    const [fill, stroke] = COLORS[r.kind] || COLORS.io
    const h = r.kind === 'gap' ? 18 : H
    const dash = r.kind === 'unimp' || r.kind === 'gap' ? ' stroke-dasharray="4 3"' : ''
    body += `<rect x="${X}" y="${y}" width="${BW}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="1.2"${dash}/>`
    if (r.kind !== 'gap') {
      body += `<text x="${X + BW / 2}" y="${y + h / 2 + 5}" text-anchor="middle" class="n">${esc(r.name)}</text>`
      body += `<text x="${X - 10}" y="${y + 12}" text-anchor="end" class="a">${hex(end)}</text>`
      body += `<text x="${X - 10}" y="${y + h - 3}" text-anchor="end" class="a">${hex(r.start)}</text>`
      if (r.note) body += `<text x="${X + BW + 14}" y="${y + h / 2 + 5}" class="d">${esc(r.note)}</text>`
    } else {
      body += `<text x="${X + BW / 2}" y="${y + 13}" text-anchor="middle" class="g">⋯</text>`
    }
    y += h
  }
  const height = y + 50
  let legend = ''
  let lx = 20
  for (const k of m.legend || []) {
    const [fill, stroke] = COLORS[k.kind]
    legend += `<rect x="${lx}" y="${height - 32}" width="14" height="14" fill="${fill}" stroke="${stroke}"/>`
    legend += `<text x="${lx + 20}" y="${height - 20}" class="d">${esc(k.text)}</text>`
    lx += 30 + k.text.length * 13
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${height}" width="${W}" height="${height}" font-family="'Noto Sans SC','Microsoft YaHei','PingFang SC',sans-serif">
<style>.t{font-size:18px;font-weight:700;fill:#1d2733}.n{font-size:13px;fill:#1d2733}.a{font-size:11px;font-family:'DejaVu Sans Mono',Consolas,monospace;fill:#4a5260}.d{font-size:12px;fill:#4a5260}.g{font-size:14px;fill:#8a8f96}</style>
<rect width="100%" height="100%" fill="#ffffff"/>
<text x="20" y="32" class="t">${esc(m.title)}</text>
<text x="${W - 20}" y="32" text-anchor="end" class="d">示意图，区域高度不按比例</text>
${body}
${legend}
</svg>
`
  fs.writeFileSync(path.join(outDir, `memmap-${m.id}.svg`), svg)
  console.log(`gen-memmap: memmap-${m.id}.svg (${regs.length} regions)`)
}
