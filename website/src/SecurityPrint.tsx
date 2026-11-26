import { useId, useRef, type CSSProperties, type PointerEvent } from 'react'

const bandWidth = 140
const lines = Array.from({ length: 15 }, (_, ring) => {
  const points = Array.from({ length: 180 }, (_, sample) => {
    const angle = sample * 2 * Math.PI / 180
    const radius = 60 + ring * 6.1 + 16 * Math.cos(5 * angle + ring * .39)
    const x = 320 + 1.29 * radius * Math.cos(angle) + .18 * radius * Math.sin(angle)
    const y = 165 + .92 * radius * Math.sin(angle)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  return `M${points.join('L')}Z`
})

export function SecurityPrint() {
  const id = useId()
  const sweep = useRef<SVGRectElement>(null)

  function catchLight(event: PointerEvent<SVGSVGElement>) {
    if (!event.isPrimary) return
    const animation = sweep.current?.getAnimations()[0]
    const duration = animation?.effect?.getTiming().duration
    const matrix = event.currentTarget.getScreenCTM()
    if (!animation || !matrix || typeof duration !== 'number') return
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
    const position = point.x - point.y * .32 - bandWidth * .6
    animation.currentTime = ((position % bandWidth + bandWidth) % bandWidth) / bandWidth * duration
  }

  return (
    <svg className="security-print" style={{ '--foil-width': `${bandWidth}px` } as CSSProperties}
      viewBox="0 0 320 220" preserveAspectRatio="xMaxYMid slice"
      aria-hidden="true" focusable="false" onPointerMove={catchLight} onPointerDown={catchLight}>
      <defs>
        <g id={`${id}-lines`} fill="none" strokeLinejoin="round">
          {lines.map((line, index) => <path key={index} d={line} />)}
        </g>
        <linearGradient id={`${id}-ink`} gradientUnits="userSpaceOnUse" x1="80" x2="320">
          <stop stopColor="#93b9a7" stopOpacity=".12" />
          <stop offset=".55" stopColor="#72a18d" stopOpacity=".63" />
          <stop offset="1" stopColor="#4c8a78" stopOpacity=".75" />
        </linearGradient>
        <linearGradient id={`${id}-band`} gradientUnits="userSpaceOnUse" x2={bandWidth} spreadMethod="repeat">
          <stop offset=".25" stopColor="white" stopOpacity="0" />
          <stop offset=".55" stopColor="white" stopOpacity=".78" />
          <stop offset=".60" stopColor="white" />
          <stop offset=".72" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <mask id={`${id}-foil`} maskUnits="userSpaceOnUse" x="0" y="0" width="320" height="220">
          <g transform="skewX(17.75)">
            <rect ref={sweep} className="print-sweep" x="-280" y="0" width="760" height="220"
              fill={`url(#${id}-band)`} />
          </g>
        </mask>
      </defs>
      <use href={`#${id}-lines`} stroke={`url(#${id}-ink)`} strokeWidth="1.05" />
      <use href={`#${id}-lines`} stroke="#23856b" strokeWidth="1.85" mask={`url(#${id}-foil)`} />
    </svg>
  )
}
