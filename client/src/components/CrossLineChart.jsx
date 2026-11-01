import { useEffect, useId, useRef, useState } from 'react';
export default function CrossLineChart({ points, yMin = 0, yMax = 100, yTicks = [0,25,50,75,100], unit = '', label, compact = false }) {
  const [hover,setHover] = useState(null); const id = useId();
  const container = useRef(null);
  const [width, setWidth] = useState(compact ? 620 : 1040);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, entry.contentRect.width)));
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const height = width < 768 ? 200 : 240;
  const left = 42, right = width - 20, top = 20, bottom = height - 40;
  const x = (i) => left + 18 + i * (right - left - 30) / Math.max(points.length - 1, 1);
  const y = (value) => bottom - (value - yMin) / (yMax - yMin) * (bottom - top);
  let path = ''; let previous = false;
  points.forEach((p,i) => { if (p.value === null) { previous = false; return; } path += `${previous ? 'L' : 'M'}${x(i)},${y(p.value)} `; previous = true; });
  const active = hover === null ? null : points[hover];
  return <div ref={container} className={`cross-chart ${compact ? 'compact' : ''}`}><svg viewBox={`0 0 ${width} ${height}`} aria-labelledby={id} role="img"><title id={id}>{label}</title><path className="chart-axis" d={`M${left} ${top - 5}V${bottom}H${right}`}/>
    {yTicks.map(tick => <g key={tick}><text className="axis-label" x={left - 12} y={y(tick) + 4} textAnchor="end">{tick}{unit === 'h' ? 'h' : ''}</text>{points.map((_,i) => <path key={i} className="chart-cross" d={`M${x(i)-2.5} ${y(tick)-2.5}l5 5m0-5-5 5`}/>)}</g>)}
    <path className="chart-line" d={path}/>
    {points.map((point,i) => <g key={point.label}>{(i % (width < 450 ? 4 : 2) === 0 || i === points.length - 1) && <text className={`axis-label x-label ${i % 4 !== 0 && i !== points.length - 1 ? 'secondary-label' : ''}`} x={x(i)} y={bottom + 27} textAnchor="middle">{point.label}</text>}{point.value !== null && <g className="chart-point" tabIndex={0} role="img" aria-label={`${point.label}: ${point.value}${unit}`} onFocus={() => setHover(i)} onBlur={() => setHover(null)} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}><circle cx={x(i)} cy={y(point.value)} r="11" fill="transparent"/><circle cx={x(i)} cy={y(point.value)} r={hover === i ? 5.7 : 4.5} fill="var(--primary)" stroke="white" strokeWidth="1.7"/><title>{point.label}: {point.value}{unit}</title></g>}</g>)}
    {active && <g pointerEvents="none" transform={`translate(${Math.max(85,Math.min(width-85,x(hover)))},${Math.max(30,y(active.value)-20)})`}><rect x="-75" y="-25" width="150" height="28" rx="6" fill="var(--text)"/><text x="0" y="-7" fill="white" textAnchor="middle" fontSize="11">{active.label}: {active.value}{unit}</text></g>}
  </svg>{!points.some(p => p.value !== null) && <span className="chart-empty">No data for this period yet</span>}</div>;
}
