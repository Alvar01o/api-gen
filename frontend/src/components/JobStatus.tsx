import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { getJob, inspectSchema } from '../api/client';
import { InspectResponse } from '../types';
import { useI18n } from '../i18n/I18nContext';

const POLL_INTERVAL = 2000;

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  queued:  { color: '#92400e', bg: '#fef3c7' },
  running: { color: '#1e40af', bg: '#dbeafe' },
  success: { color: '#065f46', bg: '#d1fae5' },
  failed:  { color: '#991b1b', bg: '#fee2e2' },
};

const STAGES = ['validating', 'creating-db', 'applying-schema', 'completed'];

export function JobStatus() {
  const { jobId, job, setJob, engine, inspectData, setInspectData, activeTenant } = useApp();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    if (!jobId) return;

    const poll = async () => {
      try {
        const updated = await getJob(activeTenant!.id, jobId);
        setJob(updated);
        if (updated.status === 'success' || updated.status === 'failed') {
          clearInterval(timerRef.current!);
        }
      } catch {
        // ignore transient errors
      }
    };

    poll();
    timerRef.current = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(timerRef.current!);
  }, [jobId]);

  async function handleInspect() {
    if (!job) return;
    try {
      const data = await inspectSchema(activeTenant!.id, engine, job.dbName);
      setInspectData(data as InspectResponse);
    } catch (err: any) {
      alert(err.response?.data?.error ?? err.message);
    }
  }

  if (!jobId) {
    return (
      <div className="card" style={{ gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.2rem' }}>
            {t('job.emptyTitle')}
          </h2>
          <p style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
            {t('job.emptyDesc')}
          </p>
        </div>
        <div style={{
          padding: '1.5rem', borderRadius: '8px', background: '#f8fafc',
          border: '1px dashed #cbd5e1', textAlign: 'center',
        }}>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>
            {t('job.noJob')}
          </p>
        </div>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[job?.status ?? 'queued'];
  const statusLabel = t(`job.status.${job?.status ?? 'queued'}`);
  const currentStageIdx = STAGES.indexOf(job?.stage ?? '');

  return (
    <div className="card" style={{ gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.2rem' }}>
            {t('job.title')}
          </h2>
          {job && (
            <code style={{ fontSize: '0.7rem', color: '#94a3b8', background: 'none', padding: 0 }}>
              {job.id}
            </code>
          )}
        </div>
        {job && (
          <span style={{
            fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem',
            borderRadius: '20px', background: statusCfg.bg, color: statusCfg.color,
            flexShrink: 0, letterSpacing: '0.03em',
          }}>
            {statusLabel}
          </span>
        )}
      </div>

      {!job ? (
        <p className="muted">{t('job.connecting')}</p>
      ) : (
        <>
          {/* Database info */}
          {job.dbName && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{t('job.target')}</span>
              <code style={{ fontSize: '0.78rem' }}>{job.dbName}</code>
              <span style={{
                fontSize: '0.65rem', fontWeight: 700, color: '#2563eb',
                background: '#eff6ff', padding: '0.1rem 0.4rem', borderRadius: '3px',
              }}>
                {engine.toUpperCase()}
              </span>
            </div>
          )}

          {/* Stage pipeline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {STAGES.map((stage, i) => {
              const isDone = job.status === 'success' || currentStageIdx > i;
              const isCurrent = currentStageIdx === i && job.status === 'running';
              const isFailed = job.status === 'failed' && currentStageIdx === i;

              const dotColor = isFailed ? '#dc2626' : isDone ? '#16a34a' : isCurrent ? '#2563eb' : '#e2e8f0';
              const lineColor = isDone ? '#16a34a' : '#e2e8f0';

              return (
                <div key={stage} style={{ display: 'flex', alignItems: 'center', flex: i < STAGES.length - 1 ? 1 : 'none' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: dotColor,
                      boxShadow: isCurrent ? `0 0 0 3px rgba(37,99,235,0.2)` : undefined,
                      transition: 'background 0.3s',
                    }} />
                    <span style={{
                      fontSize: '0.6rem', color: isCurrent ? '#2563eb' : isDone ? '#16a34a' : '#94a3b8',
                      fontWeight: isCurrent ? 700 : 500, whiteSpace: 'nowrap',
                    }}>
                      {stage.replace(/-/g, ' ')}
                    </span>
                  </div>
                  {i < STAGES.length - 1 && (
                    <div style={{ flex: 1, height: 2, background: lineColor, margin: '0 2px', marginBottom: '0.9rem', transition: 'background 0.3s' }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{t('job.progress')}</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569' }}>{job.progress}%</span>
            </div>
            <div className="progress-bar" style={{ height: 8, borderRadius: 4 }}>
              <div
                className="progress-fill"
                style={{
                  width: `${job.progress}%`,
                  background: job.status === 'failed' ? '#dc2626'
                    : job.status === 'success' ? '#16a34a'
                    : 'linear-gradient(90deg, #2563eb, #7c3aed)',
                  borderRadius: 4,
                }}
              />
            </div>
          </div>

          {/* Actions */}
          {job.status === 'success' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.78rem', color: '#065f46', background: '#f0fdf4', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                {t('job.success', { name: job.dbName })}
              </div>
              <button
                onClick={handleInspect}
                style={{
                  background: inspectData ? '#475569' : 'linear-gradient(135deg, #0f766e, #0d9488)',
                  alignSelf: 'stretch',
                  padding: '0.55rem 1rem',
                  fontSize: '0.85rem',
                }}
              >
                {inspectData ? t('job.reloadGraph') : t('job.inspectSchema')}
              </button>
            </div>
          )}

          {job.status === 'failed' && job.error && (
            <p className="error">{job.error}</p>
          )}

          {/* Inspect summary */}
          {inspectData && (
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', display: 'flex', gap: '1rem' }}>
              <Stat label={t('job.tables')} value={String(inspectData.tables)} />
              <Stat label={t('job.cycles')} value={inspectData.cyclic ? t('job.yes') : t('job.no')} color={inspectData.cyclic ? '#dc2626' : '#16a34a'} />
              <Stat label={t('job.engine')} value={inspectData.engine} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
      <span style={{ fontSize: '0.67rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: color ?? '#0f172a' }}>{value}</span>
    </div>
  );
}
