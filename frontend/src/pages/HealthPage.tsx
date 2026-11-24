import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';
import { LanguageSelector } from '../components/LanguageSelector';

interface ServiceCheck {
  name: string;
  status: 'ok' | 'error' | 'checking';
  latency?: number;
}

interface HealthState {
  overall: 'ok' | 'error' | 'checking';
  latency: number | null;
  checkedAt: Date | null;
  api: 'ok' | 'error' | 'checking';
}

const API_BASE = 'http://localhost:3000';

export function HealthPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [health, setHealth] = useState<HealthState>({
    overall: 'checking',
    latency: null,
    checkedAt: null,
    api: 'checking',
  });
  const [refreshing, setRefreshing] = useState(false);

  const check = useCallback(async () => {
    setRefreshing(true);
    setHealth(h => ({ ...h, overall: 'checking', api: 'checking' }));

    const t0 = performance.now();
    try {
      const res = await fetch(`${API_BASE}/health`);
      const latency = Math.round(performance.now() - t0);
      const data = await res.json();
      const ok = res.ok && data?.status === 'ok';
      setHealth({
        overall: ok ? 'ok' : 'error',
        api: ok ? 'ok' : 'error',
        latency,
        checkedAt: new Date(),
      });
    } catch {
      setHealth({
        overall: 'error',
        api: 'error',
        latency: null,
        checkedAt: new Date(),
      });
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [check]);

  const services: ServiceCheck[] = [
    { name: t('health.restApi'), status: health.api, latency: health.latency ?? undefined },
  ];

  const isOk = health.overall === 'ok';
  const isChecking = health.overall === 'checking';

  return (
    <div style={{ minHeight: '100vh', background: '#0b1120', display: 'flex', flexDirection: 'column' }}>

      {/* Navbar */}
      <nav style={{
        background: '#0f172a', borderBottom: '1px solid #1e293b',
        height: '3.5rem', display: 'flex', alignItems: 'center',
        padding: '0 1.5rem', gap: '1rem',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#475569', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.3rem 0.6rem', borderRadius: '6px', lineHeight: 1, alignSelf: 'center',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.color = '#94a3b8'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569'; }}
        >
          {t('health.back')}
        </button>
        <span style={{ width: 1, height: 16, background: '#1e293b' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            width: 24, height: 24, borderRadius: '6px',
            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.65rem', color: '#fff' }}>A</span>
          </div>
          <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.95rem', color: '#f8fafc', letterSpacing: '-0.02em' }}>
            api<span style={{ color: '#3b82f6' }}>-dyn</span>
          </span>
          <span style={{ color: '#334155', fontSize: '0.75rem' }}>{'/ '}{t('health.systemStatus')}</span>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <LanguageSelector variant="dark" />
        </div>
      </nav>

      {/* Hero */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 1.5rem 2.5rem', textAlign: 'center' }}>

        {/* Status indicator */}
        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
          {/* Pulse ring */}
          {!isChecking && (
            <div style={{
              position: 'absolute', inset: -10, borderRadius: '50%',
              border: `2px solid ${isOk ? '#22c55e' : '#ef4444'}`,
              opacity: 0.4,
              animation: 'pulse-ring 2s ease-out infinite',
            }} />
          )}
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: isChecking ? '#1e293b' : isOk ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
            border: `2px solid ${isChecking ? '#334155' : isOk ? '#22c55e' : '#ef4444'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem',
            transition: 'all 0.4s ease',
          }}>
            {isChecking ? '⟳' : isOk ? '✓' : '✕'}
          </div>
        </div>

        <h1 style={{
          margin: 0, fontSize: '2rem', fontWeight: 800,
          color: isChecking ? '#64748b' : isOk ? '#f8fafc' : '#fca5a5',
          letterSpacing: '-0.03em',
        }}>
          {isChecking ? t('health.checking') : isOk ? t('health.allOk') : t('health.disruption')}
        </h1>

        <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: '#475569', maxWidth: 400 }}>
          {health.checkedAt
            ? t('health.lastChecked', { time: health.checkedAt.toLocaleTimeString() })
            : t('health.diagnosing')}
        </p>

        {/* Refresh button */}
        <button
          onClick={check}
          disabled={refreshing}
          style={{
            marginTop: '1.25rem',
            padding: '0.45rem 1.1rem', borderRadius: '8px',
            border: '1px solid #1e293b', background: '#0f172a',
            color: refreshing ? '#334155' : '#64748b', cursor: refreshing ? 'not-allowed' : 'pointer',
            fontSize: '0.78rem', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: '0.4rem',
          }}
        >
          <span style={{ display: 'inline-block', animation: refreshing ? 'spin 1s linear infinite' : 'none' }}>⟳</span>
          {t('health.refresh')}
        </button>
      </div>

      {/* Services grid */}
      <div style={{ maxWidth: 700, width: '100%', margin: '0 auto', padding: '0 1.5rem 4rem' }}>

        <div style={{
          fontSize: '0.65rem', fontWeight: 700, color: '#334155',
          textTransform: 'uppercase', letterSpacing: '0.1em',
          marginBottom: '0.75rem',
        }}>
          {t('health.services')}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {services.map(svc => (
            <ServiceRow key={svc.name} service={svc} />
          ))}
        </div>

        {/* Latency bar */}
        {health.latency !== null && (
          <div style={{ marginTop: '2rem' }}>
            <div style={{
              fontSize: '0.65rem', fontWeight: 700, color: '#334155',
              textTransform: 'uppercase', letterSpacing: '0.1em',
              marginBottom: '0.75rem',
            }}>
              {t('health.responseTime')}
            </div>
            <LatencyBar latency={health.latency} />
          </div>
        )}

        {/* Meta info */}
        <div style={{
          marginTop: '2rem', padding: '1rem 1.25rem',
          background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px',
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem',
        }}>
          <MetaStat label={t('health.endpoint')} value="GET /health" mono />
          <MetaStat label={t('health.environment')} value="production" />
          <MetaStat label={t('health.version')} value="v1.0" />
        </div>
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes pulse-ring {
          0%   { transform: scale(1);   opacity: 0.4; }
          100% { transform: scale(1.5); opacity: 0;   }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ServiceRow({ service }: { service: ServiceCheck }) {
  const { t } = useI18n();
  const isOk = service.status === 'ok';
  const isChecking = service.status === 'checking';

  const dotColor = isChecking ? '#475569' : isOk ? '#22c55e' : '#ef4444';
  const labelColor = isChecking ? '#475569' : isOk ? '#22c55e' : '#ef4444';
  const statusLabel = isChecking ? t('health.checking2') : isOk ? t('health.operational') : t('health.degraded');

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0.85rem 1.1rem',
      background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Dot */}
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: dotColor,
          boxShadow: !isChecking ? `0 0 6px ${dotColor}` : 'none',
        }} />
        <span style={{ fontSize: '0.875rem', color: '#e2e8f0', fontWeight: 500 }}>{service.name}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {service.latency !== undefined && (
          <span style={{ fontSize: '0.75rem', color: '#475569', fontFamily: 'monospace' }}>
            {service.latency} ms
          </span>
        )}
        <span style={{
          fontSize: '0.72rem', fontWeight: 600, color: labelColor,
          background: `${dotColor}18`,
          padding: '0.2rem 0.6rem', borderRadius: '20px',
          border: `1px solid ${dotColor}30`,
        }}>
          {statusLabel}
        </span>
      </div>
    </div>
  );
}

function LatencyBar({ latency }: { latency: number }) {
  const { t } = useI18n();
  const max = 2000;
  const pct = Math.min((latency / max) * 100, 100);
  const color = latency < 100 ? '#22c55e' : latency < 400 ? '#f59e0b' : '#ef4444';
  const label = latency < 100 ? t('health.excellent') : latency < 400 ? t('health.good') : t('health.slow');

  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '1rem 1.1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
        <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontFamily: 'monospace' }}>{latency} ms</span>
        <span style={{ fontSize: '0.72rem', color, fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ height: 6, background: '#1e293b', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: `linear-gradient(90deg, #22c55e, ${color})`,
          borderRadius: 3,
          transition: 'width 0.6s ease',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
        <span style={{ fontSize: '0.6rem', color: '#334155' }}>0 ms</span>
        <span style={{ fontSize: '0.6rem', color: '#334155' }}>2000 ms</span>
      </div>
    </div>
  );
}

function MetaStat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: '0.6rem', color: '#334155', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '0.78rem', color: '#64748b', fontFamily: mono ? 'monospace' : 'inherit' }}>
        {value}
      </div>
    </div>
  );
}
