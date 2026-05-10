import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ForceGraph2D from 'react-force-graph-2d';
import { Search, RefreshCw } from 'lucide-react';
import client from '../../api/client';

const TYPE_CONFIG = {
  project:   { color: '#3b82f6', label: 'Projects' },
  division:  { color: '#a855f7', label: 'Divisions' },
  initiative:{ color: '#22c55e', label: 'Initiatives' },
  vendor:    { color: '#f97316', label: 'Vendors' },
  user:      { color: '#14b8a6', label: 'People' },
  country:   { color: '#f43f5e', label: 'Countries' },
  note:      { color: '#eab308', label: 'Notes' },
};

const ENTITY_URLS = {
  project:    id => `/projects/${id}`,
  division:   id => `/divisions/${id}`,
  initiative: id => `/initiatives/${id}`,
  vendor:     id => `/vendors/${id}`,
  user:       id => `/users/${id}`,
  country:    id => `/countries/${id}`,
  note:       id => `/notes/${id}`,
};

export default function GraphPage() {
  const navigate = useNavigate();
  const fgRef = useRef();
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [hiddenTypes, setHiddenTypes] = useState(new Set(['country']));
  const [hoveredNode, setHoveredNode] = useState(null);
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.get('/graph');
      setGraphData(res.data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGraph(); }, [fetchGraph]);

  const filteredData = useMemo(() => {
    const q = search.trim().toLowerCase();
    const visibleNodes = graphData.nodes.filter(n => !hiddenTypes.has(n.type));
    const visibleIds = new Set(visibleNodes.map(n => n.id));
    const nodes = visibleNodes.map(n => ({
      ...n,
      _dimmed: q ? !n.label.toLowerCase().includes(q) : false,
    }));
    const links = graphData.links.filter(
      l => visibleIds.has(l.source?.id ?? l.source) && visibleIds.has(l.target?.id ?? l.target)
    );
    return { nodes, links };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphData, search, hiddenTypes]);

  // Keep a stable ref to links so hover callback doesn't recreate on every render
  const linksRef = useRef(filteredData.links);
  useEffect(() => { linksRef.current = filteredData.links; }, [filteredData.links]);

  const handleNodeHover = useCallback((node) => {
    setHoveredNode(node || null);
    if (!node) {
      setHighlightNodes(new Set());
      setHighlightLinks(new Set());
      return;
    }
    const connected = new Set([node.id]);
    const connectedLinks = new Set();
    linksRef.current.forEach(l => {
      const s = l.source?.id ?? l.source;
      const t = l.target?.id ?? l.target;
      if (s === node.id || t === node.id) {
        connected.add(s);
        connected.add(t);
        connectedLinks.add(l);
      }
    });
    setHighlightNodes(connected);
    setHighlightLinks(connectedLinks);
  }, []);

  const handleNodeClick = useCallback((node) => {
    const url = ENTITY_URLS[node.type]?.(node.entityId);
    if (url) navigate(url);
  }, [navigate]);

  const paintNode = useCallback((node, ctx, globalScale) => {
    const cfg = TYPE_CONFIG[node.type] || { color: '#888' };
    const isHighlighted = highlightNodes.size === 0 || highlightNodes.has(node.id);
    const isDimmed = node._dimmed || (highlightNodes.size > 0 && !highlightNodes.has(node.id));

    const r = node.type === 'note' ? 5 : node.type === 'country' ? 3 : 4;
    const alpha = isDimmed ? 0.15 : 1;

    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
    ctx.fillStyle = isHighlighted && !isDimmed ? cfg.color : cfg.color + '99';
    ctx.fill();

    if (isHighlighted && !isDimmed) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    const label = node.label;
    const fontSize = Math.max(2, Math.min(4, 12 / globalScale));
    ctx.font = `${fontSize}px Inter, sans-serif`;
    ctx.fillStyle = isDimmed ? '#888' : '#e5e7eb';
    ctx.textAlign = 'center';
    ctx.fillText(label.length > 25 ? label.slice(0, 24) + '…' : label, node.x, node.y + r + fontSize + 0.5);
    ctx.globalAlpha = 1;
  }, [highlightNodes]);

  const linkColor = useCallback((link) => {
    if (highlightLinks.size === 0) return 'rgba(148,163,184,0.2)';
    return highlightLinks.has(link) ? 'rgba(148,163,184,0.7)' : 'rgba(148,163,184,0.05)';
  }, [highlightLinks]);

  const linkWidth = useCallback((link) => {
    return highlightLinks.has(link) ? 1.5 : 0.5;
  }, [highlightLinks]);

  const toggleType = (type) => {
    setHiddenTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const stats = Object.fromEntries(
    Object.keys(TYPE_CONFIG).map(type => [type, graphData.nodes.filter(n => n.type === type).length])
  );

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-6">
      {/* Top controls */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-surface z-10 flex-shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Highlight nodes…"
            className="w-full rounded-lg border border-border-dark bg-surface pl-7 pr-3 py-1.5 text-xs outline-none focus:border-primary-500"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors border ${
                hiddenTypes.has(type)
                  ? 'border-border text-text-secondary bg-surface opacity-40'
                  : 'border-transparent text-white'
              }`}
              style={hiddenTypes.has(type) ? {} : { backgroundColor: cfg.color }}
              title={`${cfg.label}: ${stats[type] || 0}`}
            >
              {cfg.label} <span className="opacity-75">{stats[type] || 0}</span>
            </button>
          ))}
        </div>

        <button
          onClick={fetchGraph}
          disabled={loading}
          className="p-1.5 rounded-lg border border-border text-text-secondary hover:text-primary-500 hover:border-primary-300 transition-colors disabled:opacity-40"
          title="Refresh"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Graph canvas */}
      <div className="flex-1 bg-[#0f1117] relative overflow-hidden">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-text-secondary text-sm">
            Loading graph…
          </div>
        ) : (
          <ForceGraph2D
            ref={fgRef}
            graphData={filteredData}
            nodeCanvasObject={paintNode}
            nodeCanvasObjectMode={() => 'replace'}
            linkColor={linkColor}
            linkWidth={linkWidth}
            onNodeHover={handleNodeHover}
            onNodeClick={handleNodeClick}
            nodeRelSize={4}
            linkDirectionalParticles={2}
            linkDirectionalParticleWidth={link => highlightLinks.has(link) ? 2 : 0}
            linkDirectionalParticleSpeed={0.003}
            warmupTicks={200}
            cooldownTicks={100}
            cooldownTime={4000}
            d3AlphaDecay={0.05}
            d3VelocityDecay={0.6}
            enableNodeDrag={true}
            enableZoomInteraction={true}
          />
        )}

        {/* Hover tooltip */}
        {hoveredNode && (
          <div className="absolute bottom-4 left-4 rounded-xl border border-border bg-surface/95 backdrop-blur px-4 py-3 pointer-events-none shadow-lg max-w-xs">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: TYPE_CONFIG[hoveredNode.type]?.color }}
              />
              <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                {TYPE_CONFIG[hoveredNode.type]?.label?.replace(/s$/, '')}
              </span>
            </div>
            <p className="text-sm font-medium text-text-primary leading-snug">{hoveredNode.label}</p>
            <p className="text-xs text-text-secondary mt-1">Click to open →</p>
          </div>
        )}

        {/* Stats overlay */}
        <div className="absolute top-3 right-3 text-xs text-slate-500 text-right pointer-events-none">
          <p>{filteredData.nodes.length} nodes · {filteredData.links.length} edges</p>
        </div>
      </div>
    </div>
  );
}
