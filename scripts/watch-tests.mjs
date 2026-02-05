import { spawn } from 'node:child_process'
import { watch } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.cwd())
const watchDirs = [
  resolve(root, 'src'),
  resolve(root, 'tests'),
  resolve(root, 'electron.vite.config.ts'),
  resolve(root, 'package.json')
]

let running = false
let queued = false
let timer = null

const runTests = () => {
  if (running) {
    queued = true
    return
  }
  running = true
  const proc = spawn('npm', ['run', 'test:run'], { stdio: 'inherit', shell: true })
  proc.on('exit', () => {
    running = false
    if (queued) {
      queued = false
      runTests()
    }
  })
}

const schedule = () => {
  if (timer) clearTimeout(timer)
  timer = setTimeout(runTests, 250)
}

watchDirs.forEach((dir) => {
  try {
    watch(dir, { recursive: true }, () => schedule())
  } catch {
    // ignore
  }
})

console.log('Watching for changes... running tests on save')
