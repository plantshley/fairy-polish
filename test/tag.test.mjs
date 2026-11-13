import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tagJsx } from '../server/tag.js'

const src = `function Page() {
  return (
    <>
      <Button label="Done" />
      <React.Fragment><Ui.Card>hi</Ui.Card></React.Fragment>
      <Ctx.Provider value={1}><motion.div /></Ctx.Provider>
      <Suspense><div /></Suspense>
    </>
  )
}`

test('component call sites get data-fp-use, host elements get data-fp-src', () => {
  const out = tagJsx(src, 'src/Page.jsx').code
  assert.match(out, /<Button data-fp-use="src\/Page.jsx:4:7" label="Done"/)
  assert.match(out, /<Ui\.Card data-fp-use="src\/Page.jsx:5:23">/)
  assert.match(out, /<div data-fp-src="src\/Page.jsx:7:17" data-fp-comp="Page"/)
})

test('built-ins, providers, and lowercase member tags are skipped', () => {
  const out = tagJsx(src, 'src/Page.jsx').code
  assert.doesNotMatch(out, /<React\.Fragment data-fp-use/)
  assert.doesNotMatch(out, /<Ctx\.Provider data-fp-use/)
  assert.doesNotMatch(out, /<motion\.div data-fp-use/)
  assert.doesNotMatch(out, /<Suspense data-fp-use/)
})

test('uses: false leaves components alone', () => {
  assert.doesNotMatch(tagJsx(src, 'src/Page.jsx', { uses: false }).code, /data-fp-use/)
})
