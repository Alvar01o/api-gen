import { useEffect, useState } from 'react';
import { adminListGenerated, inspectSchema } from '../api/client';
import { InspectResponse } from '../types';
import { SchemaViewerPanel } from './GraphView';
import { useI18n } from '../i18n/I18nContext';

const LAMBDA_BASE = (import.meta.env.VITE_LAMBDA_URL as string | undefined) ?? 'http://localhost:4000';

interface AdminProject {
  id: string;
  userId?: string;
  tenantId?: string;
  engine: string;
  dbName: string;
  routes: string[];
  createdAt: string;
}

function parseRouteStats(routes: string[], engine: string, dbName: string) {
  const tables = new Set<string>();

  for (const route of routes) {
    const [, path] = route.trim().split(/\s+/);
    const parts = path.replace(/^\//, '').split('/');
    const table = parts[2]?.split('?')[0]?.split(':')[0] ?? '';
    if (table) tables.add(table);
  }

  return {
    docsUrl: `${LAMBDA_BASE}/${engine}/${dbName}/docs`,
    specUrl: `${LAMBDA_BASE}/${engine}/${dbName}/openapi.json`,
    tableCount: tables.size,
    totalEndpoints: routes.length,
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function AdminProjectCard({ project }: { project: AdminProject }) {
  const { t } = useI18n();
  const { docsUrl, specUrl, tableCount, totalEndpoints } = parseRouteStats(project.routes, project.engine, project.dbName);
  const [expanded, setExpanded] = useState(false);
  const [inspectData, setInspectData] = useState<InspectResponse | null>(null);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  const engineColor  = project.engine === 'postgres' ? '#2563eb' : '#f97316';
  const engineBg     = project.engine === 'postgres' ? '#eff6ff' : '#fff7ed';
  const engineBorder = project.engine === 'postgres' ? '#bfdbfe' : '#fed7aa';

  async function handleExpand() {
    const next = !expanded;
    setExpanded(next);
    if (next && !inspectData && !loadingSchema) {
      setLoadingSchema(true);
      setSchemaError(null);
      try {
        const data = await inspectSchema(project.tenantId ?? '', project.engine, project.dbName) as InspectResponse;
        setInspectData(data);
      } catch {
        setSchemaError(t('projects.loadError'));
      } finally {
        setLoadingSchema(false);
      }
    }
  }

  return (
    <div style={{
      border: '1px solid #e2e8f0',
      borderRadius: '10px',
      background: '#fff',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      overflow: 'hidden',
    }}>
      {/* ── Header ── */}
      <div
        onClick={handleExpand}
        style={{
          display: 'flex', alignItems: 'center', gap: '1rem',
          padding: '1rem 1.25rem',
          cursor: 'pointer', userSelect: 'none',
          background: expanded ? '#f8fafc' : '#fff',
          transition: 'background 0.15s',
        }}
      >
        {/* Chevron */}
        <span style={{
          fontSize: '0.65rem', color: '#94a3b8', flexShrink: 0,
          transition: 'transform 0.2s', display: 'inline-block',
          transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
        }}>
          ▶
        </span>

        {/* DB icon */}
        <div style={{
          width: 38, height: 38, borderRadius: '9px', flexShrink: 0,
          background: 'linear-gradient(135deg, #1e293b, #334155)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1rem',
        }}>
          🗄️
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700, fontSize: '0.9rem', color: '#0f172a',
            }}>
              {project.dbName}
            </span>
            <span style={{
              fontSize: '0.65rem', fontWeight: 700,
              color: engineColor, background: engineBg,
              border: `1px solid ${engineBorder}`,
              padding: '0.1rem 0.4rem', borderRadius: '3px',
            }}>
              {project.engine.toUpperCase()}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <Stat value={String(tableCount)} label={t('projects.tables')} />
            <Sep />
            <Stat value={String(totalEndpoints)} label={t('projects.endpoints')} />
            <Sep />
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{formatDate(project.createdAt)}</span>
            {project.userId && (
              <>
                <Sep />
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                  {t('projects.uid') + ' '}<span style={{ fontFamily: 'monospace', color: '#64748b' }}>{project.userId.slice(0, 8)}…</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div
          style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <a
            href={docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              fontSize: '0.78rem', fontWeight: 600,
              color: '#fff', background: '#2563eb',
              padding: '0.4rem 0.85rem', borderRadius: '6px',
              textDecoration: 'none', border: '1px solid #1d4ed8',
              whiteSpace: 'nowrap',
            }}
          >
            {'📄 '}{t('projects.swagger')}
          </a>
          <a
            href={specUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              fontSize: '0.78rem', fontWeight: 600,
              color: '#0d9488', background: '#f0fdfa',
              padding: '0.4rem 0.85rem', borderRadius: '6px',
              textDecoration: 'none', border: '1px solid #99f6e4',
              whiteSpace: 'nowrap',
            }}
          >
            {'{ } '}{t('projects.openapi')}
          </a>
        </div>
      </div>

      {/* ── Accordion body ── */}
      {expanded && (
        <div style={{ borderTop: '1px solid #e2e8f0' }}>
          {loadingSchema && (
            <div style={{
              padding: '2rem', textAlign: 'center',
              fontSize: '0.82rem', color: '#94a3b8', background: '#f8fafc',
            }}>
              {t('projects.loadingSchema')}
            </div>
          )}
          {schemaError && (
            <div style={{
              padding: '1rem 1.25rem', background: '#fef2f2',
              color: '#b91c1c', fontSize: '0.82rem',
            }}>
              {schemaError}
            </div>
          )}
          {inspectData && <SchemaViewerPanel inspectData={inspectData} />}
        </div>
      )}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <span style={{ fontSize: '0.72rem', color: '#475569' }}>
      <strong style={{ color: '#0f172a', fontWeight: 700 }}>{value}</strong> {label}
    </span>
  );
}

function Sep() {
  return <span style={{ fontSize: '0.72rem', color: '#e2e8f0' }}>·</span>;
}

// ─── All Projects (admin) ──────────────────────────────────────────────────────

export function AllProjects() {
  const { t } = useI18n();
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminListGenerated()
      .then(setProjects)
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{
        padding: '2rem', borderRadius: '10px',
        border: '1px dashed #e2e8f0', textAlign: 'center', background: '#fff',
      }}>
        <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>{t('projects.loading')}</p>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div style={{
        padding: '3rem 2rem', borderRadius: '12px',
        border: '1px dashed #e2e8f0', textAlign: 'center', background: '#fff',
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>◈</div>
        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>{t('projects.none')}</p>
        <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
          {t('projects.noneAdminDesc')}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
        <span style={{
          fontSize: '0.7rem', fontWeight: 700, color: '#64748b',
          background: '#f1f5f9', border: '1px solid #e2e8f0',
          padding: '0.2rem 0.6rem', borderRadius: '4px',
        }}>
          {projects.length !== 1 ? t('projects.projectCountPlural', { count: projects.length }) : t('projects.projectCount', { count: projects.length })} total
        </span>
      </div>
      {projects.map((p) => (
        <AdminProjectCard key={p.id} project={p} />
      ))}
    </div>
  );
}
