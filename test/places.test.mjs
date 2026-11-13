import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findPlaces } from '../server/places.js'

const files = [
  {
    file: 'src/main.jsx',
    text: `import App from './App.jsx'
import Kiosk from './kiosk/Kiosk.jsx'
<Routes>
  <Route element={<App />}>
    <Route path="kiosk" element={<Kiosk />} />
  </Route>
</Routes>`,
  },
  { file: 'src/App.jsx', text: `import Nav from './Nav.jsx'\nexport default function App() { return <Nav /> }` },
  {
    file: 'src/Nav.jsx',
    text: `import Tab from './Tab.jsx'
const tabs = [
  { label: 'Dashboard', path: '/' },
  // { label: 'Old', path: '/old' },
  { label: 'Producers', path: '/producers' },
]
function Menu({ label }) {
  return <Tab label={label} />
}
export default function Nav() {
  return (
    <nav>
      {tabs.map((tab) => (
        <Tab key={tab.path} label={tab.label} />
      ))}
      <Menu label="Reports" />
      <Menu label="Data" />
    </nav>
  )
}`,
  },
  { file: 'src/Tab.jsx', text: `export default function Tab({ label }) { return <a className="tab">{label}</a> }` },
  {
    file: 'src/kiosk/Kiosk.jsx',
    text: `function Welcome() {
  return <h1 className="kiosk-heading big">Register now</h1>
}
function Waiting({ free }) {
  return <h1 className={\`kiosk-heading\`}>{free ? 'Confirming registration' : 'Confirming payment'}</h1>
}
function Other() {
  return <h2 className="kiosk-heading-sub">Not this one</h2>
}`,
  },
]

test('component uses: list labels, passed-in labels, and the layout page', () => {
  const { uses } = findPlaces(files, { comp: 'Tab' })
  assert.equal(uses.length, 2)
  const menu = uses.find((u) => u.inside === 'Menu')
  const list = uses.find((u) => u.list)
  assert.deepEqual(menu.items, ['Reports', 'Data'])
  assert.deepEqual(list.items, ['Dashboard', 'Producers'])
  assert.deepEqual(list.pages, [''])
  assert.equal(list.loc, 'src/Nav.jsx:14:9')
})

test('same-class places: whole-word classes, text, and the nested route', () => {
  const { classes, classSelector } = findPlaces(files, { classes: ['kiosk-heading'] })
  assert.equal(classSelector, '.kiosk-heading')
  assert.deepEqual(classes.map((c) => [c.tag, c.text, c.inside, c.pages]), [
    ['h1', 'Register now', 'Welcome', ['/kiosk']],
    ['h1', 'Confirming registration / Confirming payment', 'Waiting', ['/kiosk']],
  ])
  assert.equal(classes[0].loc, 'src/kiosk/Kiosk.jsx:2:10')
})
