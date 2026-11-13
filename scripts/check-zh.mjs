#!/usr/bin/env node
// Check the Chinese text: no traditional characters, and the glossary terms
// are used instead of their Taiwan/Hong Kong or colloquial variants.
import fs from 'node:fs'
import path from 'node:path'
import * as OpenCC from 'opencc-js'

const ROOT = path.resolve(import.meta.dirname, '..')
const DOCS = path.join(ROOT, 'docs')

// Variant -> term used in this manual.
const TERMS = {
  '暂存器': '寄存器',
  '记忆体': '内存/存储器',
  '内存体': '存储器',
  '位元': '位',
  '字元': '字符',
  '介面': '接口',
  '程式': '程序',
  '软体': '软件',
  '硬体': '硬件',
  '韧体': '固件',
  '档案': '文件',
  '预设': '默认',
  '讯号': '信号',
  '资料流': '数据流',
  '指令集架构': '指令集体系结构',
  '快取': '缓存',
  '中断向量表': '异常向量',
  '汇流排': '总线',
  '记忆卡': '存储卡',
  '光碟': '光盘',
  '影像': '图像',
  '执行绪': '线程',
  '执行緒': '线程',
  '演算法': '算法',
  '支援': '支持',
  '存取': '访问',
  '回传': '返回',
  '物件': '对象',
  '暂存记忆体': '暂存存储器'
}

const t2s = OpenCC.Converter({ from: 'hk', to: 'cn' })
const tw2s = OpenCC.Converter({ from: 'tw', to: 'cn' })

function walk(d, out = []) {
  for (const n of fs.readdirSync(d)) {
    if (n === 'node_modules' || n === 'dist' || n === 'cache' || n === 'public') continue
    const p = path.join(d, n)
    if (fs.statSync(p).isDirectory()) walk(p, out)
    else if (/\.(md|ya?ml|vue)$/.test(n) || n.endsWith('.mts')) out.push(p)
  }
  return out
}

// Text in code spans, fenced code and URLs is not checked.
function strip(s) {
  return s
    .replace(/`[^`\n]*`/g, '')
    .replace(/https?:\/\/\S+/g, '')
}

let errors = 0
for (const f of [...walk(DOCS), ...fs.readdirSync(path.join(ROOT, 'docs/public/img'))
  .filter((n) => n.endsWith('.svg')).map((n) => path.join(ROOT, 'docs/public/img', n))]) {
  const rel = path.relative(ROOT, f)
  // Blank out fenced code first, keeping line numbers.
  const lines = fs.readFileSync(f, 'utf8')
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/[^\n]/g, ''))
    .split('\n')
  lines.forEach((line, i) => {
    const s = strip(line)
    if (!/[一-鿿]/.test(s)) return
    for (const conv of [t2s, tw2s]) {
      const c = conv(s)
      if (c !== s) {
        const diff = [...s].map((ch, k) => (ch !== [...c][k] ? `${ch}→${[...c][k]}` : null)).filter(Boolean)
        if (diff.length) {
          console.log(`ERROR ${rel}:${i + 1}: traditional characters ${[...new Set(diff)].join(' ')}`)
          errors++
          return
        }
      }
    }
    for (const [bad, good] of Object.entries(TERMS)) {
      if (s.includes(bad)) {
        console.log(`ERROR ${rel}:${i + 1}: "${bad}" should be "${good}"`)
        errors++
      }
    }
  })
}
console.log(`check-zh: ${errors} error(s)`)
process.exit(errors ? 1 : 0)
