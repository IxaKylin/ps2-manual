<script setup>
// One register: summary line, bit-field diagram, field table, operations, sources.
import { computed } from 'vue'
import { data } from './registers.data.mjs'
import BitField from './BitField.vue'
import Status from './Status.vue'
import { hex, bitsText, addrText } from './util.mjs'

const props = defineProps({
  block: { type: String, required: true },
  name: { type: String, required: true }
})

const blk = computed(() => data[props.block])
const reg = computed(() => {
  const b = blk.value
  if (!b) return null
  return (b.registers || []).find((r) => r.name === props.name) || null
})
const status = computed(() => (reg.value && reg.value.status) || (blk.value && blk.value.status))
const width = computed(() => (reg.value && reg.value.width) || (blk.value && blk.value.width) || 32)
const fields = computed(() => {
  const f = (reg.value && reg.value.fields) || []
  return [...f].sort((a, b) => parseInt(String(b.bits)) - parseInt(String(a.bits)))
})
function valueRows(v) {
  if (!v) return []
  return Object.entries(v).map(([k, d]) => ({ k, d }))
}
function resetText(v) {
  if (v === undefined || v === null) return '—'
  if (typeof v === 'number') return v > 9 ? hex(v, 1) : String(v)
  return String(v)
}
</script>

<template>
  <div v-if="!reg" class="ps2-error">缺少寄存器数据：{{ block }}/{{ name }}</div>
  <div v-else class="ps2-reg">
    <table class="ps2-reg-head">
      <tbody>
        <tr>
          <th>地址</th><td><code>{{ addrText(reg) }}</code></td>
          <th>位宽</th><td>{{ width }} 位</td>
          <th>属性</th><td>{{ reg.access || '—' }}</td>
          <th>复位值</th><td><code>{{ reg.reset === undefined ? '—' : hex(reg.reset, Math.max(1, width / 4)) }}</code></td>
          <th>状态</th><td><Status :s="status" /></td>
        </tr>
      </tbody>
    </table>
    <p v-if="reg.desc" class="ps2-reg-desc">{{ reg.desc }}</p>
    <BitField v-if="fields.length" :width="width" :fields="fields" />
    <table v-if="fields.length" class="ps2-fields">
      <thead>
        <tr><th>位</th><th>名称</th><th>属性</th><th>复位值</th><th>说明</th></tr>
      </thead>
      <tbody>
        <tr v-for="f in fields" :key="f.bits">
          <td><code>{{ bitsText(f.bits) }}</code></td>
          <td><code>{{ f.name }}</code></td>
          <td>{{ f.access || reg.access || '—' }}</td>
          <td>{{ resetText(f.reset) }}</td>
          <td>
            <span>{{ f.desc }}</span>
            <Status v-if="f.status && f.status !== status" :s="f.status" />
            <table v-if="f.values" class="ps2-values">
              <tbody>
                <tr v-for="v in valueRows(f.values)" :key="v.k">
                  <td><code>{{ v.k }}</code></td><td>{{ v.d }}</td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="reg.ops && reg.ops.length" class="ps2-ops">
      <div class="ps2-label">操作说明</div>
      <ol><li v-for="(o, i) in reg.ops" :key="i">{{ o }}</li></ol>
    </div>
    <div v-if="reg.notes && reg.notes.length" class="ps2-notes">
      <div class="ps2-label">注意</div>
      <ul><li v-for="(o, i) in reg.notes" :key="i">{{ o }}</li></ul>
    </div>
    <div v-if="reg.source && reg.source.length" class="ps2-src">
      来源：<span v-for="(s, i) in reg.source" :key="i"><code>{{ s }}</code><span v-if="i < reg.source.length - 1">；</span></span>
    </div>
  </div>
</template>
