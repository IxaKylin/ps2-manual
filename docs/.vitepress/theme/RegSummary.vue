<script setup>
// Register summary table of one block.
import { computed } from 'vue'
import { data } from './registers.data.mjs'
import Status from './Status.vue'
import { hex, addrText, slug } from './util.mjs'

const props = defineProps({ block: { type: String, required: true } })
const blk = computed(() => data[props.block])
const width = (r) => r.width || (blk.value && blk.value.width) || 32
const anchor = (name) => '#' + slug(name)
</script>

<template>
  <div v-if="!blk" class="ps2-error">缺少寄存器块：{{ block }}</div>
  <div v-else class="ps2-summary">
    <p v-if="blk.base !== undefined" class="ps2-summary-meta">
      基地址 <code>{{ hex(blk.base) }}</code>
      <span v-if="blk.size">，窗口大小 <code>{{ hex(blk.size, 1) }}</code></span>
      <span v-if="blk.bus">，{{ blk.bus }}</span>
      <span v-if="blk.access_size">，访问宽度 {{ blk.access_size }}</span>
    </p>
    <table>
      <thead>
        <tr><th>名称</th><th>地址</th><th>位宽</th><th>属性</th><th>复位值</th><th>状态</th><th>功能</th></tr>
      </thead>
      <tbody>
        <tr v-for="r in blk.registers" :key="r.name">
          <td><a v-if="!r.nodetail" :href="anchor(r.name)"><code>{{ r.name }}</code></a><code v-else>{{ r.name }}</code></td>
          <td><code>{{ addrText(r) }}</code></td>
          <td>{{ width(r) }}</td>
          <td>{{ r.access || '—' }}</td>
          <td><code>{{ r.reset === undefined ? '—' : hex(r.reset, Math.max(1, width(r) / 4)) }}</code></td>
          <td><Status :s="r.status || blk.status" /></td>
          <td>{{ r.brief || r.desc }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
