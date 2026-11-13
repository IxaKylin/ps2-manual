import DefaultTheme from 'vitepress/theme'
import { onMounted, watch, nextTick } from 'vue'
import { useRoute } from 'vitepress'
import mediumZoom from 'medium-zoom'
import RegSummary from './RegSummary.vue'
import Reg from './Reg.vue'
import BitField from './BitField.vue'
import Status from './Status.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('RegSummary', RegSummary)
    app.component('Reg', Reg)
    app.component('BitField', BitField)
    app.component('Status', Status)
  },
  setup() {
    const route = useRoute()
    let zoom
    const attach = () => {
      zoom?.detach()
      zoom = mediumZoom('.vp-doc img', { background: 'rgba(0, 0, 0, 0.7)', margin: 24 })
    }
    onMounted(attach)
    watch(() => route.path, () => nextTick(attach))
  }
}
