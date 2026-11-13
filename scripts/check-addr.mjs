#!/usr/bin/env node
// Cross-check the register data against the QEMU source tree.
//
// For every block whose registers are `verified`:
//  - the files in `qemu.files` must exist;
//  - the block base and every verified register's address must appear as a hex
//    literal in one of those files or the board files; a register without that
//    literal passes only if its non-zero offset appears on a #define, case,
//    REGnn() or FIELD() line of those files;
//    a register can opt out with `check: "<reason>"`.
// Every register must have a source (its own or the block's).
// Also checks bit fields: inside the register width and not overlapping.
import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'

const ROOT = path.resolve(import.meta.dirname, '..')
const QEMU = process.env.QEMU_SRC || path.resolve(ROOT, '../qemu')
const dir = path.join(ROOT, 'docs/data/registers')
const BOARD = ['hw/mips/ps2.c', 'hw/mips/ps2_ee.c', 'hw/mips/ps2_iop.c', 'include/hw/mips/ps2.h']

let errors = 0
let checked = 0
const err = (m) => { errors++; console.log('ERROR ' + m) }

function hexRe(v) {
  const h = v.toString(16).replace(/^0+(?=.)/, '')
  return new RegExp(`(?<![0-9a-z_])0x0*${h}(?![0-9a-f])`, 'i')
}
function bitRange(bits) {
  const m = String(bits).split(':').map((x) => parseInt(x, 10))
  return m.length === 2 ? [Math.max(...m), Math.min(...m)] : [m[0], m[0]]
}

const qemuOk = fs.existsSync(path.join(QEMU, 'hw/mips/ps2.c'))
if (!qemuOk) console.log(`WARN QEMU source not found at ${QEMU}; address checks skipped`)
const boardText = qemuOk
  ? BOARD.filter((f) => fs.existsSync(path.join(QEMU, f)))
      .map((f) => fs.readFileSync(path.join(QEMU, f), 'utf8')).join('\n')
  : ''

for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.yaml')).sort()) {
  const b = yaml.load(fs.readFileSync(path.join(dir, f), 'utf8'))
  const where = (r) => `${f}:${b.block}${r ? '/' + r.name : ''}`
  if (!b.block || !b.title || !b.status || !Array.isArray(b.registers)) {
    err(`${f}: block, title, status and registers are required`)
    continue
  }
  const anyVerified = b.status === 'verified' || b.registers.some((r) => r.status === 'verified')
  let text = ''
  if (anyVerified && qemuOk) {
    const files = (b.qemu && b.qemu.files) || []
    if (!files.length) err(`${where()}: verified registers need qemu.files`)
    for (const q of files) {
      const p = path.join(QEMU, q)
      if (!fs.existsSync(p)) err(`${where()}: missing QEMU file ${q}`)
      else text += fs.readFileSync(p, 'utf8') + '\n'
    }
    if (b.base !== undefined && !b.qemu?.skip_base && !hexRe(b.base).test(text + boardText))
      err(`${where()}: base 0x${b.base.toString(16)} not found in QEMU source`)
  }
  const defLines = text.split('\n').filter((l) => /#define|\bcase\b|REG(8|16|32|64)\(|FIELD\(/.test(l))
  for (const r of b.registers) {
    if (!r.name) { err(`${f}: register without name`); continue }
    if (!(r.source && r.source.length) && !(b.source && b.source.length))
      err(`${where(r)}: no source`)
    const width = r.width || b.width || 32
    const used = new Map()
    for (const fl of r.fields || []) {
      const [hi, lo] = bitRange(fl.bits)
      if (!(hi >= lo && lo >= 0 && hi < width)) err(`${where(r)}: field ${fl.name} bits ${fl.bits} outside ${width}`)
      for (let i = lo; i <= hi; i++) {
        if (used.has(i)) err(`${where(r)}: bit ${i} in ${used.get(i)} and ${fl.name}`)
        used.set(i, fl.name)
      }
    }
    const st = r.status || b.status
    if (st !== 'verified' || !qemuOk || r.check) continue
    checked++
    const hasAddr = typeof r.addr === 'number'
    const hasOff = typeof r.offset === 'number' && r.offset !== 0
    if (!hasAddr && !hasOff) continue
    if (hasAddr && hexRe(r.addr).test(text + boardText)) continue
    if (hasOff && defLines.some((l) => hexRe(r.offset).test(l))) continue
    err(`${where(r)}: address/offset not found in ${(b.qemu?.files || []).join(', ')}`)
  }
}
console.log(`check-addr: ${checked} verified registers checked, ${errors} error(s)`)
process.exit(errors ? 1 : 0)
