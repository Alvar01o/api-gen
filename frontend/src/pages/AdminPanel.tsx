import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminListUsers, adminListJobs, adminListGenerated } from '../api/client';
import { SchemaJob } from '../types';
import { useI18n } from '../i18n/I18nContext';
import { LanguageSelector } from '../components/LanguageSelector';

type Tab = 'users' | 'jobs' | 'apis';

export function AdminPanel() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('users');
  const { t } = useI18n();

  const [users, setUsers]   = useState<any[]>([]);
  const [jobs, setJobs]     = useState<SchemaJob[]>([]);
  const [apis, setApis]     = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    loadTab(tab);
  }, [tab]);

  async function loadTab(t: Tab) {
    setLoading(true);
    setError(null);
    try {
      if (t === 'users')   setUsers(await adminListUsers());
      if (t === 'jobs')    setJobs(await adminListJobs());
      if (t === 'apis')    setApis(await adminListGenerated());
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e.message);
    } finally {
      setLoading(false);
    }
  }

  const STATUS_COLOR: Record<string, string> = {
    success: '#16a34a', failed: '#dc2626', running: '#d97706', queued: '#64748b',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#1e293b', padding: '0.75rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid #334155' }}>
        <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.1rem', color: '#f8fafc' }}>api-dyn</span>
        <span style={{ background: '#7c3aed', color: '#fff', fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '4px' }}>ADMIN</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>{user?.email}</span>
          <LanguageSelector variant="dark" />
          <button onClick={() => navigate('/app')} style={btnStyle('#334155')}>{t('admin.dashboard')}</button>
          <button onClick={() => { logout(); navigate('/login'); }} style={btnStyle('#b91c1c')}>{t('admin.logout')}</button>
        </div>
      </div>

      <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
        <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.2rem', color: '#f8fafc' }}>{t('admin.title')}</h2>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {(['users', 'jobs', 'apis'] as Tab[]).map(tabKey => (
            <button key={tabKey} onClick={() => setTab(tabKey)} style={{
              padding: '0.4rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem',
              background: tab === tabKey ? '#3b82f6' : '#1e293b', color: tab === tabKey ? '#fff' : '#94a3b8',
            }}>
              {tabKey === 'users' ? t('admin.users') : tabKey === 'jobs' ? t('admin.jobs') : t('admin.apis')}
            </button>
          ))}
        </div>

        {error && <div style={{ padding: '0.75rem', background: '#fef2f2', color: '#b91c1c', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}
        {loading && <p style={{ color: '#64748b' }}>{t('admin.loading')}</p>}

        {/* Users table */}
        {!loading && tab === 'users' && (
          <Table
            cols={[t('admin.name'), t('admin.email'), t('admin.role'), t('admin.created')]}
            rows={users.map(u => [
              u.name,
              u.email,
              <Badge color={u.role === 'admin' ? '#7c3aed' : '#0f766e'}>{u.role}</Badge>,
              fmt(u.createdAt),
            ])}
            noRecords={t('admin.noRecords')}
          />
        )}

        {/* Jobs table */}
        {!loading && tab === 'jobs' && (
          <Table
            cols={[t('admin.id'), t('admin.engine'), t('admin.dbName'), t('admin.status'), t('admin.progress'), t('admin.created')]}
            rows={jobs.map(j => [
              <code style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{j.id.slice(0, 8)}…</code>,
              j.engine,
              j.dbName,
              <Badge color={STATUS_COLOR[j.status] ?? '#64748b'}>{j.status}</Badge>,
              `${j.progress}%`,
              fmt(j.createdAt),
            ])}
            noRecords={t('admin.noRecords')}
          />
        )}

        {/* APIs table */}
        {!loading && tab === 'apis' && (
          <Table
            cols={[t('admin.engine'), t('admin.dbName'), t('admin.routes'), t('admin.created')]}
            rows={apis.map(a => [
              a.engine,
              a.dbName,
              `${a.routes?.length ?? 0} routes`,
              fmt(a.createdAt),
            ])}
            noRecords={t('admin.noRecords')}
          />
        )}
      </div>
    </div>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString();
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{ background: color, color: '#fff', fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
      {children}
    </span>
  );
}

function Table({ cols, rows, noRecords }: { cols: string[]; rows: React.ReactNode[][]; noRecords: string }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
        <thead>
          <tr style={{ background: '#1e293b', borderBottom: '1px solid #334155' }}>
            {cols.map(c => (
              <th key={c} style={{ textAlign: 'left', padding: '0.6rem 0.8rem', color: '#94a3b8', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={cols.length} style={{ padding: '1.5rem', textAlign: 'center', color: '#475569' }}>{noRecords}</td></tr>
          )}
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #1e293b', background: i % 2 ? '#0f172a' : 'transparent' }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: '0.55rem 0.8rem', verticalAlign: 'middle' }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function btnStyle(bg: string): React.CSSProperties {
  return { padding: '0.3rem 0.85rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem', background: bg, color: '#e2e8f0' };
}
