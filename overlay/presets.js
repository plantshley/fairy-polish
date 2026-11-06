// Preset values for the panel's menus. Typing a value still works anywhere;
// these are starting points.

const SPACE = ['0', '2px', '4px', '8px', '12px', '16px', '20px', '24px', '32px', '48px', '64px']

export const LENGTHS = {
  width: ['auto', '100%', '75%', '50%', '33.333%', 'fit-content', 'max-content', 'min-content', '160px', '240px', '320px', '480px', '640px'],
  height: ['auto', '100%', 'fit-content', '100vh', '100dvh', '32px', '48px', '120px', '240px', '320px'],
  'min-width': ['0', 'auto', 'min-content', '120px', '240px', '320px'],
  'max-width': ['none', '100%', '480px', '640px', '768px', '960px', '1200px', '65ch'],
  'min-height': ['0', 'auto', '48px', '120px', '50vh', '100vh'],
  'max-height': ['none', '100%', '240px', '480px', '100vh'],
  gap: SPACE,
  margin: ['auto', ...SPACE],
  padding: SPACE,
  'font-size': ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '30px', '36px', '48px', '64px', '0.875rem', '1rem', '1.25rem', '1.5rem', '2rem'],
  'line-height': ['normal', '1', '1.15', '1.3', '1.5', '1.75', '2'],
  'letter-spacing': ['normal', '-0.04em', '-0.02em', '0.02em', '0.05em', '0.1em', '0.2em'],
  opacity: ['1', '0.9', '0.75', '0.5', '0.25', '0'],
  'border-width': ['0', '1px', '1.5px', '2px', '3px', '4px', '8px'],
  'border-radius': ['0', '2px', '4px', '6px', '8px', '12px', '16px', '24px', '9999px', '50%'],
  'z-index': ['auto', '0', '1', '10', '100', '-1'],
}

export const SHADOWS = [
  { value: 'none', label: 'none' },
  { value: '0 1px 2px rgba(0,0,0,.08)', label: 'hairline' },
  { value: '0 1px 3px rgba(0,0,0,.12), 0 1px 2px rgba(0,0,0,.08)', label: 'soft' },
  { value: '0 4px 12px rgba(0,0,0,.15)', label: 'medium' },
  { value: '0 12px 28px rgba(0,0,0,.18), 0 4px 8px rgba(0,0,0,.08)', label: 'lifted' },
  { value: '0 24px 48px rgba(0,0,0,.25)', label: 'deep' },
  { value: 'inset 0 2px 4px rgba(0,0,0,.12)', label: 'inset' },
  { value: '0 0 0 3px rgba(194,86,155,.35)', label: 'ring' },
  { value: '0 0 0 3px rgba(194,86,155,.25), 0 0 18px rgba(194,86,155,.45)', label: 'glow' },
  { value: '4px 4px 0 rgba(0,0,0,.9)', label: 'hard offset' },
]

export const TEXT_SHADOWS = [
  { value: 'none', label: 'none' },
  { value: '0 1px 1px rgba(0,0,0,.15)', label: 'subtle' },
  { value: '0 2px 6px rgba(0,0,0,.25)', label: 'soft' },
  { value: '0 3px 12px rgba(0,0,0,.45)', label: 'strong' },
  { value: '0 0 8px rgba(255,143,199,.9), 0 0 18px rgba(184,155,255,.6)', label: 'glow' },
  { value: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000', label: 'outline' },
  { value: '2px 2px 0 rgba(0,0,0,.85)', label: 'retro' },
  { value: '0 1px 0 rgba(255,255,255,.6)', label: 'emboss' },
]

export const FILTERS = [
  { value: 'none', label: 'none' },
  { value: 'blur(2px)', label: 'blur slight' },
  { value: 'blur(6px)', label: 'blur' },
  { value: 'brightness(1.1)', label: 'brighter' },
  { value: 'brightness(0.85)', label: 'darker' },
  { value: 'contrast(1.2)', label: 'more contrast' },
  { value: 'saturate(1.5)', label: 'more saturated' },
  { value: 'grayscale(1)', label: 'grayscale' },
  { value: 'sepia(0.6)', label: 'sepia' },
  { value: 'hue-rotate(45deg)', label: 'hue shift' },
  { value: 'invert(1)', label: 'invert' },
  { value: 'drop-shadow(0 4px 8px rgba(0,0,0,.25))', label: 'drop shadow' },
  { value: 'drop-shadow(0 0 8px rgba(255,143,199,.8))', label: 'drop glow' },
]

// Fonts offered in the font menu besides the page's own. Google Fonts load
// from fonts.googleapis.com when shown or picked; the change records the URL
// so the agent adds the import.
export const SYSTEM_FONTS = [
  ['system-ui', 'system-ui, sans-serif'],
  ['Arial', 'Arial, sans-serif'],
  ['Helvetica', 'Helvetica, Arial, sans-serif'],
  ['Verdana', 'Verdana, sans-serif'],
  ['Tahoma', 'Tahoma, sans-serif'],
  ['Trebuchet MS', '"Trebuchet MS", sans-serif'],
  ['Georgia', 'Georgia, serif'],
  ['Times New Roman', '"Times New Roman", serif'],
  ['Garamond', 'Garamond, serif'],
  ['Courier New', '"Courier New", monospace'],
  ['ui-monospace', 'ui-monospace, monospace'],
]

export const GOOGLE_FONTS = [
  ['Inter', 'sans-serif'],
  ['Poppins', 'sans-serif'],
  ['Nunito', 'sans-serif'],
  ['Quicksand', 'sans-serif'],
  ['DM Sans', 'sans-serif'],
  ['Space Grotesk', 'sans-serif'],
  ['Outfit', 'sans-serif'],
  ['Fredoka', 'sans-serif'],
  ['Baloo 2', 'sans-serif'],
  ['Playfair Display', 'serif'],
  ['Lora', 'serif'],
  ['Merriweather', 'serif'],
  ['DM Serif Display', 'serif'],
  ['Pacifico', 'cursive'],
  ['Caveat', 'cursive'],
  ['Press Start 2P', 'monospace'],
  ['JetBrains Mono', 'monospace'],
]

export function googleUrl(families) {
  return 'https://fonts.googleapis.com/css2?' + families.map((f) => 'family=' + f.replace(/ /g, '+')).join('&') + '&display=swap'
}

export function loadGoogle(doc, families) {
  const href = googleUrl(families)
  if ([...doc.querySelectorAll('link[data-fp-gfont]')].some((l) => l.href === href)) return
  const link = doc.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  link.dataset.fpGfont = ''
  doc.head.append(link)
}

// backdrop-filter presets: frosted glass at three strengths, plus tints.
export const BACKDROPS = [
  { value: 'none', label: 'none' },
  { value: 'blur(6px)', label: 'frosted, light' },
  { value: 'blur(12px) saturate(1.5)', label: 'frosted glass' },
  { value: 'blur(24px) saturate(1.8)', label: 'frosted, heavy' },
  { value: 'blur(12px) brightness(1.1)', label: 'frosted, brighter' },
  { value: 'blur(12px) brightness(0.8)', label: 'frosted, darker' },
  { value: 'grayscale(1)', label: 'grayscale behind' },
]

// The "+ frosted glass" button: a backdrop blur only shows through a
// see-through background, so it sets one, plus a faint light edge.
export const FROSTED = {
  'backdrop-filter': 'blur(12px) saturate(1.5)',
  'background-color': 'rgba(255, 255, 255, 0.25)',
  'border-width': '1px',
  'border-style': 'solid',
  'border-color': 'rgba(255, 255, 255, 0.4)',
}
