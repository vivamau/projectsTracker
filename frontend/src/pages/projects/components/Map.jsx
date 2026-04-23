import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, GeoJSON, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, ExternalLink } from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';

const geoUrl = import.meta.env.VITE_API_URL + '/world';

const COLORS = {
  light: {
    mapBg: '#a8d4eb',
    countryFill: '#d6d6d6',
    countryStroke: '#ffffff',
  },
  dark: {
    mapBg: '#1a1a2e',
    countryFill: '#2f2f50',
    countryStroke: '#1a1a2e',
  },
  highlighted: {
    fill: '#94e49d',
    stroke: '#247c30',
  },
};

function MapController({ mapRef, seaColor }) {
  const map = useMap();
  mapRef.current = map;

  useEffect(() => {
    map.getContainer().style.background = seaColor;
  }, [map, seaColor]);

  return null;
}

function ZoomControls() {
  const map = useMap();
  return (
    <div className="absolute bottom-3 right-3 z-[1000] flex flex-col gap-1">
      <button
        onClick={() => map.zoomIn()}
        className="w-8 h-8 flex items-center justify-center rounded bg-surface-card border border-border text-text-primary text-lg font-bold shadow hover:bg-surface-hover transition-colors"
        aria-label="Zoom in"
      >
        +
      </button>
      <button
        onClick={() => map.zoomOut()}
        className="w-8 h-8 flex items-center justify-center rounded bg-surface-card border border-border text-text-primary text-lg font-bold shadow hover:bg-surface-hover transition-colors"
        aria-label="Zoom out"
      >
        −
      </button>
    </div>
  );
}

const Map = ({ countrylist }) => {
  const [worldData, setWorldData] = useState(null);
  const { theme } = useTheme();
  const mapRef = useRef(null);
  const [selected, setSelected] = useState(null); // { iso3, name, center }

  useEffect(() => {
    fetch(geoUrl).then(r => r.json()).then(setWorldData);
  }, []);

  const colors = COLORS[theme] ?? COLORS.light;
  const highlighted = new Set(countrylist.map(c => c.ISO3));

  const style = (feature) => {
    const isSelected = feature.id === selected?.iso3;
    const isHighlighted = highlighted.has(feature.id);
    if (isSelected) {
      return {
        fillColor: COLORS.highlighted.stroke,
        color: '#1a5c23',
        weight: 2,
        fillOpacity: 1,
      };
    }
    return {
      fillColor: isHighlighted ? COLORS.highlighted.fill : colors.countryFill,
      color: isHighlighted ? COLORS.highlighted.stroke : colors.countryStroke,
      weight: isHighlighted ? 2 : 1,
      fillOpacity: 1,
    };
  };

  const handleCountryClick = (country) => {
    if (!worldData) return;
    const feature = worldData.features.find(f => f.id === country.ISO3);
    if (!feature) return;

    const bounds = L.geoJSON(feature).getBounds();
    const center = bounds.getCenter();

    setSelected({ iso3: country.ISO3, name: country.short_name, center: [center.lat, center.lng] });

    if (mapRef.current) {
      mapRef.current.fitBounds(bounds, { padding: [20, 20], maxZoom: 6 });
    }
  };

  const sorted = [...countrylist].sort((a, b) => a.short_name.localeCompare(b.short_name));

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="relative">
          <MapContainer
            center={[20, 0]}
            zoom={1}
            style={{ height: '300px', background: colors.mapBg }}
            zoomControl={false}
            attributionControl={false}
            scrollWheelZoom={false}
          >
            <MapController mapRef={mapRef} seaColor={colors.mapBg} />
            {worldData && (
              <GeoJSON
                key={`${theme}-${selected?.iso3}-${JSON.stringify([...highlighted])}`}
                data={worldData}
                style={style}
              />
            )}
            {selected && (
              <CircleMarker
                center={selected.center}
                radius={5}
                pathOptions={{ fillColor: '#ffffff', color: COLORS.highlighted.stroke, weight: 2, fillOpacity: 1 }}
              >
                <Tooltip permanent direction="top" offset={[0, -8]}>
                  <span className="text-xs font-medium">{selected.name}</span>
                </Tooltip>
              </CircleMarker>
            )}
            <ZoomControls />
          </MapContainer>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {sorted.map(c => {
          const isSelected = selected?.iso3 === c.ISO3;
          return (
            <div key={c.UN_country_code} className="inline-flex items-center gap-0.5">
              <button
                onClick={() => handleCountryClick(c)}
                style={isSelected ? { backgroundColor: COLORS.highlighted.stroke, color: '#ffffff' } : undefined}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${isSelected ? '' : 'bg-surface text-text-primary hover:bg-surface-hover'}`}
              >
                <MapPin size={12} className={isSelected ? 'text-white/70' : 'text-text-secondary'} />
                {c.short_name}
              </button>
              <Link
                to={`/countries/${c.UN_country_code}`}
                className="p-0.5 text-text-secondary hover:text-primary-500 transition-colors"
                title={`View ${c.short_name} country page`}
              >
                <ExternalLink size={11} />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default Map;
