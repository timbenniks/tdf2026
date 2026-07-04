import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { LiveRider, RaceGroup, RoutePoint, StageInfo } from '@shared/types'
import { JERSEY_HEX } from '@shared/jerseys'
import { MAP_MAX_ZOOM, MAP_MIN_ZOOM } from '@shared/config'
import { positionAtKm, progressKm, routeSegmentColor } from '../profile'

const DARK_BASE =
  'https://server.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
const DARK_REF =
  'https://server.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}'

type MarkerStyle = { bg: string; fg: string; glyph: string; title: string }

function markerStyle(p: RoutePoint, isFirst: boolean, isLast: boolean): MarkerStyle | null {
  if (p.summitName) {
    return { bg: '#e2001a', fg: '#fff', glyph: '▲', title: p.summitName }
  }
  const t = new Set(p.types)
  if (t.has('A') || isLast) return { bg: '#e2001a', fg: '#fff', glyph: '🏁', title: 'Finish' }
  if (t.has('R') || t.has('F') || isFirst)
    return { bg: '#2f6df6', fg: '#fff', glyph: '▶', title: 'Start' }
  if (t.has('C')) return { bg: '#f5d300', fg: '#111', glyph: '◔', title: 'Chrono point' }
  if (t.has('N')) return { bg: '#13a538', fg: '#fff', glyph: '▮', title: 'Sprint' }
  return null
}

function makeIcon(style: MarkerStyle): L.DivIcon {
  return L.divIcon({
    className: 'tdf-marker',
    html: `<span style="display:flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:5px;background:${style.bg};color:${style.fg};font-size:11px;line-height:1;box-shadow:0 1px 3px rgba(0,0,0,.5);border:1px solid rgba(0,0,0,.3)">${style.glyph}</span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  })
}

function groupDot(group: RaceGroup, isLead: boolean): L.DivIcon {
  const color = group.hasYellowJersey
    ? '#ffd400'
    : isLead
      ? '#34d399'
      : /pel|main|bunch|gruppo/i.test(group.name)
        ? '#e5e7eb'
        : '#fbbf24'
  return L.divIcon({
    className: 'tdf-group-dot',
    html: `<span style="display:block;width:14px;height:14px;border-radius:50%;background:${color};border:2px solid rgba(0,0,0,.6);box-shadow:0 0 0 2px ${color}55,0 1px 4px rgba(0,0,0,.6)"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  })
}

function kmMarkerIcon(km: number): L.DivIcon {
  const label = km >= 10 ? `${Math.round(km)}` : km.toFixed(1)
  return L.divIcon({
    className: 'tdf-km-marker',
    html: `<span style="display:flex;align-items:center;justify-content:center;min-width:28px;height:18px;padding:0 4px;border-radius:9px;background:#e2001a;color:#fff;font:600 9px/1 ui-monospace,monospace;box-shadow:0 0 0 2px rgba(0,0,0,.5),0 1px 4px rgba(0,0,0,.6)">${label} km</span>`,
    iconSize: [28, 18],
    iconAnchor: [14, 9]
  })
}

type Props = {
  route: RoutePoint[]
  groups?: RaceGroup[]
  liveRiders?: LiveRider[]
  stage?: StageInfo
}

export function RouteMap({ route, groups = [], liveRiders = [], stage }: Props): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const routeLayerRef = useRef<L.LayerGroup | null>(null)
  const liveLayerRef = useRef<L.LayerGroup | null>(null)

  const lead = groups[0]
  const totalKm =
    stage?.lengthKm && stage.lengthKm > 0
      ? stage.lengthKm
      : route.filter((p) => typeof p.lengthKm === 'number').at(-1)?.lengthKm
  const raceKm = progressKm(typeof totalKm === 'number' ? totalKm : 0, lead)

  // Init map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      minZoom: MAP_MIN_ZOOM,
      maxZoom: MAP_MAX_ZOOM,
      preferCanvas: true
    })
    L.tileLayer(DARK_BASE, { maxZoom: MAP_MAX_ZOOM }).addTo(map)
    L.tileLayer(DARK_REF, { maxZoom: MAP_MAX_ZOOM }).addTo(map)
    routeLayerRef.current = L.layerGroup().addTo(map)
    liveLayerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    const onFocus = (): void => {
      map.invalidateSize()
    }
    window.addEventListener('focus', onFocus)
    const t = setTimeout(() => map.invalidateSize(), 150)

    return () => {
      window.removeEventListener('focus', onFocus)
      clearTimeout(t)
      map.remove()
      mapRef.current = null
      routeLayerRef.current = null
      liveLayerRef.current = null
    }
  }, [])

  // Draw route + checkpoint markers whenever the route changes (fits bounds).
  useEffect(() => {
    const map = mapRef.current
    const layer = routeLayerRef.current
    if (!map || !layer) return
    layer.clearLayers()
    if (route.length < 2) return

    const latlngs = route.map((p) => [p.latitude, p.longitude] as [number, number])

    // Gradient-colored segments: each leg inherits the destination checkpoint's climb color.
    for (let i = 1; i < route.length; i++) {
      const seg = [latlngs[i - 1], latlngs[i]] as [number, number][]
      L.polyline(seg, {
        color: routeSegmentColor(route[i]),
        weight: 3,
        opacity: 0.95,
        lineJoin: 'round',
        lineCap: 'round'
      }).addTo(layer)
    }

    route.forEach((p, i) => {
      const style = markerStyle(p, i === 0, i === route.length - 1)
      if (!style) return
      L.marker([p.latitude, p.longitude], { icon: makeIcon(style), title: style.title }).addTo(layer)
    })

    map.invalidateSize()
    map.fitBounds(L.latLngBounds(latlngs).pad(0.12), { animate: false })
  }, [route])

  // Draw live positions and the current km marker on each update.
  useEffect(() => {
    const layer = liveLayerRef.current
    if (!layer) return
    layer.clearLayers()

    if (raceKm !== undefined) {
      const pos = positionAtKm(route, raceKm)
      if (pos) {
        L.marker([pos.latitude, pos.longitude], {
          icon: kmMarkerIcon(raceKm),
          title: `Race position: ${raceKm.toFixed(1)} km`,
          zIndexOffset: 900
        }).addTo(layer)
      }
    }

    if (groups.length > 0) {
      groups.forEach((g) => {
        if (typeof g.latitude !== 'number' || typeof g.longitude !== 'number') return
        L.marker([g.latitude, g.longitude], {
          icon: groupDot(g, g.order === 0),
          title: g.name,
          zIndexOffset: 1000
        }).addTo(layer)
      })
      return
    }

    liveRiders.forEach((r) => {
      if (typeof r.latitude !== 'number' || typeof r.longitude !== 'number') return
      const color = r.jersey ? JERSEY_HEX[r.jersey] : (r.teamColor ?? '#9ca3af')
      L.circleMarker([r.latitude, r.longitude], {
        radius: r.position === 1 ? 5 : 3.5,
        color: 'rgba(0,0,0,.6)',
        weight: 1,
        fillColor: color,
        fillOpacity: 0.95
      })
        .bindTooltip(`${r.position ?? ''} ${r.shortName ?? r.riderName ?? r.bib}`.trim(), {
          direction: 'top'
        })
        .addTo(layer)
    })
  }, [groups, liveRiders, route, raceKm])

  return <div ref={containerRef} className="h-[200px] w-full overflow-hidden rounded-lg bg-black/40" />
}
