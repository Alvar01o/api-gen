import { useEffect, useRef, useState } from 'react';
import cytoscape, { Core, ElementDefinition } from 'cytoscape';
import { useApp } from '../context/AppContext';
import { GenerateResponse, InspectResponse, TableNode, NodeChild } from '../types';
import { generateApis } from '../api/client';
import { useI18n } from '../i18n/I18nContext';

const NODE_BG = '#1e293b';
const NODE_SELECTED_BG = '#3a3aff';
const EDGE_CYCLIC_COLOR = '#e74c3c';

// ─── Connection count helpers ─────────────────────────────────────────────────

function computeConnectionCounts(graph: InspectResponse['graph']): Map<string, number> {
  const counts = new Map<string, number>();
  for (const id of Object.keys(graph)) counts.set(id, 0);

  for (const node of Object.values(graph)) {
    for (const child of node.children) {
      if (child.type !== 'fk' || child.is_cyclic) continue;
      if (!graph[child.id]) continue;
      // outgoing edge adds 1 to source, incoming edge adds 1 to target
      counts.set(node.id, (counts.get(node.id) ?? 0) + 1);
      counts.set(child.id, (counts.get(child.id) ?? 0) + 1);
    }
  }
  return counts;
}

function hexInterpolate(a: string, b: string, t: number): string {
  const p = (c: string, s: number) => parseInt(c.slice(s, s + 2), 16);
  const lerp = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${lerp(p(a,1),p(b,1))}${lerp(p(a,3),p(b,3))}${lerp(p(a,5),p(b,5))}`;
}

// Color scale: isolated → low → medium → high importance
const PALETTE = ['#334155', '#0f766e', '#2563eb', '#7c3aed'];

function nodeColor(count: number, max: number): string {
  if (max === 0 || count === 0) return PALETTE[0];
  const t = count / max;
  if (t < 0.33) return hexInterpolate(PALETTE[0], PALETTE[1], t / 0.33);
  if (t < 0.66) return hexInterpolate(PALETTE[1], PALETTE[2], (t - 0.33) / 0.33);
  return hexInterpolate(PALETTE[2], PALETTE[3], (t - 0.66) / 0.34);
}

type ViewMode = 'graph' | 'tree';

// ─────────────────────────────────────────────────────────────────────────────
// GraphView root
// ─────────────────────────────────────────────────────────────────────────────

export function GraphView() {
  const { inspectData, generateData, setGenerateData, activeTenant, requiresAuth, hashAlgorithm } = useApp();
  const { t } = useI18n();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<ViewMode>('graph');
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!inspectData || !wrapperRef.current) return;
    wrapperRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [inspectData]);

  // Close fullscreen on Escape
  useEffect(() => {
    if (!fullscreen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullscreen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [fullscreen]);

  async function handleGenerate() {
    if (!inspectData) return;
    setGenerating(true);
    setGenerateError(null);
    try {
      const result = await generateApis(activeTenant!.id, inspectData.engine, inspectData.dbName, { requiresAuth, hashAlgorithm });
      setGenerateData(result);
    } catch (e: any) {
      setGenerateError(e?.response?.data?.error ?? e.message);
    } finally {
      setGenerating(false);
    }
  }

  if (!inspectData) return null;

  const toolbar = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '0.6rem 1.25rem',
        background: '#1e293b',
        color: '#e2e8f0',
        fontSize: '0.85rem',
        borderRadius: fullscreen ? 0 : '10px 10px 0 0',
        flexShrink: 0,
      }}
    >
      <strong style={{ fontSize: '0.95rem', fontFamily: 'monospace' }}>
        {inspectData.dbName}
      </strong>
      <span style={{ color: '#94a3b8' }}>{inspectData.engine}</span>
      <span style={{ color: '#475569' }}>·</span>
      <span>{t('graph.tableCount', { count: inspectData.tables, total: inspectData.tables })}</span>
      {inspectData.cyclic && (
        <>
          <span style={{ color: '#475569' }}>·</span>
          <span style={{ color: EDGE_CYCLIC_COLOR }}>⚠ {t('graph.cyclesDetected')}</span>
        </>
      )}

      <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
        <SearchBar value={searchTerm} onChange={setSearchTerm} total={inspectData.tables} />
        <div style={{ width: '1px', background: '#334155', height: '1.2rem', margin: '0 0.25rem' }} />
        <ViewButton active={view === 'graph'} onClick={() => setView('graph')}>{'⬡ '}{t('graph.graphView')}</ViewButton>
        <ViewButton active={view === 'tree'} onClick={() => setView('tree')}>{'≡ '}{t('graph.treeView')}</ViewButton>
        <div style={{ width: '1px', background: '#334155', height: '1.2rem', margin: '0 0.25rem' }} />
        <ViewButton active={false} onClick={handleGenerate}>
          {generating ? '...' : <span>{'⚡ '}{t('graph.generateApis')}</span>}
        </ViewButton>
        <div style={{ width: '1px', background: '#334155', height: '1.2rem', margin: '0 0.25rem' }} />
        <button
          onClick={() => setFullscreen((v) => !v)}
          title={fullscreen ? t('graph.exitFullscreen') : t('graph.maximize')}
          style={{
            padding: '0.3rem 0.55rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            background: fullscreen ? '#334155' : '#1e293b',
            color: '#94a3b8',
            transition: 'background 0.15s',
            alignSelf: 'unset',
            lineHeight: 1,
          }}
        >
          {fullscreen ? '✕' : '⛶'}
        </button>
      </div>
    </div>
  );

  const content = (
    <>
      {view === 'graph' ? (
        <CytoscapeGraph key={`graph-${fullscreen}`} inspectData={inspectData} fullscreen={fullscreen} searchTerm={searchTerm} />
      ) : (
        <TreeView inspectData={inspectData} fullscreen={fullscreen} searchTerm={searchTerm} />
      )}
      {generateError && (
        <div style={{ padding: '0.6rem 1rem', background: '#fef2f2', color: '#b91c1c', fontSize: '0.82rem', flexShrink: 0 }}>
          {generateError}
        </div>
      )}
    </>
  );

  // ── Fullscreen overlay ─────────────────────────────────────────────────────
  if (fullscreen) {
    return (
      <>
        {/* Normal placeholder so page doesn't jump */}
        <div ref={wrapperRef} style={{ width: '100%' }} />

        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', flexDirection: 'column',
          background: '#0f172a',
        }}>
          {toolbar}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {content}
          </div>
          {generateData && (
            <div style={{ maxHeight: '40vh', overflowY: 'auto', borderTop: '1px solid #1e293b' }}>
              <GeneratedRoutesPanel data={generateData} />
            </div>
          )}
        </div>
      </>
    );
  }

  // ── Normal view ────────────────────────────────────────────────────────────
  return (
    <div ref={wrapperRef} style={{ width: '100%', position: 'relative' }}>
      {toolbar}
      {content}
      {generateData && <GeneratedRoutesPanel data={generateData} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Search bar
// ─────────────────────────────────────────────────────────────────────────────

function SearchBar({
  value,
  onChange,
  total,
}: {
  value: string;
  onChange: (v: string) => void;
  total: number;
}) {
  const { t } = useI18n();
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <span style={{
        position: 'absolute', left: '0.5rem',
        fontSize: '0.75rem', color: '#475569', pointerEvents: 'none',
      }}>
        🔍
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('graph.search', { total })}
        style={{
          padding: '0.3rem 2rem 0.3rem 1.75rem',
          fontSize: '0.78rem',
          borderRadius: '6px',
          border: value ? '1px solid #f59e0b' : '1px solid #334155',
          background: '#0f172a',
          color: '#e2e8f0',
          outline: 'none',
          width: '180px',
          transition: 'border-color 0.15s',
        }}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          style={{
            position: 'absolute', right: '0.4rem',
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#64748b', fontSize: '0.75rem', padding: '0.1rem',
            lineHeight: 1, alignSelf: 'unset',
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Toggle button
// ─────────────────────────────────────────────────────────────────────────────

function ViewButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0.3rem 0.85rem',
        fontSize: '0.8rem',
        fontWeight: 600,
        borderRadius: '6px',
        border: 'none',
        cursor: 'pointer',
        background: active ? '#3b82f6' : '#334155',
        color: active ? '#fff' : '#94a3b8',
        transition: 'background 0.15s, color 0.15s',
        alignSelf: 'unset',
      }}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cytoscape graph view
// ─────────────────────────────────────────────────────────────────────────────

function CytoscapeGraph({ inspectData, fullscreen, searchTerm }: { inspectData: InspectResponse; fullscreen?: boolean; searchTerm?: string }) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [selectedNode, setSelectedNode] = useState<TableNode | null>(null);
  const [topNodes, setTopNodes] = useState<{ id: string; count: number }[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;
    const { offsetWidth, offsetHeight } = containerRef.current;
    if (offsetWidth === 0 || offsetHeight === 0) return;

    // ── 1. Compute connection counts (in-degree + out-degree) ──────────────
    const counts = computeConnectionCounts(inspectData.graph);
    const maxConn = Math.max(...counts.values(), 1);

    // Top 5 most connected for the legend
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    setTopNodes(sorted.slice(0, 10).map(([id, count]) => ({ id, count })));

    // ── 2. Build elements ──────────────────────────────────────────────────
    const elements: ElementDefinition[] = [];

    for (const node of Object.values(inspectData.graph)) {
      const count = counts.get(node.id) ?? 0;
      elements.push({
        data: {
          id: node.id,
          label: `${node.id}\n${count} conn`,
          connectionCount: count,
          color: nodeColor(count, maxConn),
        },
      });
    }

    for (const node of Object.values(inspectData.graph)) {
      for (const child of node.children) {
        if (child.type !== 'fk' || child.is_cyclic) continue;
        if (!inspectData.graph[child.id]) continue;
        elements.push({
          data: {
            id: `${node.id}__${child.data.constraintName}`,
            source: node.id,
            target: child.id,
            label: child.data.columnName,
          },
        });
      }
    }

    cyRef.current?.destroy();

    // ── 3. Preset positions — top 10 on a circle, rest scattered inside ────
    const TOP_N = Math.min(10, sorted.length);
    const outerIds = sorted.slice(0, TOP_N).map(([id]) => id);
    const innerIds  = sorted.slice(TOP_N).map(([id]) => id);

    const RADIUS = 2000; // outer circle radius (px in graph coords)

    // Deterministic scatter: same id → same position every render
    function hashRng(seed: string) {
      let h = 5381;
      for (const c of seed) h = ((h << 5) + h + c.charCodeAt(0)) | 0;
      return () => {
        h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
        h ^= h >>> 16;
        return Math.abs(h) / 0x80000000;
      };
    }

    const positions: Record<string, { x: number; y: number }> = {};

    outerIds.forEach((id, i) => {
      const angle = (2 * Math.PI * i) / outerIds.length - Math.PI / 2;
      positions[id] = { x: RADIUS * Math.cos(angle), y: RADIUS * Math.sin(angle) };
    });

    innerIds.forEach((id) => {
      const rng = hashRng(id);
      const r = rng() * RADIUS * 0.68;
      const angle = rng() * 2 * Math.PI;
      positions[id] = { x: r * Math.cos(angle), y: r * Math.sin(angle) };
    });

    cyRef.current = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(color)',
            label: 'data(label)',
            color: '#e2e8f0',
            'text-valign': 'center',
            'text-halign': 'center',
            'text-wrap': 'wrap',
            'text-max-width': '120px',
            shape: 'roundrectangle',
            width: 'label',
            height: 'label',
            padding: '12px',
            'font-size': '11px',
            'font-family': "'JetBrains Mono', 'Fira Code', monospace",
            'border-width': 0,
          },
        },
        {
          selector: 'node:selected',
          style: {
            'background-color': NODE_SELECTED_BG,
            'border-width': 2,
            'border-color': '#fff',
          },
        },
        {
          selector: 'edge',
          style: {
            width: 2,
            'line-color': '#64748b',
            'target-arrow-color': '#64748b',
            'target-arrow-shape': 'triangle',
            'arrow-scale': 1.4,
            'curve-style': 'straight',
            'line-opacity': 0.7,
            label: 'data(label)',
            'font-size': '10px',
            'font-weight': '600',
            color: '#1e293b',
            'text-rotation': 'autorotate',
            'text-background-color': '#e2e8f0',
            'text-background-opacity': 1,
            'text-background-padding': '3px',
            'text-background-shape': 'roundrectangle',
          },
        },
        {
          selector: 'edge:selected',
          style: {
            width: 3,
            'line-color': '#3b82f6',
            'target-arrow-color': '#3b82f6',
            'line-opacity': 1,
          },
        },
      ],
      layout: {
        name: 'preset',
        positions: (node: any) => positions[node.id()] ?? { x: 0, y: 0 },
        fit: true,
        padding: 60,
        animate: true,
        animationDuration: 600,
      } as any,
      minZoom: 0.05,
      maxZoom: 3,
      wheelSensitivity: 0.3,
    });

    cyRef.current.on('tap', 'node', (evt) => {
      setSelectedNode(inspectData.graph[evt.target.id()] ?? null);
    });
    cyRef.current.on('tap', (evt) => {
      if (evt.target === cyRef.current) setSelectedNode(null);
    });

    return () => { cyRef.current?.destroy(); };
  }, [inspectData]);

  // ── Search highlight ────────────────────────────────────────────────────────
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const term = searchTerm?.trim().toLowerCase() ?? '';
    if (!term) {
      cy.nodes().forEach((n) => n.style({ opacity: 1, 'border-width': 0 }));
      cy.edges().forEach((e) => e.style({ opacity: 0.7 }));
      return;
    }
    const matched   = cy.nodes().filter((n) => n.id().toLowerCase().includes(term));
    const unmatched = cy.nodes().filter((n) => !n.id().toLowerCase().includes(term));
    matched.forEach((n)   => n.style({ opacity: 1, 'border-width': 3, 'border-color': '#f59e0b' }));
    unmatched.forEach((n) => n.style({ opacity: 0.08, 'border-width': 0 }));
    cy.edges().forEach((e) => e.style({ opacity: 0.05 }));
    if (matched.length > 0) {
      cy.animate({ fit: { eles: matched, padding: 100 } } as any, { duration: 350 });
    }
  }, [searchTerm]);

  return (
    <>
      {selectedNode && (
        <NodeDetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
      )}

      <div style={{ position: 'relative' }}>
        {/* ── Legend ── */}
        <div style={{
          position: 'absolute', top: '0.75rem', left: '0.75rem', zIndex: 10,
          background: 'rgba(15,23,42,0.88)', borderRadius: '8px',
          padding: '0.6rem 0.85rem', display: 'flex', flexDirection: 'column', gap: '0.4rem',
          backdropFilter: 'blur(4px)',
        }}>
          <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t('graph.mostConnected')}
          </p>
          {topNodes.map(({ id, count }) => (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                width: 10, height: 10, borderRadius: 2, flexShrink: 0,
                background: nodeColor(count, Math.max(...topNodes.map(n => n.count), 1)),
              }} />
              <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#e2e8f0' }}>{id}</span>
              <span style={{ marginLeft: 'auto', paddingLeft: '0.75rem', fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>{count}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid #1e293b', marginTop: '0.25rem', paddingTop: '0.35rem' }}>
            <div style={{ display: 'flex', gap: '0', borderRadius: '4px', overflow: 'hidden', height: '6px' }}>
              {PALETTE.map((c, i) => (
                <div key={i} style={{ flex: 1, background: c }} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#475569', marginTop: '0.2rem' }}>
              <span>{t('graph.isolated')}</span><span>{t('graph.high')}</span>
            </div>
          </div>
        </div>

        <div
          ref={containerRef}
          style={{ width: '100%', height: fullscreen ? 'calc(100vh - 3.5rem)' : '85vh', background: '#f8fafc' }}
        />
      </div>

      <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.4rem' }}>
        {t('graph.hint')}
      </p>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tree view
// ─────────────────────────────────────────────────────────────────────────────

function TreeView({ inspectData, fullscreen, searchTerm }: { inspectData: InspectResponse; fullscreen?: boolean; searchTerm?: string }) {
  const { t } = useI18n();
  const { graph } = inspectData;
  const term = searchTerm?.trim().toLowerCase() ?? '';

  // Tables that are not referenced by any non-cyclic FK = roots
  const referenced = new Set<string>();
  for (const node of Object.values(graph)) {
    for (const child of node.children) {
      if (child.type === 'fk' && !child.is_cyclic) referenced.add(child.id);
    }
  }
  const roots = Object.keys(graph).filter((id) => !referenced.has(id));

  // When searching, show all matching tables flat (ignore tree hierarchy)
  const displayIds = term
    ? Object.keys(graph).filter((id) => id.toLowerCase().includes(term))
    : (roots.length === 0 ? Object.keys(graph) : roots);

  return (
    <div
      style={{
        background: '#f8fafc',
        borderRadius: '0 0 10px 10px',
        padding: '1.5rem',
        minHeight: '30vh',
        maxHeight: fullscreen ? 'calc(100vh - 3.5rem)' : '70vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      {term && (
        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>
          {displayIds.length === 0
            ? t('graph.noMatch')
            : t('graph.tableCount', { count: displayIds.length, total: Object.keys(graph).length })}
        </div>
      )}
      {displayIds.map((id) => (
        <TreeNode key={id} id={id} graph={graph} visited={new Set()} depth={0} highlight={term} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Recursive tree node
// ─────────────────────────────────────────────────────────────────────────────

function TreeNode({
  id,
  graph,
  visited,
  depth,
  highlight,
}: {
  id: string;
  graph: InspectResponse['graph'];
  visited: Set<string>;
  depth: number;
  highlight?: string;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const node = graph[id];
  if (!node) return null;

  const isHighlighted = !!highlight && id.toLowerCase().includes(highlight.toLowerCase());
  const nextVisited = new Set(visited).add(id);

  const fkChildren = node.children.filter(
    (c): c is Extract<NodeChild, { type: 'fk' }> =>
      c.type === 'fk' && !c.is_cyclic && !!graph[c.id] && !visited.has(c.id),
  );

  const indexChildren = node.children.filter(
    (c): c is Extract<NodeChild, { type: 'index' }> => c.type === 'index',
  );

  const hasChildren = fkChildren.length > 0 || indexChildren.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* ── Node header ── */}
      <div
        onClick={() => hasChildren && setExpanded((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 0.75rem',
          background: isHighlighted ? '#78350f' : NODE_BG,
          color: '#e2e8f0',
          borderRadius: '7px',
          cursor: hasChildren ? 'pointer' : 'default',
          userSelect: 'none',
          marginLeft: `${depth * 2}rem`,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.85rem',
          fontWeight: 600,
          width: 'fit-content',
          minWidth: '160px',
          border: isHighlighted ? '1px solid #f59e0b' : '1px solid transparent',
        }}
      >
        <span style={{ color: '#64748b', fontSize: '0.7rem', width: '0.8rem' }}>
          {hasChildren ? (expanded ? '▼' : '▶') : '·'}
        </span>
        <span style={ isHighlighted ? { color: '#fcd34d' } : undefined}>{id}</span>
        <span style={{ color: '#475569', fontSize: '0.72rem', fontWeight: 400, marginLeft: '0.25rem' }}>
          ({node.data.columns.length} cols)
        </span>
      </div>

      {/* ── Expanded body ── */}
      {expanded && (
        <div
          style={{
            marginLeft: `${depth * 2 + 1.25}rem`,
            borderLeft: '2px solid #334155',
            paddingLeft: '0.75rem',
            marginTop: '0.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
          }}
        >
          {/* Columns */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', padding: '0.35rem 0' }}>
            {node.data.columns.map((col) => (
              <span key={col.name} style={colChip}>
                {col.isPrimary && <span style={{ color: '#a78bfa', marginRight: '0.2rem' }}>PK</span>}
                {col.name}
                <span style={{ color: '#64748b', marginLeft: '0.25rem', fontWeight: 400 }}>
                  {col.type}
                </span>
              </span>
            ))}
          </div>

          {/* Indexes */}
          {indexChildren.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', paddingBottom: '0.35rem' }}>
              {indexChildren.map((idx) => (
                <span key={idx.id} style={idxChip}>
                  {idx.data.unique && <span style={{ color: '#34d399', marginRight: '0.2rem' }}>UQ</span>}
                  {idx.id}
                  <span style={{ color: '#6b7280', marginLeft: '0.25rem', fontWeight: 400 }}>
                    ({idx.data.columns.join(', ')})
                  </span>
                </span>
              ))}
            </div>
          )}

          {/* FK children — recursive */}
          {fkChildren.map((child) => (
            <div key={child.data.constraintName}>
              <div style={{ fontSize: '0.72rem', color: '#60a5fa', marginBottom: '0.2rem', fontFamily: 'monospace' }}>
                ↳ <em>{child.data.columnName}</em> → {child.id}.{child.data.referencedColumn}
              </div>
              <TreeNode id={child.id} graph={graph} visited={nextVisited} depth={depth + 1} highlight={highlight} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared: node detail panel (graph view)
// ─────────────────────────────────────────────────────────────────────────────

function NodeDetailPanel({ node, onClose }: { node: TableNode; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <div
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 1000,
        background: '#fff',
        borderRadius: '10px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        width: '300px',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.75rem 1rem',
          background: NODE_BG,
          color: '#e2e8f0',
        }}
      >
        <code style={{ fontSize: '0.9rem', background: 'none', padding: 0 }}>{node.id}</code>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: '1rem',
            padding: '0 0.25rem',
            alignSelf: 'unset',
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ overflowY: 'auto', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <section>
          <p style={sectionTitle}>{t('graph.columns', { count: node.data.columns.length })}</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ color: '#94a3b8' }}>
                <th style={th}>{t('graph.colName')}</th>
                <th style={th}>{t('graph.colType')}</th>
                <th style={th}>{t('graph.colAttrs')}</th>
              </tr>
            </thead>
            <tbody>
              {node.data.columns.map((col) => (
                <tr key={col.name} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={td}><code style={codeInline}>{col.name}</code></td>
                  <td style={{ ...td, color: '#64748b' }}>{col.type}</td>
                  <td style={td}>
                    {col.isPrimary && <Badge color="#7c3aed">{t('graph.pk')}</Badge>}
                    {col.nullable === false && !col.isPrimary && <Badge color="#dc2626">{t('graph.nn')}</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {node.data.foreignKeys.length > 0 && (
          <section>
            <p style={sectionTitle}>{t('graph.foreignKeys', { count: node.data.foreignKeys.length })}</p>
            {node.data.foreignKeys.map((fk) => (
              <div key={fk.constraintName} style={fkRow}>
                <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <code style={codeInline}>{fk.columnName}</code>
                  <span style={{ color: '#94a3b8' }}>→</span>
                  <code style={codeInline}>{fk.referencedTable}.{fk.referencedColumn}</code>
                </div>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{fk.constraintName}</span>
              </div>
            ))}
          </section>
        )}

        {node.data.indexes.length > 0 && (
          <section>
            <p style={sectionTitle}>{t('graph.indexes', { count: node.data.indexes.length })}</p>
            {node.data.indexes.map((idx) => (
              <div key={idx.name} style={fkRow}>
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <code style={codeInline}>{idx.name}</code>
                  {idx.unique && <Badge color="#059669">{t('graph.unique')}</Badge>}
                </div>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>({idx.columns.join(', ')})</span>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Style helpers
// ─────────────────────────────────────────────────────────────────────────────

const sectionTitle: React.CSSProperties = {
  fontSize: '0.7rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  color: '#94a3b8',
  marginBottom: '0.35rem',
};

const th: React.CSSProperties = {
  textAlign: 'left',
  fontWeight: 600,
  padding: '0.2rem 0.3rem',
  fontSize: '0.72rem',
};

const td: React.CSSProperties = {
  padding: '0.25rem 0.3rem',
  verticalAlign: 'middle',
};

const codeInline: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  fontSize: '0.75rem',
  background: '#f1f5f9',
  padding: '0.1rem 0.3rem',
  borderRadius: '3px',
};

const fkRow: React.CSSProperties = {
  padding: '0.35rem 0',
  borderTop: '1px solid #f1f5f9',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.15rem',
};

const colChip: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '0.72rem',
  fontWeight: 600,
  background: '#1e293b',
  color: '#e2e8f0',
  padding: '0.15rem 0.5rem',
  borderRadius: '4px',
};

const idxChip: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '0.72rem',
  fontWeight: 600,
  background: '#f0fdf4',
  color: '#166534',
  border: '1px solid #bbf7d0',
  padding: '0.15rem 0.5rem',
  borderRadius: '4px',
};

// ─────────────────────────────────────────────────────────────────────────────
// SchemaViewerPanel — standalone viewer (no AppContext, used in My Projects)
// ─────────────────────────────────────────────────────────────────────────────

export function SchemaViewerPanel({ inspectData }: { inspectData: InspectResponse }) {
  const { t } = useI18n();
  const [view, setView] = useState<ViewMode>('graph');
  const [fullscreen, setFullscreen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!fullscreen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullscreen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [fullscreen]);

  const toolbar = (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '1rem',
      padding: '0.6rem 1.25rem',
      background: '#1e293b', color: '#e2e8f0', fontSize: '0.85rem',
      borderRadius: fullscreen ? 0 : '10px 10px 0 0',
      flexShrink: 0,
    }}>
      <strong style={{ fontSize: '0.95rem', fontFamily: 'monospace' }}>{inspectData.dbName}</strong>
      <span style={{ color: '#94a3b8' }}>{inspectData.engine}</span>
      <span style={{ color: '#475569' }}>·</span>
      <span>{t('graph.tables2', { count: inspectData.tables })}</span>
      {inspectData.cyclic && (
        <>
          <span style={{ color: '#475569' }}>·</span>
          <span style={{ color: EDGE_CYCLIC_COLOR }}>⚠ cycles</span>
        </>
      )}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
        <SearchBar value={searchTerm} onChange={setSearchTerm} total={inspectData.tables} />
        <div style={{ width: '1px', background: '#334155', height: '1.2rem', margin: '0 0.25rem' }} />
        <ViewButton active={view === 'graph'} onClick={() => setView('graph')}>{'⬡ '}{t('graph.graphView')}</ViewButton>
        <ViewButton active={view === 'tree'} onClick={() => setView('tree')}>{'≡ '}{t('graph.treeView')}</ViewButton>
        <div style={{ width: '1px', background: '#334155', height: '1.2rem', margin: '0 0.25rem' }} />
        <button
          onClick={() => setFullscreen((v) => !v)}
          title={fullscreen ? t('graph.exitFullscreen') : t('graph.maximize')}
          style={{
            padding: '0.3rem 0.55rem', fontSize: '0.85rem', fontWeight: 600,
            borderRadius: '6px', border: 'none', cursor: 'pointer',
            background: fullscreen ? '#334155' : '#1e293b', color: '#94a3b8',
            transition: 'background 0.15s', alignSelf: 'unset', lineHeight: 1,
          }}
        >
          {fullscreen ? '✕' : '⛶'}
        </button>
      </div>
    </div>
  );

  const content = view === 'graph'
    ? <CytoscapeGraph key={`proj-graph-${fullscreen}`} inspectData={inspectData} fullscreen={fullscreen} searchTerm={searchTerm} />
    : <TreeView inspectData={inspectData} fullscreen={fullscreen} searchTerm={searchTerm} />;

  if (fullscreen) {
    return (
      <>
        <div style={{ width: '100%', height: 40 }} />
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', background: '#0f172a' }}>
          {toolbar}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {content}
          </div>
        </div>
      </>
    );
  }

  return (
    <div style={{ width: '100%', borderRadius: '0 0 10px 10px', overflow: 'hidden', border: '1px solid #1e293b', borderTop: 'none' }}>
      {toolbar}
      {content}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Generated routes panel — accordion grouped by table
// ─────────────────────────────────────────────────────────────────────────────

const METHOD_COLOR: Record<string, { text: string; bg: string }> = {
  GET:    { text: '#166534', bg: '#dcfce7' },
  POST:   { text: '#1e40af', bg: '#dbeafe' },
  PUT:    { text: '#92400e', bg: '#fef3c7' },
  DELETE: { text: '#991b1b', bg: '#fee2e2' },
};

interface ParsedRoute { method: string; path: string }

function parseTable(path: string): string {
  // path: /{engine}/{dbName}/{table}[/:id][/{relation}]
  const parts = path.replace(/^\//, '').split('/');
  return parts[2] ?? 'unknown';
}

function GeneratedRoutesPanel({ data }: { data: GenerateResponse }) {
  const { t } = useI18n();
  const lambdaBase = (import.meta.env.VITE_LAMBDA_URL as string | undefined) ?? 'http://localhost:4000';
  const [panelOpen, setPanelOpen] = useState(false);           // main accordion
  const [openTables, setOpenTables] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);

  function toggleTable(table: string) {
    setOpenTables((prev) => {
      const next = new Set(prev);
      next.has(table) ? next.delete(table) : next.add(table);
      return next;
    });
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 1500);
  }

  // Group routes by table; separate special (docs/openapi.json) routes
  const specials: ParsedRoute[] = [];
  const byTable = new Map<string, ParsedRoute[]>();

  for (const route of data.routes) {
    const [method, path] = route.trim().split(/\s+/);
    const table = parseTable(path);
    if (table === 'docs' || table === 'openapi.json') {
      specials.push({ method, path });
    } else {
      if (!byTable.has(table)) byTable.set(table, []);
      byTable.get(table)!.push({ method, path });
    }
  }

  const docsRoute = specials.find((r) => r.path.endsWith('/docs'));
  const totalEndpoints = data.routes.length - specials.length;

  return (
    <div style={{ marginTop: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

      {/* ── Main accordion header (clickable) ── */}
      <div
        onClick={() => setPanelOpen((v) => !v)}
        style={{
          padding: '0.85rem 1.25rem',
          background: '#0f172a',
          display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        {/* Chevron */}
        <span style={{
          fontSize: '0.65rem', color: '#475569', width: '0.8rem',
          flexShrink: 0, transition: 'transform 0.2s',
          display: 'inline-block',
          transform: panelOpen ? 'rotate(90deg)' : 'rotate(0deg)',
        }}>
          ▶
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.9rem' }}>⚡</span>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f8fafc' }}>{t('graph.generatedApis')}</span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Chip label={data.engine} color="#3b82f6" />
          <Chip label={t('graph.tables2', { count: data.tables })} color="#6366f1" />
          <Chip label={t('graph.endpointsPlural', { count: totalEndpoints })} color="#0d9488" />
        </div>

        {/* Right side: base URL + docs link */}
        <div
          style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}
          onClick={(e) => e.stopPropagation()} // don't toggle panel when clicking links
        >
          <code style={{ fontSize: '0.72rem', color: '#475569', background: '#1e293b', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
            {lambdaBase}
          </code>
          {docsRoute && (
            <a
              href={`${lambdaBase}${docsRoute.path}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '0.75rem', fontWeight: 600, color: '#93c5fd',
                background: '#1e3a5f', padding: '0.3rem 0.8rem',
                borderRadius: '6px', textDecoration: 'none', border: '1px solid #2563eb',
                whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.35rem',
              }}
            >
              <span>📄</span> {t('graph.viewApiDocs')}
            </a>
          )}
          <span style={{
            fontSize: '0.68rem', color: '#475569', fontWeight: 500,
            padding: '0.2rem 0.5rem', borderRadius: '4px',
            background: '#1e293b',
          }}>
            {panelOpen ? t('graph.collapse') : t('graph.expand')}
          </span>
        </div>
      </div>

      {/* ── Collapsible body ── */}
      {panelOpen && (
        <div style={{ background: '#fff' }}>
          {[...byTable.entries()].map(([table, routes], idx) => {
            const isOpen = openTables.has(table);
            const methods = [...new Set(routes.map((r) => r.method))];

            return (
              <div key={table} style={{ borderTop: idx === 0 ? 'none' : '1px solid #f1f5f9' }}>

                {/* Table accordion header */}
                <button
                  onClick={() => toggleTable(table)}
                  style={{
                    width: '100%', background: 'none', border: 'none',
                    padding: '0.7rem 1.25rem',
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#f8fafc'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
                >
                  <span style={{ fontSize: '0.65rem', color: '#94a3b8', width: '0.9rem', flexShrink: 0 }}>
                    {isOpen ? '▼' : '▶'}
                  </span>
                  <code style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.82rem', fontWeight: 700, color: '#0f172a',
                    background: 'none', padding: 0,
                  }}>
                    {table}
                  </code>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>
                    {routes.length === 1
                      ? t('graph.endpoints', { count: routes.length })
                      : t('graph.endpointsPlural', { count: routes.length })}
                  </span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.3rem' }}>
                    {methods.map((m) => (
                      <span key={m} style={{
                        fontSize: '0.62rem', fontWeight: 700,
                        color: METHOD_COLOR[m]?.text ?? '#475569',
                        background: METHOD_COLOR[m]?.bg ?? '#f1f5f9',
                        padding: '0.1rem 0.35rem', borderRadius: '3px',
                      }}>
                        {m}
                      </span>
                    ))}
                  </div>
                </button>

                {/* Table accordion body */}
                {isOpen && (
                  <div style={{
                    background: '#f8fafc', borderTop: '1px solid #f1f5f9',
                    padding: '0.5rem 1.25rem 0.75rem',
                    display: 'flex', flexDirection: 'column', gap: '0.25rem',
                  }}>
                    {routes.map((route) => {
                      const fullUrl = `${lambdaBase}${route.path}`;
                      const isCopied = copied === fullUrl;
                      const mc = METHOD_COLOR[route.method];

                      return (
                        <div
                          key={route.method + route.path}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            padding: '0.35rem 0.6rem', borderRadius: '6px',
                            background: '#fff', border: '1px solid #f1f5f9',
                          }}
                        >
                          <span style={{
                            fontFamily: 'monospace', fontWeight: 700, fontSize: '0.72rem',
                            color: mc?.text ?? '#475569', background: mc?.bg ?? '#f1f5f9',
                            padding: '0.1rem 0.4rem', borderRadius: '3px',
                            minWidth: '3.5rem', textAlign: 'center',
                          }}>
                            {route.method}
                          </span>
                          <code style={{ fontSize: '0.78rem', color: '#334155', flex: 1, background: 'none', padding: 0 }}>
                            {route.path}
                          </code>
                          <button
                            onClick={() => copy(fullUrl)}
                            style={{
                              fontSize: '0.68rem', padding: '0.15rem 0.5rem',
                              borderRadius: '4px', border: `1px solid ${isCopied ? '#bbf7d0' : '#e2e8f0'}`,
                              background: isCopied ? '#dcfce7' : '#fff',
                              color: isCopied ? '#16a34a' : '#94a3b8',
                              cursor: 'pointer', alignSelf: 'unset', fontWeight: 600,
                              transition: 'all 0.15s',
                            }}
                          >
                            {isCopied ? '✓ copied' : 'copy'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Documentation links footer */}
          {specials.length > 0 && (
            <div style={{
              borderTop: '1px solid #f1f5f9', padding: '0.65rem 1.25rem',
              display: 'flex', gap: '0.75rem', alignItems: 'center',
              background: '#f8fafc',
            }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>{t('graph.documentation')}</span>
              <span style={{ width: 1, height: 14, background: '#e2e8f0' }} />
              {specials.map((r) => {
                const fullUrl = `${lambdaBase}${r.path}`;
                const isSwagger = r.path.endsWith('/docs');
                return (
                  <a
                    key={r.path}
                    href={fullUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '0.72rem', fontWeight: 600,
                      color: isSwagger ? '#2563eb' : '#0d9488',
                      background: isSwagger ? '#eff6ff' : '#f0fdfa',
                      padding: '0.25rem 0.65rem', borderRadius: '5px',
                      textDecoration: 'none',
                      border: `1px solid ${isSwagger ? '#bfdbfe' : '#99f6e4'}`,
                      display: 'flex', alignItems: 'center', gap: '0.3rem',
                    }}
                  >
                    {isSwagger ? '📄 Swagger UI' : '{ } openapi.json'} ↗
                  </a>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontSize: '0.68rem', fontWeight: 600,
      color, border: `1px solid ${color}33`,
      background: `${color}18`,
      padding: '0.15rem 0.5rem', borderRadius: '4px',
    }}>
      {label}
    </span>
  );
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: '0.65rem',
        fontWeight: 700,
        color: '#fff',
        background: color,
        borderRadius: '3px',
        padding: '0.05rem 0.35rem',
      }}
    >
      {children}
    </span>
  );
}
