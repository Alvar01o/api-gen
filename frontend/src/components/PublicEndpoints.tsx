import { useEffect, useState } from 'react';
import { listEndpoints, toggleEndpoint, bulkToggleEndpoints } from '../api/client';
import { PublicEndpoint } from '../types';
import { useI18n } from '../i18n/I18nContext';

interface Props {
  tenantId: string;
  projectId: string;
  onClose: () => void;
}

const METHOD_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  GET:    { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  POST:   { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  PUT:    { color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  DELETE: { color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  PATCH:  { color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
};

export function PublicEndpoints({ tenantId, projectId, onClose }: Props) {
  const { t } = useI18n();
  const [endpoints, setEndpoints] = useState<PublicEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    listEndpoints(tenantId, projectId)
      .then(setEndpoints)
      .catch(() => setEndpoints([]))
      .finally(() => setLoading(false));
  }, [tenantId, projectId]);

  async function handleToggle(ep: PublicEndpoint) {
    setSaving((prev) => new Set(prev).add(ep.id));
    try {
      const updated = await toggleEndpoint(tenantId, projectId, ep.id, !ep.isPublic);
      setEndpoints((prev) => prev.map((e) => (e.id === ep.id ? updated : e)));
    } finally {
      setSaving((prev) => { const s = new Set(prev); s.delete(ep.id); return s; });
    }
  }

  async function handleBulk(isPublic: boolean) {
    setBulkSaving(true);
    try {
      await bulkToggleEndpoints(tenantId, projectId, isPublic);
      setEndpoints((prev) => prev.map((e) => ({ ...e, isPublic })));
    } finally {
      setBulkSaving(false);
    }
  }

  const publicCount = endpoints.filter((e) => e.isPublic).length;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: '12px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        width: '100%', maxWidth: '680px', maxHeight: '85vh',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
        }}>
          <span style={{ fontSize: '1.1rem' }}>🔓</span>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
              {t('endpoints.title')}
            </h3>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
              {t('endpoints.subtitle', { public: publicCount, total: endpoints.length })}
            </p>
          </div>

          {/* Bulk actions */}
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              onClick={() => handleBulk(true)}
              disabled={bulkSaving}
              style={{
                fontSize: '0.72rem', fontWeight: 600, padding: '0.3rem 0.65rem',
                border: '1px solid #bbf7d0', borderRadius: '5px',
                background: '#f0fdf4', color: '#16a34a', cursor: 'pointer',
              }}
            >
              {t('endpoints.allPublic')}
            </button>
            <button
              onClick={() => handleBulk(false)}
              disabled={bulkSaving}
              style={{
                fontSize: '0.72rem', fontWeight: 600, padding: '0.3rem 0.65rem',
                border: '1px solid #fecaca', borderRadius: '5px',
                background: '#fef2f2', color: '#dc2626', cursor: 'pointer',
              }}
            >
              {t('endpoints.allPrivate')}
            </button>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '1.1rem', color: '#94a3b8', padding: '0.1rem',
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ overflow: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
              {t('endpoints.loading')}
            </div>
          ) : endpoints.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
              {t('endpoints.none')}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {t('endpoints.colMethod')}
                  </th>
                  <th style={{ padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {t('endpoints.colRoute')}
                  </th>
                  <th style={{ padding: '0.6rem 1rem', textAlign: 'center', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {t('endpoints.colPublic')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {endpoints.map((ep) => {
                  const mc = METHOD_COLORS[ep.method] ?? { color: '#475569', bg: '#f8fafc', border: '#e2e8f0' };
                  const isSaving = saving.has(ep.id);
                  return (
                    <tr key={ep.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.55rem 1rem' }}>
                        <span style={{
                          fontSize: '0.68rem', fontWeight: 700, fontFamily: 'monospace',
                          color: mc.color, background: mc.bg,
                          border: `1px solid ${mc.border}`,
                          padding: '0.15rem 0.4rem', borderRadius: '3px',
                        }}>
                          {ep.method}
                        </span>
                      </td>
                      <td style={{ padding: '0.55rem 1rem', fontFamily: 'monospace', fontSize: '0.8rem', color: '#334155' }}>
                        {ep.route}
                      </td>
                      <td style={{ padding: '0.55rem 1rem', textAlign: 'center' }}>
                        <button
                          onClick={() => handleToggle(ep)}
                          disabled={isSaving}
                          title={ep.isPublic ? t('endpoints.makePrivate') : t('endpoints.makePublic')}
                          style={{
                            width: 40, height: 22, borderRadius: 11,
                            border: 'none', cursor: isSaving ? 'wait' : 'pointer',
                            background: ep.isPublic ? '#22c55e' : '#e2e8f0',
                            transition: 'background 0.2s',
                            position: 'relative',
                            opacity: isSaving ? 0.6 : 1,
                          }}
                        >
                          <span style={{
                            position: 'absolute', top: 3,
                            left: ep.isPublic ? 21 : 3,
                            width: 16, height: 16, borderRadius: '50%',
                            background: '#fff',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                            transition: 'left 0.2s',
                          }} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
