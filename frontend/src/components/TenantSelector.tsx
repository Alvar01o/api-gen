import React, { useEffect, useState } from 'react';
import { Tenant } from '../types';
import { listTenants, createTenant, deleteTenant } from '../api/client';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/I18nContext';

export function TenantSelector() {
  const { activeTenant, setActiveTenant } = useApp();
  const { t } = useI18n();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTenants()
      .then((list) => {
        setTenants(list);
        if (list.length > 0 && !activeTenant) {
          setActiveTenant(list[0]);
        }
      })
      .catch(() => setTenants([]))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const tenant = await createTenant(newName.trim());
      setTenants((prev) => [tenant, ...prev]);
      setActiveTenant(tenant);
      setNewName('');
      setShowForm(false);
    } catch (err: any) {
      setError(err.response?.data?.error ?? err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(tenant: Tenant) {
    if (!confirm(t('tenant.confirmDelete', { name: tenant.name }))) return;
    try {
      await deleteTenant(tenant.id);
      const next = tenants.filter((t) => t.id !== tenant.id);
      setTenants(next);
      if (activeTenant?.id === tenant.id) {
        setActiveTenant(next[0] ?? null);
      }
    } catch {
      // ignore
    }
  }

  return (
    <div style={{ padding: '0.75rem 0.6rem 0' }}>
      {/* Section label */}
      <div style={{ padding: '0 0.5rem 0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: '0.62rem', fontWeight: 700, color: '#334155',
          textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>
          {t('tenant.projects')}
        </span>
        <button
          onClick={() => setShowForm((v) => !v)}
          title={t('tenant.new')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#475569', fontSize: '0.9rem', lineHeight: 1, padding: '0 0.15rem',
          }}
        >
          +
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} style={{ padding: '0 0.5rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('tenant.namePlaceholder')}
            disabled={creating}
            style={{
              fontSize: '0.75rem', padding: '0.35rem 0.5rem',
              borderRadius: '5px', border: '1px solid #334155',
              background: '#1e293b', color: '#e2e8f0', outline: 'none',
            }}
          />
          {error && <span style={{ fontSize: '0.65rem', color: '#fca5a5' }}>{error}</span>}
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              style={{
                flex: 1, fontSize: '0.72rem', padding: '0.3rem',
                borderRadius: '5px', border: 'none', cursor: 'pointer',
                background: '#2563eb', color: '#fff', fontWeight: 600,
              }}
            >
              {creating ? '…' : t('tenant.create')}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setNewName(''); setError(null); }}
              style={{
                fontSize: '0.72rem', padding: '0.3rem 0.6rem',
                borderRadius: '5px', border: '1px solid #334155',
                background: 'transparent', color: '#94a3b8', cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        </form>
      )}

      {/* Tenant list */}
      {loading ? (
        <div style={{ padding: '0.5rem', fontSize: '0.72rem', color: '#475569' }}>{t('tenant.loading')}</div>
      ) : tenants.length === 0 ? (
        <div style={{ padding: '0.5rem 0.5rem', fontSize: '0.72rem', color: '#334155' }}>
          {t('tenant.none')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
          {tenants.map((tenant) => {
            const active = activeTenant?.id === tenant.id;
            return (
              <div
                key={tenant.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.45rem 0.6rem',
                  borderRadius: '7px',
                  background: active ? '#1e3a5f' : 'transparent',
                  border: active ? '1px solid rgba(59,130,246,0.25)' : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onClick={() => setActiveTenant(tenant)}
                onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = '#1e293b'; }}
                onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <span style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                  background: active ? '#3b82f6' : '#334155',
                }} />
                <span style={{
                  flex: 1, minWidth: 0,
                  fontSize: '0.78rem', fontWeight: active ? 600 : 400,
                  color: active ? '#e2e8f0' : '#94a3b8',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {tenant.name}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(tenant); }}
                  title={t('tenant.delete')}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#475569', fontSize: '0.7rem', padding: '0 0.1rem',
                    opacity: 0, flexShrink: 0,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
