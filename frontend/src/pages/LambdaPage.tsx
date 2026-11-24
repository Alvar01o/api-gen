import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';
import { LanguageSelector } from '../components/LanguageSelector';

// ─── Palette ──────────────────────────────────────────────────────────────────
const BG     = '#070d1a';
const CARD   = '#0f172a';
const CARD2  = '#0c1526';
const BORDER = '#1e293b';
const BLUE   = '#3b82f6';
const BLUE_L = '#60a5fa';
const PURPLE = '#8b5cf6';
const GREEN  = '#22c55e';
const CYAN   = '#06b6d4';
const YELLOW = '#f59e0b';
const RED    = '#ef4444';
const T1     = '#f8fafc';
const T2     = '#94a3b8';
const T3     = '#475569';

// ─── Main Page ────────────────────────────────────────────────────────────────
export function LambdaPage() {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <div style={{ minHeight: '100vh', background: BG, color: T1, fontFamily: 'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      {/* Navbar */}
      <nav style={{ background: CARD, borderBottom: `1px solid ${BORDER}`, height: '3.5rem', display: 'flex', alignItems: 'center', padding: '0 1.5rem', gap: '1rem', position: 'sticky', top: 0, zIndex: 50 }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: T3, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.6rem', borderRadius: '6px', lineHeight: 1, alignSelf: 'center' }}
          onMouseEnter={e => { e.currentTarget.style.background = BORDER; e.currentTarget.style.color = T2; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T3; }}
        >
          {t('lambda.back')}
        </button>
        <span style={{ width: 1, height: 16, background: BORDER }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: 24, height: 24, borderRadius: '6px', background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.65rem', color: '#fff' }}>A</span>
          </div>
          <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.95rem', color: T1, letterSpacing: '-0.02em' }}>
            api<span style={{ color: BLUE }}>-dyn</span>
          </span>
          <span style={{ color: T3, fontSize: '0.75rem' }}>/ {t('lambda.title')}</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <LanguageSelector variant="dark" />
          <Pill color={GREEN}>port 4000</Pill>
          <Pill color={CYAN}>MySQL + PostgreSQL</Pill>
          <Pill color={RED}>Redis pub/sub</Pill>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(180deg,#0b1628 0%,#070d1a 100%)', borderBottom: `1px solid ${BORDER}`, padding: '5rem 1.5rem 4rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.9rem', borderRadius: '20px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', marginBottom: '1.5rem' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: GREEN, boxShadow: `0 0 8px ${GREEN}` }} />
          <span style={{ fontSize: '0.72rem', color: BLUE_L, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'monospace' }}>Dynamic CRUD Runtime</span>
        </div>

        <h1 style={{ margin: 0, fontSize: 'clamp(2.4rem,6vw,3.75rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.05 }}>
          <span style={{ background: `linear-gradient(135deg,${BLUE_L},${PURPLE})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Lambda</span>
          {' '}<span style={{ color: T1 }}>{t('lambda.title')}</span>
        </h1>
        <p style={{ margin: '1.25rem auto 0', maxWidth: 580, fontSize: '1.05rem', color: T2, lineHeight: 1.75 }}>
          {t('lambda.subtitle')}
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(1.5rem,4vw,3.5rem)', marginTop: '3rem', flexWrap: 'wrap' }}>
          {[
            { v: '6',  l: 'CRUD ops / table' },
            { v: '50', l: 'Max DB pools' },
            { v: '2',  l: 'SQL engines' },
            { v: '∞',  l: 'Tables' },
          ].map(s => (
            <div key={s.l} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.25rem', fontWeight: 800, color: BLUE_L, fontFamily: 'monospace', letterSpacing: '-0.04em' }}>{s.v}</div>
              <div style={{ fontSize: '0.68rem', color: T3, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.2rem' }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '5rem 1.5rem 7rem' }}>
        <SectionI18n titleKey="lambda.archTitle" subtitleKey="lambda.archDesc">
          <ArchDiagram />
        </SectionI18n>

        <Section title="Registration Flow" subtitle="From schema upload to live REST API — the manifest lifecycle visualized as a branch graph">
          <GitGraph />
        </Section>

        <SectionI18n titleKey="lambda.sequenceTitle" subtitleKey="lambda.sequenceDesc">
          <SequenceDiagram />
        </SectionI18n>

        <SectionI18n titleKey="lambda.endpointsTitle" subtitleKey="lambda.endpointsDesc">
          <EndpointsTable />
        </SectionI18n>

        <SectionI18n titleKey="lambda.relationsTitle" subtitleKey="lambda.relationsSubtitle">
          <RelationsSection />
        </SectionI18n>

        <SectionI18n titleKey="lambda.advantagesTitle" subtitleKey="lambda.advantagesSubtitle">
          <AdvantagesGrid />
        </SectionI18n>

        <SectionI18n titleKey="lambda.stackTitle" subtitleKey="lambda.stackSubtitle">
          <TechStackGrid />
        </SectionI18n>
      </div>

      <style>{`
        @keyframes lp-fadein { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes lp-glow   { 0%,100% { opacity:.45; } 50% { opacity:1; } }
      `}</style>
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function Pill({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{ padding: '0.2rem 0.65rem', borderRadius: 20, fontSize: '0.68rem', fontWeight: 700, fontFamily: 'monospace', color, background: `${color}18`, border: `1px solid ${color}40` }}>
      {children}
    </span>
  );
}

/** Section with translated title/subtitle via i18n keys */
function SectionI18n({ titleKey, subtitleKey, children }: { titleKey: string; subtitleKey: string; children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <section style={{ marginBottom: '5.5rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: T1 }}>{t(titleKey)}</h2>
        <p style={{ margin: '0.4rem 0 0', fontSize: '0.875rem', color: T3, lineHeight: 1.6 }}>{t(subtitleKey)}</p>
      </div>
      {children}
    </section>
  );
}

/** Section with static (non-translated) title/subtitle */
function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '5.5rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: T1 }}>{title}</h2>
        <p style={{ margin: '0.4rem 0 0', fontSize: '0.875rem', color: T3, lineHeight: 1.6 }}>{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

// ─── Architecture Diagram ─────────────────────────────────────────────────────

function ArchDiagram() {
  const ARR = (id: string, color: string) => (
    <marker id={id} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
      <path d="M0,0 L7,3.5 L0,7 Z" fill={color} />
    </marker>
  );

  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '1.5rem 1rem', overflow: 'hidden' }}>
      <svg viewBox="0 0 860 310" style={{ width: '100%', display: 'block' }}>
        <defs>
          {ARR('aB', BLUE)} {ARR('aG', GREEN)} {ARR('aP', PURPLE)} {ARR('aY', YELLOW)} {ARR('aR', RED)} {ARR('aC', CYAN)}
        </defs>

        {/* Lambda service outer frame */}
        <rect x="138" y="18" width="554" height="222" rx="12" fill={`${BLUE}05`} stroke={BLUE} strokeWidth="1" strokeDasharray="6 3" opacity="0.55" />
        <text x="684" y="34" textAnchor="end" fill={BLUE} fontSize="9" fontFamily="monospace" fontWeight="700" opacity="0.75">Lambda Service · :4000</text>

        {/* HTTP Client */}
        <rect x="14" y="90" width="94" height="52" rx="8" fill={CARD2} stroke={BORDER} strokeWidth="1.5" />
        <text x="61" y="111" textAnchor="middle" fill={T3} fontSize="9" fontFamily="monospace">HTTP</text>
        <text x="61" y="129" textAnchor="middle" fill={T1} fontSize="12" fontWeight="700">Client</text>

        {/* Express Router */}
        <rect x="162" y="76" width="118" height="66" rx="8" fill={`${BLUE}0c`} stroke={BLUE} strokeWidth="1.5" />
        <text x="221" y="97" textAnchor="middle" fill={BLUE_L} fontSize="8.5" fontFamily="monospace">Express 4.x</text>
        <text x="221" y="114" textAnchor="middle" fill={T1} fontSize="12" fontWeight="700">Router</text>
        <text x="221" y="130" textAnchor="middle" fill={T3} fontSize="8">middleware chain</text>

        {/* Dynamic Router */}
        <rect x="334" y="76" width="136" height="66" rx="8" fill={`${PURPLE}0c`} stroke={PURPLE} strokeWidth="1.5" />
        <text x="402" y="97" textAnchor="middle" fill={PURPLE} fontSize="8.5" fontFamily="monospace">sub-router map</text>
        <text x="402" y="114" textAnchor="middle" fill={T1} fontSize="12" fontWeight="700">Dyn. Router</text>
        <text x="402" y="130" textAnchor="middle" fill={T3} fontSize="8">hot-swappable</text>

        {/* CRUD Handlers */}
        <rect x="530" y="76" width="128" height="66" rx="8" fill={`${GREEN}0c`} stroke={GREEN} strokeWidth="1.5" />
        <text x="594" y="97" textAnchor="middle" fill={GREEN} fontSize="8.5" fontFamily="monospace">SQL generator</text>
        <text x="594" y="114" textAnchor="middle" fill={T1} fontSize="12" fontWeight="700">CRUD Handlers</text>
        <text x="594" y="130" textAnchor="middle" fill={T3} fontSize="8">6 ops per table</text>

        {/* Manifest Pool */}
        <rect x="334" y="178" width="136" height="50" rx="8" fill={`${PURPLE}07`} stroke={PURPLE} strokeWidth="1" strokeDasharray="4 2" />
        <text x="402" y="198" textAnchor="middle" fill={PURPLE} fontSize="8.5" fontFamily="monospace">in-memory LRU</text>
        <text x="402" y="216" textAnchor="middle" fill={T2} fontSize="10.5">Manifest Pool</text>

        {/* Redis */}
        <rect x="154" y="257" width="124" height="46" rx="8" fill={`${RED}0c`} stroke={RED} strokeWidth="1.5" />
        <text x="216" y="276" textAnchor="middle" fill={RED} fontSize="8.5" fontFamily="monospace">pub/sub</text>
        <text x="216" y="293" textAnchor="middle" fill={T1} fontSize="11.5" fontWeight="700">Redis :6379</text>

        {/* Schema Worker */}
        <rect x="14" y="257" width="120" height="46" rx="8" fill={CARD2} stroke={BORDER} strokeWidth="1.5" />
        <text x="74" y="276" textAnchor="middle" fill={YELLOW} fontSize="8.5" fontFamily="monospace">BullMQ</text>
        <text x="74" y="293" textAnchor="middle" fill={T1} fontSize="11.5" fontWeight="700">Schema Worker</text>

        {/* MySQL */}
        <rect x="715" y="70" width="130" height="46" rx="8" fill={`${CYAN}0c`} stroke={CYAN} strokeWidth="1.5" />
        <text x="780" y="89" textAnchor="middle" fill={CYAN} fontSize="8.5" fontFamily="monospace">mysql2 pool</text>
        <text x="780" y="106" textAnchor="middle" fill={T1} fontSize="11.5" fontWeight="700">MySQL :3306</text>

        {/* PostgreSQL */}
        <rect x="715" y="148" width="130" height="46" rx="8" fill={`${CYAN}0c`} stroke={CYAN} strokeWidth="1.5" />
        <text x="780" y="167" textAnchor="middle" fill={CYAN} fontSize="8.5" fontFamily="monospace">pg pool</text>
        <text x="780" y="184" textAnchor="middle" fill={T1} fontSize="11.5" fontWeight="700">PostgreSQL :5432</text>

        {/* Arrows */}
        <line x1="108" y1="116" x2="160" y2="109" stroke={BLUE} strokeWidth="1.5" markerEnd="url(#aB)" />
        <line x1="280" y1="109" x2="332" y2="109" stroke={BLUE} strokeWidth="1.5" markerEnd="url(#aB)" />
        <line x1="470" y1="109" x2="528" y2="109" stroke={BLUE} strokeWidth="1.5" markerEnd="url(#aB)" />
        <line x1="402" y1="142" x2="402" y2="176" stroke={PURPLE} strokeWidth="1.5" strokeDasharray="5 3" markerEnd="url(#aP)" />
        <path d="M 216 257 Q 280 232 333 205" stroke={RED} strokeWidth="1.5" fill="none" strokeDasharray="5 3" markerEnd="url(#aR)" />
        <line x1="134" y1="280" x2="152" y2="280" stroke={YELLOW} strokeWidth="1.5" markerEnd="url(#aY)" />
        <path d="M 658 102 Q 686 96 713 96" stroke={GREEN} strokeWidth="1.5" fill="none" markerEnd="url(#aG)" />
        <path d="M 658 122 Q 686 172 713 171" stroke={GREEN} strokeWidth="1.5" fill="none" markerEnd="url(#aG)" />

        {/* Labels */}
        <text x="96" y="110" fill={BLUE} fontSize="7" fontFamily="monospace" opacity="0.75">request</text>
        <text x="293" y="104" fill={BLUE} fontSize="7" fontFamily="monospace" opacity="0.75">dispatch</text>
        <text x="482" y="104" fill={BLUE} fontSize="7" fontFamily="monospace" opacity="0.75">execute</text>
        <text x="136" y="273" fill={YELLOW} fontSize="7" fontFamily="monospace" opacity="0.75">publish</text>
        <text x="407" y="162" fill={PURPLE} fontSize="7" fontFamily="monospace" opacity="0.75">lookup</text>
        <text x="222" y="249" fill={RED} fontSize="7" fontFamily="monospace" opacity="0.75" transform="rotate(-22 222 249)">manifest</text>
        <text x="666" y="90" fill={GREEN} fontSize="7" fontFamily="monospace" opacity="0.75">engine</text>
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', paddingTop: '1rem', borderTop: `1px solid ${BORDER}`, marginTop: '0.5rem' }}>
        {[
          { color: BLUE,   label: 'HTTP request flow' },
          { color: PURPLE, label: 'Manifest lookup' },
          { color: RED,    label: 'Redis pub/sub' },
          { color: YELLOW, label: 'Schema publication' },
          { color: GREEN,  label: 'SQL execution' },
          { color: CYAN,   label: 'Database drivers' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: 16, height: 2, background: l.color, display: 'inline-block', borderRadius: 2 }} />
            <span style={{ fontSize: '0.72rem', color: T3, fontFamily: 'monospace' }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Git Graph (Registration Flow) ───────────────────────────────────────────

function GitGraph() {
  // Branch y-positions
  const YW = 68;   // schema-worker
  const YR = 140;  // redis
  const YL = 212;  // lambda-service
  const YA = 278;  // api-client

  // Commit x-positions
  const T0 = 95;   // schema worker: schema processed
  const T1 = 210;  // schema worker: manifest published
  const T2 = 300;  // redis: manifest received
  const T3 = 395;  // redis: emits on lambda:registry
  const T4 = 480;  // lambda: manifest received
  const T5 = 578;  // lambda: sub-router built
  const T6 = 665;  // lambda: routes active
  const T7 = 750;  // api-client: first request

  const branches = [
    { y: YW, label: 'schema-worker', color: BLUE,   start: 72 },
    { y: YR, label: 'redis',         color: RED,    start: 268 },
    { y: YL, label: 'lambda-service',color: PURPLE, start: 450 },
    { y: YA, label: 'api-client',    color: GREEN,  start: 720 },
  ];

  const commits: Array<{ x: number; y: number; color: string; label: string; above: boolean }> = [
    { x: T0, y: YW, color: BLUE,   label: 'schema provisioned', above: true },
    { x: T1, y: YW, color: BLUE,   label: 'manifest published', above: true },
    { x: T2, y: YR, color: RED,    label: 'manifest stored',    above: false },
    { x: T3, y: YR, color: RED,    label: 'λ:registry emitted', above: false },
    { x: T4, y: YL, color: PURPLE, label: 'manifest received',  above: true },
    { x: T5, y: YL, color: PURPLE, label: 'router built',       above: true },
    { x: T6, y: YL, color: PURPLE, label: 'routes active',      above: true },
    { x: T7, y: YA, color: GREEN,  label: 'first request',      above: false },
  ];

  const MARK = (id: string, c: string) => (
    <marker key={id} id={id} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L6,3 L0,6 Z" fill={c} />
    </marker>
  );

  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '1.5rem 1rem', overflow: 'hidden' }}>
      <svg viewBox="0 0 820 310" style={{ width: '100%', display: 'block' }}>
        <defs>
          {MARK('gB', BLUE)} {MARK('gR', RED)} {MARK('gP', PURPLE)} {MARK('gG', GREEN)}
        </defs>

        {/* Branch labels */}
        {branches.map(b => (
          <text key={b.label} x="8" y={b.y + 4} fill={b.color} fontSize="9" fontFamily="monospace" fontWeight="700">{b.label}</text>
        ))}

        {/* Horizontal track lines */}
        {branches.map(b => (
          <line key={b.y} x1={b.start} y1={b.y} x2="800" y2={b.y} stroke={b.color} strokeWidth="2" opacity="0.25" />
        ))}

        {/* Cross-branch arrows */}
        {/* schema-worker → redis */}
        <line x1={T1} y1={YW + 10} x2={T2} y2={YR - 10} stroke={BLUE} strokeWidth="1.5" strokeDasharray="5 3" markerEnd="url(#gB)" opacity="0.65" />
        {/* redis → lambda */}
        <line x1={T3} y1={YR + 10} x2={T4} y2={YL - 10} stroke={RED} strokeWidth="1.5" strokeDasharray="5 3" markerEnd="url(#gR)" opacity="0.65" />
        {/* lambda → api-client */}
        <line x1={T6} y1={YL + 10} x2={T7} y2={YA - 10} stroke={PURPLE} strokeWidth="1.5" strokeDasharray="5 3" markerEnd="url(#gP)" opacity="0.65" />

        {/* Commits */}
        {commits.map((c, i) => (
          <g key={i}>
            {/* Glow ring */}
            <circle cx={c.x} cy={c.y} r={13} fill={c.color} opacity="0.12" />
            {/* Outer ring */}
            <circle cx={c.x} cy={c.y} r={9} fill="none" stroke={c.color} strokeWidth="1.5" opacity="0.5" />
            {/* Inner fill */}
            <circle cx={c.x} cy={c.y} r={6} fill={c.color} />
            {/* Step number */}
            <text x={c.x} y={c.y + 1} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="7.5" fontWeight="800">{i + 1}</text>
            {/* Label */}
            <text
              x={c.x}
              y={c.above ? c.y - 22 : c.y + 26}
              textAnchor="middle"
              fill={c.color}
              fontSize="8.5"
              fontFamily="monospace"
              fontWeight="600"
            >
              {c.label}
            </text>
          </g>
        ))}

        {/* Time axis */}
        <line x1="72" y1="297" x2="800" y2="297" stroke={BORDER} strokeWidth="1" />
        <text x="72" y="308" fill={T3} fontSize="7.5" fontFamily="monospace">t=0</text>
        <text x="790" y="308" textAnchor="end" fill={T3} fontSize="7.5" fontFamily="monospace">time →</text>
      </svg>

      {/* Step legend */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '0.5rem', paddingTop: '1rem', borderTop: `1px solid ${BORDER}`, marginTop: '0.5rem' }}>
        {[
          { n: '1', c: BLUE,   t: 'Schema provisioned by BullMQ worker' },
          { n: '2', c: BLUE,   t: 'Manifest JSON published to Redis' },
          { n: '3', c: RED,    t: 'Redis stores manifest (lambda:manifest:*)' },
          { n: '4', c: RED,    t: 'Pub/sub emits on lambda:registry channel' },
          { n: '5', c: PURPLE, t: 'Lambda receives message, reads manifest' },
          { n: '6', c: PURPLE, t: 'Sub-router built with CRUD handlers per table' },
          { n: '7', c: PURPLE, t: 'Routes mounted in dispatcher (atomic swap)' },
          { n: '8', c: GREEN,  t: 'API is live and ready to serve requests' },
        ].map(s => (
          <div key={s.n} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <span style={{ width: 18, height: 18, borderRadius: '50%', background: s.c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 800, color: '#fff', flexShrink: 0, marginTop: '0.05rem' }}>{s.n}</span>
            <span style={{ fontSize: '0.72rem', color: T2, lineHeight: 1.4 }}>{s.t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sequence Diagram ─────────────────────────────────────────────────────────

function SequenceDiagram() {
  // Actor center x-positions
  const AC = [65, 200, 345, 490, 638];
  const ACTORS = ['API Client', 'Lambda :4000', 'Manifest Pool', 'CRUD Handler', 'Database'];
  const COLORS = [GREEN, BLUE, PURPLE, YELLOW, CYAN];

  const msgs: Array<{ from: number; to: number; label: string; sub?: string; ret?: boolean }> = [
    { from: 0, to: 1, label: 'GET /mysql/mydb/users?limit=10' },
    { from: 1, to: 2, label: 'lookup("mysql", "mydb")' },
    { from: 2, to: 1, label: '{ tables, relations, pk }', ret: true },
    { from: 1, to: 3, label: 'buildQuery(manifest, {limit:10})' },
    { from: 3, to: 4, label: 'SELECT ... + COUNT(*) (parallel)' },
    { from: 4, to: 3, label: 'rows[], total=142', ret: true },
    { from: 3, to: 1, label: '{ data:[...], meta:{total,pages} }', ret: true },
    { from: 1, to: 0, label: '200 OK { data:[...], meta:{...} }', ret: true },
  ];

  const MSG_Y_START = 90;
  const MSG_GAP = 42;
  const LIFELINE_END = MSG_Y_START + msgs.length * MSG_GAP + 20;

  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '1.5rem 1rem', overflow: 'hidden' }}>
      <svg viewBox="0 0 720 430" style={{ width: '100%', display: 'block' }}>
        <defs>
          <marker id="sArr" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={T2} />
          </marker>
        </defs>

        {/* Actor boxes */}
        {ACTORS.map((name, i) => (
          <g key={name}>
            <rect x={AC[i] - 52} y="12" width="104" height="38" rx="7" fill={`${COLORS[i]}12`} stroke={COLORS[i]} strokeWidth="1.5" />
            <text x={AC[i]} y="36" textAnchor="middle" fill={COLORS[i]} fontSize="9.5" fontFamily="monospace" fontWeight="700">{name}</text>
          </g>
        ))}

        {/* Lifelines */}
        {AC.map((x, i) => (
          <line key={i} x1={x} y1="50" x2={x} y2={LIFELINE_END} stroke={COLORS[i]} strokeWidth="1" strokeDasharray="5 4" opacity="0.25" />
        ))}

        {/* Messages */}
        {msgs.map((m, i) => {
          const y = MSG_Y_START + i * MSG_GAP;
          const x1 = m.ret ? AC[m.to] : AC[m.from];
          const x2 = m.ret ? AC[m.from] : AC[m.to];
          const midX = (x1 + x2) / 2;
          const isLeft = x2 < x1;
          const labelY = y - 6;
          const arrowColor = m.ret ? T3 : COLORS[m.from];
          const isDashed = m.ret;
          return (
            <g key={i}>
              {/* Activation dots on lifeline */}
              <circle cx={AC[m.from]} cy={y} r={3} fill={COLORS[m.from]} opacity="0.6" />
              <circle cx={AC[m.to]} cy={y} r={3} fill={COLORS[m.to]} opacity="0.6" />
              {/* Arrow line */}
              <line
                x1={x1} y1={y} x2={x2} y2={y}
                stroke={arrowColor}
                strokeWidth={m.ret ? 1 : 1.5}
                strokeDasharray={isDashed ? '5 3' : undefined}
                markerEnd="url(#sArr)"
                opacity={m.ret ? 0.5 : 0.9}
              />
              {/* Label */}
              <rect x={midX - 65} y={labelY - 11} width="130" height="14" rx="3" fill={BG} opacity="0.85" />
              <text x={midX} y={labelY} textAnchor="middle" fill={m.ret ? T3 : T2} fontSize="8" fontFamily="monospace">{m.label}</text>
            </g>
          );
        })}

        {/* Bottom actor boxes */}
        {ACTORS.map((name, i) => (
          <g key={`bot-${name}`}>
            <rect x={AC[i] - 52} y={LIFELINE_END} width="104" height="38" rx="7" fill={`${COLORS[i]}12`} stroke={COLORS[i]} strokeWidth="1.5" />
            <text x={AC[i]} y={LIFELINE_END + 24} textAnchor="middle" fill={COLORS[i]} fontSize="9.5" fontFamily="monospace" fontWeight="700">{name}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── Endpoints Table ──────────────────────────────────────────────────────────

function EndpointsTable() {
  const rows: Array<{ method: string; path: string; desc: string; params?: string }> = [
    { method: 'GET',    path: '/:engine/:db/:table',         desc: 'List all records with pagination',           params: 'limit, offset, sort, order, filter[col]' },
    { method: 'POST',   path: '/:engine/:db/:table',         desc: 'Create a new record',                        params: 'JSON body' },
    { method: 'GET',    path: '/:engine/:db/:table/:id',     desc: 'Get a single record by primary key',         params: 'include (eager relations)' },
    { method: 'PUT',    path: '/:engine/:db/:table/:id',     desc: 'Update a record by primary key',             params: 'JSON body (partial)' },
    { method: 'DELETE', path: '/:engine/:db/:table/:id',     desc: 'Delete a record by primary key',             params: '—' },
    { method: 'GET',    path: '/:engine/:db/:table/:id/:rel',desc: 'Navigate a belongsTo/hasMany relation',      params: 'limit, offset, sort' },
    { method: 'GET',    path: '/:engine/:db/openapi.json',   desc: 'OpenAPI 3.0.3 specification for the DB',    params: '—' },
    { method: 'GET',    path: '/:engine/:db/docs',           desc: 'Interactive Swagger UI (CDN)',               params: '—' },
  ];

  const METHOD_COLORS: Record<string, string> = {
    GET: BLUE, POST: GREEN, PUT: YELLOW, DELETE: RED,
  };

  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>
      {rows.map((r, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: '64px 1fr 1fr',
            gap: '1rem',
            padding: '0.8rem 1.25rem',
            borderBottom: i < rows.length - 1 ? `1px solid ${BORDER}` : 'none',
            alignItems: 'center',
          }}
        >
          <span style={{ padding: '0.2rem 0.5rem', borderRadius: 5, fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace', color: METHOD_COLORS[r.method] ?? T2, background: `${METHOD_COLORS[r.method] ?? T2}18`, border: `1px solid ${METHOD_COLORS[r.method] ?? T2}40`, textAlign: 'center' }}>
            {r.method}
          </span>
          <div>
            <code style={{ fontSize: '0.78rem', color: T1, fontFamily: 'monospace', background: CARD2, padding: '0.15rem 0.4rem', borderRadius: 4 }}>{r.path}</code>
            {r.params && r.params !== '—' && (
              <div style={{ fontSize: '0.68rem', color: T3, marginTop: '0.25rem', fontFamily: 'monospace' }}>{r.params}</div>
            )}
          </div>
          <span style={{ fontSize: '0.78rem', color: T2 }}>{r.desc}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Relations Section ────────────────────────────────────────────────────────

function RelationsSection() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(420px,1fr))', gap: '1rem' }}>
      {/* BelongsTo */}
      <div style={{ background: CARD, border: `1px solid ${PURPLE}40`, borderRadius: 14, padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
          <span style={{ width: 28, height: 28, borderRadius: 7, background: `${PURPLE}20`, border: `1px solid ${PURPLE}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>↗</span>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: PURPLE }}>belongsTo</div>
            <div style={{ fontSize: '0.72rem', color: T3, fontFamily: 'monospace' }}>LEFT JOIN — inline flat result</div>
          </div>
        </div>
        <pre style={{ margin: 0, fontSize: '0.72rem', color: T2, background: CARD2, borderRadius: 8, padding: '1rem', overflow: 'auto', lineHeight: 1.6, border: `1px solid ${BORDER}` }}>{`SELECT main.*,
  rel.id   AS _rel_users__id,
  rel.name AS _rel_users__name
FROM orders AS main
LEFT JOIN users AS rel
  ON main.user_id = rel.id`}</pre>
        <div style={{ marginTop: '0.75rem', fontSize: '0.72rem', color: T3 }}>
          Result shape: <code style={{ color: PURPLE, fontFamily: 'monospace' }}>{'_relations: { users: { id, name } }'}</code>
        </div>
      </div>

      {/* HasMany */}
      <div style={{ background: CARD, border: `1px solid ${CYAN}40`, borderRadius: 14, padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
          <span style={{ width: 28, height: 28, borderRadius: 7, background: `${CYAN}20`, border: `1px solid ${CYAN}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>↙</span>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: CYAN }}>hasMany</div>
            <div style={{ fontSize: '0.72rem', color: T3, fontFamily: 'monospace' }}>correlated subquery — no row duplication</div>
          </div>
        </div>
        <pre style={{ margin: 0, fontSize: '0.72rem', color: T2, background: CARD2, borderRadius: 8, padding: '1rem', overflow: 'auto', lineHeight: 1.6, border: `1px solid ${BORDER}` }}>{`-- PostgreSQL
SELECT main.*,
  (SELECT json_agg(row_to_json(t))
   FROM items t
   WHERE t.order_id = main.id
  ) AS _has_items
FROM orders AS main

-- MySQL uses JSON_ARRAYAGG + JSON_OBJECT`}</pre>
        <div style={{ marginTop: '0.75rem', fontSize: '0.72rem', color: T3 }}>
          Result shape: <code style={{ color: CYAN, fontFamily: 'monospace' }}>{'_relations: { items: [...] }'}</code>
        </div>
      </div>
    </div>
  );
}

// ─── Advantages Grid ──────────────────────────────────────────────────────────

function AdvantagesGrid() {
  const cards = [
    {
      icon: '⚡',
      color: YELLOW,
      title: 'Zero configuration',
      desc: 'No boilerplate, no code generation step. Upload a SQL schema and all endpoints are live within seconds via Redis pub/sub.',
    },
    {
      icon: '⇄',
      color: BLUE,
      title: 'Multi-engine support',
      desc: 'A single runtime serves both MySQL and PostgreSQL databases simultaneously, with engine-specific SQL escaping and placeholders.',
    },
    {
      icon: '⊞',
      color: PURPLE,
      title: 'Automatic Swagger docs',
      desc: 'Each registered database gets a fully generated OpenAPI 3.0.3 spec and an interactive Swagger UI at /:engine/:db/docs.',
    },
    {
      icon: '◈',
      color: GREEN,
      title: 'Relationship navigation',
      desc: 'Handles both belongsTo (LEFT JOIN) and hasMany (correlated subquery) automatically from FK constraints in the schema.',
    },
    {
      icon: '⊟',
      color: CYAN,
      title: 'LRU connection pooling',
      desc: 'Up to 50 database pools managed with LRU eviction. Each pool maintains 5 concurrent connections to minimize latency.',
    },
    {
      icon: '≡',
      color: RED,
      title: 'Filtering & pagination',
      desc: 'Built-in support for ?filter[col]=val, ?sort=col&order=desc, and ?limit=50&offset=100 on every collection endpoint.',
    },
    {
      icon: '↻',
      color: YELLOW,
      title: 'Hot-swappable routing',
      desc: 'New databases register without restarts. The dispatcher reads from a live Map — atomic replacement, no request downtime.',
    },
    {
      icon: '⬡',
      color: BLUE,
      title: 'SQL injection prevention',
      desc: 'All identifiers validated with strict regex before use. Parameterized queries (? / $N) for all user-supplied values.',
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: '1rem' }}>
      {cards.map(c => (
        <div
          key={c.title}
          style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '1.25rem', transition: 'border-color 0.2s, background 0.2s' }}
          onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = `${c.color}60`; el.style.background = `${c.color}06`; }}
          onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = BORDER; el.style.background = CARD; }}
        >
          <div style={{ width: 36, height: 36, borderRadius: 9, background: `${c.color}18`, border: `1px solid ${c.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', marginBottom: '0.85rem' }}>
            {c.icon}
          </div>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: T1, marginBottom: '0.4rem' }}>{c.title}</div>
          <div style={{ fontSize: '0.78rem', color: T3, lineHeight: 1.6 }}>{c.desc}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Tech Stack Grid ──────────────────────────────────────────────────────────

function TechStackGrid() {
  const stack = [
    { name: 'Node.js 20', role: 'Runtime (Alpine)', color: GREEN },
    { name: 'TypeScript 5', role: 'Language', color: BLUE },
    { name: 'Express 4', role: 'HTTP server', color: CYAN },
    { name: 'ioredis 5', role: 'Redis pub/sub + client', color: RED },
    { name: 'mysql2 3', role: 'MySQL driver', color: YELLOW },
    { name: 'pg 8', role: 'PostgreSQL driver', color: BLUE_L },
    { name: 'Swagger UI', role: 'Auto documentation', color: PURPLE },
    { name: 'LRU Cache', role: 'Pool eviction strategy', color: GREEN },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '0.6rem' }}>
      {stack.map(s => (
        <div key={s.name} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, boxShadow: `0 0 6px ${s.color}`, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: T1, fontFamily: 'monospace' }}>{s.name}</div>
            <div style={{ fontSize: '0.68rem', color: T3, marginTop: '0.1rem' }}>{s.role}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
