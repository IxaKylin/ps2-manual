<script setup>
import { computed } from 'vue'
import { STATUS } from './util.mjs'
const props = defineProps({ s: { type: String, default: '' } })
const info = computed(() => STATUS[props.s] || { text: props.s || '—', title: '' })
</script>

<template>
  <span v-if="s" class="ps2-status" :class="'ps2-status-' + s" :title="info.title">{{ info.text }}</span>
</template>
