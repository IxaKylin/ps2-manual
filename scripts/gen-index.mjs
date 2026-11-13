#!/usr/bin/env node
// Generate appendix A (register address index) from docs/data/registers/*.yaml.
import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'
import { slug } from '../docs/.vitepress/theme/util.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const dir = path.join(ROOT, 'docs/data/registers')
const out = path.join(ROOT, 'docs/appendix/register-index.md')
const ST = { verified: '已验证', reference: '参考', unimplemented: '未实现' }

const hex = (v) => '0x' + v.toString(16).toUpperCase().padStart(8, '0')
const anchor = slug

const withAddr = []
const noAddr = []
for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.yaml')).sort()) {
  const b = yaml.load(fs.readFileSync(path.join(dir, f), 'utf8'))
  for (const r of b.registers || []) {
    const link = b.page && !r.nodetail ? `[${r.name}](${b.page}#${anchor(r.name)})` : r.name
    const row = { b, r, link, st: ST[r.status || b.status] || '' }
    if (typeof r.addr === 'number') withAddr.push(row)
    else noAddr.push(row)
  }
}
withAddr.sort((x, y) => x.r.addr - y.r.addr || x.r.name.localeCompare(y.r.name))

const esc = (s) => String(s || '').replace(/\|/g, '\\|').replace(/\n/g, ' ')
let md = `---
outline: false
---

# 附录 A 寄存器地址速查

<!-- 本页由 scripts/gen-index.mjs 根据 docs/data/registers/*.yaml 自动生成，请勿手工修改。 -->

本页汇总全书所有寄存器，共 ${withAddr.length + noAddr.length} 个。地址列为物理地址：EE 侧为 EE 物理地址，IOP 侧为 IOP 物理地址（见第 2 章）。点击寄存器名可跳转到详细说明。

## 按地址排序

| 地址 | 寄存器 | 模块 | 位宽 | 属性 | 状态 | 功能 |
|---|---|---|---|---|---|---|
`
for (const { b, r, link, st } of withAddr) {
  md += `| \`${hex(r.addr)}\` | ${link} | ${esc(b.title)} | ${r.width || b.width || 32} | ${esc(r.access || '—')} | ${st} | ${esc(r.brief || r.desc)} |\n`
}
md += `
## 无总线地址的寄存器

此类寄存器经协处理器指令、GIF 数据包或命令访问，“编号”列为寄存器编号或偏移。

| 模块 | 寄存器 | 编号 | 位宽 | 属性 | 状态 | 功能 |
|---|---|---|---|---|---|---|
`
for (const { b, r, link, st } of noAddr) {
  const off = typeof r.offset === 'number' ? '`0x' + r.offset.toString(16).toUpperCase() + '`' : '—'
  md += `| ${esc(b.title)} | ${link} | ${off} | ${r.width || b.width || 32} | ${esc(r.access || '—')} | ${st} | ${esc(r.brief || r.desc)} |\n`
}
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, md)
console.log(`gen-index: ${withAddr.length} with address, ${noAddr.length} without`)
