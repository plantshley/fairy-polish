// Named color sets shared by effects with a `palette` param. A palette param
// holds either one of these names or an array of colors (the "custom" choice
// in the editor).

export const PALETTES = {
  rainbow: ['#ff0000', '#ff7300', '#fffb00', '#48ff00', '#00ffd5', '#002bff', '#7a00ff', '#ff00c8'],
  'soft rainbow': ['#ff6b6b', '#ffa36b', '#ffd93d', '#6bcf7f', '#6bb5ff', '#a36bff'],
  'groovy rainbow': ['#ff3399', '#ff9933', '#ffdd00', '#00d4ff', '#5599ff', '#aa66ff'],
  'cyan-purple': ['#22d3ee', '#c084fc'],
  fairy: ['#ff8fc7', '#b89bff', '#ffd86b', '#9ee7ff'],
  flower: ['#EF8BBD', '#FFA585', '#EFAA66', '#FFE266', '#78EAC4', '#B2E7F1', '#8BB6EF', '#A183E2'],
  pastel: ['#ffd6e8', '#d6e4ff', '#e8d6ff'],
  sunset: ['#ff5f6d', '#ff9a5a', '#ffc371'],
  ocean: ['#00b4db', '#0083b0', '#5bbfa6'],
  'teal-green': ['#00b0e0', '#5bbfa6', '#a5c24a'],
  aurora: ['#00c9a7', '#4ea8de', '#845ec2'],
  candy: ['#ff9ad5', '#ffd3a5', '#a0e7e5'],
  gold: ['#ffd700', '#ffec8b', '#f5c542', '#fff5cc'],
  mono: ['#ffffff', '#9ca3af'],
}

// The colors for a palette param value, falling back to `fallback`.
export function colorsOf(value, fallback) {
  if (Array.isArray(value) && value.length) return value
  return PALETTES[value] || PALETTES[fallback] || PALETTES.rainbow
}
