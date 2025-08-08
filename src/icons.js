// Embedded SVG icons as data URIs
function svgData(svg){ return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg) }

export const ICONS = {
  tinder: svgData("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><g fill='none' stroke='none'><path d='M8 46c12-14 28-20 44-18' stroke='%23b45b08' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/><path d='M10 50h44v6c0 2-2 4-4 4H14c-2 0-4-2-4-4z' fill='%237a4b2b'/><path d='M22 34c6-6 14-10 22-8' stroke='%23d9a441' stroke-width='3' stroke-linecap='round'/></g></svg>"),
  kindling: svgData("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><g><rect x='6' y='45' width='52' height='6' rx='2' fill='%236e442c'/><g transform='translate(8,6)'><path d='M6 26c6-8 18-12 30-10' stroke='%23c0782a' stroke-width='3' stroke-linecap='round'/><path d='M28 18c3-4 8-6 12-5' stroke='%23f0c06a' stroke-width='2' stroke-linecap='round'/></g></g></svg>"),
  log: svgData("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 48'><g><rect x='4' y='8' width='72' height='32' rx='6' fill='%236b4329'/><ellipse cx='64' cy='24' rx='10' ry='8' fill='%2392603b' opacity='0.7'/><ellipse cx='20' cy='24' rx='8' ry='6' fill='%23a06b47' opacity='0.6'/></g></svg>")
}

export function createIcon(elId, dataUri){
  const el = document.getElementById(elId)
  const d = document.createElement('div')
  d.style.width='64px'
  d.style.height='64px'
  d.style.backgroundImage = `url(${dataUri})`
  d.style.backgroundSize='contain'
  d.style.backgroundRepeat='no-repeat'
  d.style.backgroundPosition='center'
  el.appendChild(d)
}
