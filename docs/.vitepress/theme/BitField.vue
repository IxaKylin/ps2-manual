<script setup>
// Bit-field diagram, 32 bits per row, most significant bit on the left.
import { computed } from 'vue'
import { bitRange } from './util.mjs'

const props = defineProps({
  width: { type: Number, default: 32 },
  fields: { type: Array, default: () => [] }
})

const CELL = 22
const ROW_H = 58
const LEFT = 4

const rows = computed(() => {
  const out = []
  const nrows = Math.max(1, Math.ceil(props.width / 32))
  for (let r = nrows - 1; r >= 0; r--) {
    const lo = r * 32
    const hi = Math.min(props.width, lo + 32) - 1
    const cells = []
    // Fill with reserved, then overlay the fields that touch this row.
    const owner = new Array(hi - lo + 1).fill(null)
    props.fields.forEach((f, i) => {
      const [fh, fl] = bitRange(f.bits)
      for (let b = Math.max(fl, lo); b <= Math.min(fh, hi); b++) owner[b - lo] = i
    })
    let b = hi
    while (b >= lo) {
      const o = owner[b - lo]
      let e = b
      while (e - 1 >= lo && owner[e - 1 - lo] === o) e--
      const f = o === null ? null : props.fields[o]
      cells.push({
        hi: b,
        lo: e,
        x: LEFT + (hi - b) * CELL,
        w: (b - e + 1) * CELL,
        name: f ? f.name : '',
        reserved: !f || /^(—|-|reserved|保留)$/i.test(f.name || '')
      })
      b = e - 1
    }
    out.push({ hi, lo, cells, bits: hi - lo + 1 })
  }
  return out
})

const svgW = computed(() => LEFT * 2 + Math.min(32, props.width) * CELL)
const svgH = computed(() => rows.value.length * ROW_H + 4)

function label(c) {
  const room = c.w / 7.5
  if (!c.name) return ''
  return c.name.length <= room ? c.name : c.name.slice(0, Math.max(1, Math.floor(room) - 1)) + '…'
}
</script>

<template>
  <svg class="ps2-bitfield" :viewBox="`0 0 ${svgW} ${svgH}`" :width="svgW" role="img"
       aria-label="位域图">
    <g v-for="(row, ri) in rows" :key="ri" :transform="`translate(0 ${ri * ROW_H})`">
      <text v-for="n in row.bits" :key="'n' + n" class="bf-num"
            :x="LEFT + (n - 1) * CELL + CELL / 2" y="12" text-anchor="middle">
        {{ row.hi - (n - 1) }}
      </text>
      <g v-for="(c, ci) in row.cells" :key="ci">
        <rect :x="c.x" y="16" :width="c.w" height="30"
              :class="c.reserved ? 'bf-res' : 'bf-cell'" />
        <text v-if="!c.reserved" class="bf-name" :x="c.x + c.w / 2" y="35"
              text-anchor="middle">{{ label(c) }}<title>{{ c.name }} [{{ c.hi === c.lo ? c.hi : c.hi + ':' + c.lo }}]</title></text>
      </g>
    </g>
  </svg>
</template>
