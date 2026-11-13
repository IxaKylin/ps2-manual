// Shared helpers for the register components.

export const STATUS = {
  verified: { text: '已验证', title: 'QEMU 已实现，并经 qtest 或真实 BIOS/Linux 运行验证' },
  reference: { text: '参考', title: '依据 PCSX2、ps2tek 等公开资料，或 QEMU 已实现但没有测试覆盖' },
  unimplemented: { text: '未实现', title: 'QEMU 未模拟，内容来自公开资料' }
}

export function hex(v, digits = 8) {
  if (v === undefined || v === null || v === '') return '—'
  if (typeof v === 'string') return v
  return '0x' + v.toString(16).toUpperCase().padStart(digits, '0')
}

// "7:4" -> [7, 4]; "3" -> [3, 3]
export function bitRange(bits) {
  const s = String(bits)
  const m = s.split(':').map((x) => parseInt(x, 10))
  return m.length === 2 ? [Math.max(m[0], m[1]), Math.min(m[0], m[1])] : [m[0], m[0]]
}

export function bitsText(bits) {
  const [hi, lo] = bitRange(bits)
  return hi === lo ? `${hi}` : `${hi}:${lo}`
}

export function addrText(r) {
  if (r.addr !== undefined) return hex(r.addr)
  if (r.offset !== undefined) return '+' + hex(r.offset, 3)
  return '—'
}

// Same rule as the VitePress heading slugify, so "### I_STAT" -> "i-stat".
export function slug(str) {
  return String(str)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u0000-\u001f]/g, '')
    .replace(/[\s~`!@#$%^&*()\-_+=[\]{}|\\;:"'“”‘’<>,.?/]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/^(\d)/, '_$1')
    .toLowerCase()
}

export function regKey(block, name) {
  return `${block}-${name}`.toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
}
