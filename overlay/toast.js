import { h } from './dom.js'

let root = null
let el = null
let timer = 0

export function initToast(container) {
  root = container
}

export function toast(text) {
  if (!root) return console.info('[fairy-polish]', text)
  el?.remove()
  el = h('div', { class: 'fp-toast' }, text)
  root.append(el)
  clearTimeout(timer)
  timer = setTimeout(() => el?.remove(), 3200)
}
