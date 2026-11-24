import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { uploadSchema } from '../api/client';
import { Engine } from '../types';
import { useI18n } from '../i18n/I18nContext';

export function UploadForm() {
  const { engine, setEngine, setJobId, setJob, setInspectData, activeTenant, requiresAuth, setRequiresAuth, hashAlgorithm, setHashAlgorithm } = useApp();
  const [file, setFile] = useState<File | null>(null);
  const [dbName, setDbName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !dbName.trim() || !activeTenant) return;

    setLoading(true);
    setError(null);
    setJob(null as any);
    setInspectData(null);

    try {
      const res = await uploadSchema(activeTenant.id, engine, dbName.trim(), file);
      setJobId(res.jobId);
    } catch (err: any) {
      setError(err.response?.data?.error ?? err.message);
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = !!file && !!dbName.trim() && !loading && !!activeTenant;

  return (
    <form onSubmit={handleSubmit} className="card" style={{ gap: '1rem' }}>
      <div>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.2rem' }}>
          {t('upload.title')}
        </h2>
        <p style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
          {t('upload.description')}
        </p>
      </div>

      <div className="field">
        <label>
          {t('upload.dbName')}
          <span style={{ color: '#94a3b8', fontWeight: 400, textTransform: 'none', marginLeft: '0.35rem', fontSize: '0.72rem' }}>
            {t('upload.dbNameHint')}
          </span>
        </label>
        <input
          type="text"
          value={dbName}
          onChange={(e) => setDbName(e.target.value)}
          placeholder={t('upload.dbNamePlaceholder')}
          disabled={loading}
          required
          style={{ fontSize: '0.88rem' }}
        />
      </div>

      <div className="field">
        <label>{t('upload.engine')}</label>
        <select
          value={engine}
          onChange={(e) => setEngine(e.target.value as Engine)}
          disabled={loading}
          style={{ fontSize: '0.88rem' }}
        >
          <option value="postgres">PostgreSQL</option>
          <option value="mysql">MySQL</option>
        </select>
      </div>

      <div className="field">
        <label>
          {t('upload.schemaFile')}
          <span style={{ color: '#94a3b8', fontWeight: 400, textTransform: 'none', marginLeft: '0.35rem', fontSize: '0.72rem' }}>
            {t('upload.schemaFileHint')}
          </span>
        </label>
        <input
          ref={inputRef}
          type="file"
          accept=".sql"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          disabled={loading}
        />
        {file && (
          <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
            {file.name} · {(file.size / 1024).toFixed(1)} KB
          </span>
        )}
      </div>

      {/* ── Auth options ── */}
      <div style={{
        borderTop: '1px solid #e2e8f0', paddingTop: '0.85rem',
        display: 'flex', flexDirection: 'column', gap: '0.65rem',
      }}>
        <label style={{
          display: 'flex', alignItems: 'center', gap: '0.55rem',
          cursor: 'pointer', userSelect: 'none',
          fontSize: '0.82rem', color: '#334155', fontWeight: 500,
        }}>
          <input
            type="checkbox"
            checked={requiresAuth}
            onChange={(e) => setRequiresAuth(e.target.checked)}
            disabled={loading}
            style={{ accentColor: '#2563eb', width: 15, height: 15 }}
          />
          {t('upload.requiresAuth')}
        </label>

        {requiresAuth && (
          <div className="field" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.75rem' }}>{t('upload.hashAlgorithm')}</label>
            <select
              value={hashAlgorithm}
              onChange={(e) => setHashAlgorithm(e.target.value)}
              disabled={loading}
              style={{ fontSize: '0.85rem' }}
            >
              <option value="bcrypt">bcrypt</option>
              <option value="sha256">SHA-256</option>
              <option value="sha1">SHA-1</option>
              <option value="md5">MD5</option>
              <option value="plain">{t('upload.hashPlain')}</option>
            </select>
          </div>
        )}
      </div>

      {!activeTenant && (
        <p style={{ margin: 0, fontSize: '0.78rem', color: '#f59e0b', background: '#451a03', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #92400e' }}>
          {t('tenant.selectRequired')}
        </p>
      )}
      {error && <p className="error">{error}</p>}

      <button
        type="submit"
        disabled={!canSubmit}
        style={{
          background: canSubmit ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : undefined,
          boxShadow: canSubmit ? '0 1px 6px rgba(37,99,235,0.35)' : undefined,
          alignSelf: 'stretch',
          padding: '0.6rem 1.25rem',
          fontSize: '0.875rem',
          letterSpacing: '0.01em',
        }}
      >
        {loading ? (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <Spinner /> {t('upload.deploying')}
          </span>
        ) : (
          t('upload.deploy')
        )}
      </button>
    </form>
  );
}

function Spinner() {
  return (
    <span style={{
      display: 'inline-block',
      width: 12, height: 12,
      border: '2px solid rgba(255,255,255,0.3)',
      borderTop: '2px solid #fff',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }} />
  );
}
