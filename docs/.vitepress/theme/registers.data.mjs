// Loads every register block from docs/data/registers/*.yaml at build time.
import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'

const dir = path.resolve(__dirname, '../../data/registers')

export default {
  watch: ['../../data/registers/*.yaml'],
  load() {
    const blocks = {}
    for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.yaml')).sort()) {
      const b = yaml.load(fs.readFileSync(path.join(dir, f), 'utf8'))
      if (!b || !b.block) throw new Error(`${f}: missing block`)
      if (blocks[b.block]) throw new Error(`${f}: duplicate block ${b.block}`)
      b.file = f
      blocks[b.block] = b
    }
    return blocks
  }
}
