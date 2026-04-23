import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useTheme } from '../../../hooks/useTheme';
import { getCountriesWithProjects } from '../../../api/entitiesApi';

const geoUrl = import.meta.env.VITE_API_URL + '/world';

const SEA = { light: '#a8d4eb', dark: '#1a1a2e' };
const BASE = { light: '#e5e7eb', dark: '#2f2f50' };
// choropleth scale: light → dark
const SCALE = {
  light: [[219, 234, 254], [30, 58, 138]],   // blue-100 → blue-900
  dark:  [[147, 197, 253], [29,  78, 216]],   // blue-300 → blue-700
};

function lerp(c1, c2, t) {
  return `rgb(${Math.round(c1[0] + t * (c2[0] - c1[0]))},${Math.round(c1[1] + t * (c2[1] - c1[1]))},${Math.round(c1[2] + t * (c2[2] - c1[2]))})`;
}

function countColor(count, max, theme) {
  if (!count || !max) return BASE[theme] || BASE.light;
  const t = max > 1 ? (count - 1) / (max - 1) : 1;
  const sc = SCALE[theme] || SCALE.light;
  return lerp(sc[0], sc[1], t);
}

function MapBgSync({ color }) {
  const map = useMap();
  useEffect(() => { map.getContainer().style.background = color; }, [map, color]);
  return null;
}

function ZoomControls() {
  const map = useMap();
  return (
    <div className="absolute bottom-3 right-3 z-[1000] flex flex-col gap-1">
      <button
        onClick={() => map.zoomIn()}
        className="w-7 h-7 flex items-center justify-center rounded bg-surface-card border border-border text-text-primary font-bold shadow hover:bg-surface-hover transition-colors text-base leading-none"
        aria-label="Zoom in"
      >+</button>
      <button
        onClick={() => map.zoomOut()}
        className="w-7 h-7 flex items-center justify-center rounded bg-surface-card border border-border text-text-primary font-bold shadow hover:bg-surface-hover transition-colors text-base leading-none"
        aria-label="Zoom out"
      >−</button>
    </div>
  );
}

export default function ProjectsMap() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);

  const [worldData, setWorldData] = useState(null);
  const [countries, setCountries] = useState([]);
  const dataRef = useRef({ map: new Map(), max: 0 });

  useEffect(() => {
    fetch(geoUrl).then(r => r.json()).then(setWorldData);
    getCountriesWithProjects()
      .then(r => {
        const list = (r.data.data || []).map(c => ({
          ...c,
          project_count: parseInt(c.project_count, 10) || 0,
        }));
        const m = new Map();
        let max = 0;
        list.forEach(c => {
          m.set(c.ISO3, c);
          if (c.project_count > max) max = c.project_count;
        });
        dataRef.current = { map: m, max };
        setCountries(list);
      })
      .catch(() => {});
  }, []);

  const getStyle = useCallback((feature) => {
    const c = dataRef.current.map.get(feature.id);
    const fill = countColor(c?.project_count || 0, dataRef.current.max, theme);
    return {
      fillColor: fill,
      color: theme === 'dark' ? '#0f0f1a' : '#ffffff',
      weight: 1,
      fillOpacity: 1,
    };
  }, [theme]);

  const onEachFeature = useCallback((feature, layer) => {
    const iso3 = feature.id;

    layer.on({
      mouseover(e) {
        const c = dataRef.current.map.get(iso3);
        if (c) e.target.setStyle({ weight: 2, fillOpacity: 0.82 });
      },
      mouseout(e) {
        e.target.setStyle({ weight: 1, fillOpacity: 1 });
      },
      click() {
        const c = dataRef.current.map.get(iso3);
        if (c) navigateRef.current(`/countries/${c.UN_country_code}`);
      },
    });

    const c = dataRef.current.map.get(iso3);
    if (c) {
      const n = c.project_count;
      layer.bindTooltip(
        `<span style="font-size:12px;font-weight:600">${c.short_name}</span><br/>` +
        `<span style="font-size:11px">${n} project${n !== 1 ? 's' : ''}</span>`,
        { sticky: true, direction: 'top' }
      );
    }
  }, []);

  const seaColor = SEA[theme] || SEA.light;
  const geoKey = `${theme}-${countries.map(c => c.ISO3).join(',')}`;
  const max = dataRef.current.max;
  const sc = SCALE[theme] || SCALE.light;

  return (
    <div className="rounded-lg border border-border bg-surface-card overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div>
          <p className="text-sm font-semibold text-text-primary">Projects by Country</p>
          <p className="text-xs text-text-secondary">
            {countries.length} {countries.length === 1 ? 'country' : 'countries'} · click to explore
          </p>
        </div>
        {max > 0 && (
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <span>Fewer</span>
            <div className="flex gap-0.5 items-center">
              {[0, 0.2, 0.4, 0.6, 0.8, 1].map(t => (
                <div
                  key={t}
                  className="w-5 h-3 rounded-sm"
                  style={{ backgroundColor: t === 0 ? BASE[theme] : lerp(sc[0], sc[1], t) }}
                />
              ))}
            </div>
            <span>More</span>
            <span className="ml-1 font-medium text-text-primary">max: {max}</span>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="relative" style={{ height: 400 }}>
        <MapContainer
          center={[20, 0]}
          zoom={2}
          minZoom={1}
          style={{ height: '100%', background: seaColor }}
          zoomControl={false}
          attributionControl={false}
          scrollWheelZoom={false}
        >
          <MapBgSync color={seaColor} />
          {worldData && (
            <GeoJSON
              key={geoKey}
              data={worldData}
              style={getStyle}
              onEachFeature={onEachFeature}
            />
          )}
          <ZoomControls />
        </MapContainer>
      </div>
    </div>
  );
}
