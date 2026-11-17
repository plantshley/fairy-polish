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

// [family, generic fallback, menu group]. Kept to families that load
// without a weight axis request (the regular face is enough to preview).
export const GOOGLE_FONTS = [
  ['Kalnia Glaze', 'serif', 'fairy-shop'],
  ['Bagel Fat One', 'sans-serif', 'fairy-shop'],
  ['Bonbon', 'cursive', 'fairy-shop'],
  ['Pacifico', 'cursive', 'fairy-shop'],
  ['Pixelify Sans', 'monospace', 'fairy-shop'],
  ['Silkscreen', 'monospace', 'fairy-shop'],
  ['Inclusive Sans', 'sans-serif', 'fairy-shop'],
  ['JetBrains Mono', 'monospace', 'fairy-shop'],
  ['Inter', 'sans-serif', 'everyday'],
  ['Poppins', 'sans-serif', 'everyday'],
  ['Nunito', 'sans-serif', 'everyday'],
  ['Quicksand', 'sans-serif', 'everyday'],
  ['DM Sans', 'sans-serif', 'everyday'],
  ['Outfit', 'sans-serif', 'everyday'],
  ['Space Grotesk', 'sans-serif', 'everyday'],
  ['Syne', 'sans-serif', 'everyday'],
  ['Unbounded', 'sans-serif', 'everyday'],
  ['Comfortaa', 'sans-serif', 'everyday'],
  ['Playpen Sans', 'cursive', 'everyday'],
  ['Playfair Display', 'serif', 'serif'],
  ['Fraunces', 'serif', 'serif'],
  ['Young Serif', 'serif', 'serif'],
  ['Instrument Serif', 'serif', 'serif'],
  ['DM Serif Display', 'serif', 'serif'],
  ['Lora', 'serif', 'serif'],
  ['Merriweather', 'serif', 'serif'],
  ['Cherry Swash', 'serif', 'serif'],
  ['Fredoka', 'sans-serif', 'bubbly and bold'],
  ['Baloo 2', 'sans-serif', 'bubbly and bold'],
  ['Sour Gummy', 'sans-serif', 'bubbly and bold'],
  ['Chewy', 'cursive', 'bubbly and bold'],
  ['Sniglet', 'sans-serif', 'bubbly and bold'],
  ['Grandstander', 'cursive', 'bubbly and bold'],
  ['Bubblegum Sans', 'cursive', 'bubbly and bold'],
  ['Coiny', 'sans-serif', 'bubbly and bold'],
  ['Galindo', 'cursive', 'bubbly and bold'],
  ['Lilita One', 'sans-serif', 'bubbly and bold'],
  ['Titan One', 'sans-serif', 'bubbly and bold'],
  ['Luckiest Guy', 'cursive', 'bubbly and bold'],
  ['Gluten', 'cursive', 'bubbly and bold'],
  ['Agbalumo', 'sans-serif', 'bubbly and bold'],
  ['Darumadrop One', 'cursive', 'bubbly and bold'],
  ['Mochiy Pop One', 'sans-serif', 'bubbly and bold'],
  ['Cherry Bomb One', 'sans-serif', 'bubbly and bold'],
  ['Modak', 'sans-serif', 'bubbly and bold'],
  ['Rubik Bubbles', 'sans-serif', 'bubbly and bold'],
  ['Rubik Puddles', 'sans-serif', 'bubbly and bold'],
  ['Bungee', 'sans-serif', 'bubbly and bold'],
  ['Shrikhand', 'cursive', 'bubbly and bold'],
  ['Righteous', 'sans-serif', 'bubbly and bold'],
  ['Dela Gothic One', 'sans-serif', 'bubbly and bold'],
  ['Londrina Solid', 'sans-serif', 'bubbly and bold'],
  ['Emilys Candy', 'cursive', 'bubbly and bold'],
  ['Henny Penny', 'cursive', 'bubbly and bold'],
  ['Nabla', 'sans-serif', 'color and glow'],
  ['Honk', 'sans-serif', 'color and glow'],
  ['Bungee Spice', 'sans-serif', 'color and glow'],
  ['Monoton', 'sans-serif', 'color and glow'],
  ['Rampart One', 'sans-serif', 'color and glow'],
  ['Fascinate', 'sans-serif', 'color and glow'],
  ['Caveat', 'cursive', 'handwritten'],
  ['Gochi Hand', 'cursive', 'handwritten'],
  ['Indie Flower', 'cursive', 'handwritten'],
  ['Gloria Hallelujah', 'cursive', 'handwritten'],
  ['Shadows Into Light', 'cursive', 'handwritten'],
  ['Permanent Marker', 'cursive', 'handwritten'],
  ['Rock Salt', 'cursive', 'handwritten'],
  ['Amatic SC', 'cursive', 'handwritten'],
  ['Mynerve', 'cursive', 'handwritten'],
  ['Borel', 'cursive', 'handwritten'],
  ['Hachi Maru Pop', 'cursive', 'handwritten'],
  ['Yusei Magic', 'sans-serif', 'handwritten'],
  ['Kirang Haerang', 'cursive', 'handwritten'],
  ['Dancing Script', 'cursive', 'handwritten'],
  ['Sacramento', 'cursive', 'handwritten'],
  ['Great Vibes', 'cursive', 'handwritten'],
  ['Lobster', 'cursive', 'handwritten'],
  ['Press Start 2P', 'monospace', 'pixel and retro'],
  ['VT323', 'monospace', 'pixel and retro'],
  ['DotGothic16', 'sans-serif', 'pixel and retro'],
  ['Tiny5', 'sans-serif', 'pixel and retro'],
  ['Micro 5', 'sans-serif', 'pixel and retro'],
  ['Jersey 10', 'sans-serif', 'pixel and retro'],
  ['Bytesized', 'sans-serif', 'pixel and retro'],
  ['Jacquard 12', 'serif', 'pixel and retro'],
  ['Sixtyfour', 'monospace', 'pixel and retro'],
  ['Workbench', 'monospace', 'pixel and retro'],
  ['Doto', 'monospace', 'pixel and retro'],
  ['Handjet', 'sans-serif', 'pixel and retro'],
  ['Rubik Glitch', 'sans-serif', 'pixel and retro'],
  ['Space Mono', 'monospace', 'pixel and retro'],
  ['Major Mono Display', 'monospace', 'pixel and retro'],
  ['Special Elite', 'cursive', 'pixel and retro'],
  ['Creepster', 'cursive', 'pixel and retro'],
  ['Atma', 'sans-serif', 'pixel and retro'],
]

// Fonts installed on this computer, not on the web. Picking one records
// where the agent can find the file, since the site has to ship it.
// [family as installed, generic fallback, where the file is]
export const LOCAL_FONTS = [
  ['rainyhearts', 'monospace', 'rainyhearts.ttf, in fairy/fairy-shop/src/assets/fonts/ (also installed in %LOCALAPPDATA%/Microsoft/Windows/Fonts/)'],
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
