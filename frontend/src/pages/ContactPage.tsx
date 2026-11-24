import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppFooter } from '../components/AppFooter';
import { useI18n } from '../i18n/I18nContext';
import { LanguageSelector } from '../components/LanguageSelector';
import { api } from '../api/client';

// ─── Palette (matches LandingPage) ────────────────────────────────────────────
const BG     = '#030a14';
const BG2    = '#07101f';
const CARD   = '#0c1a2e';
const BORDER = '#1a2d45';
const BLUE   = '#3b82f6';
const BLUE_D = '#2563eb';
const T1     = '#f8fafc';
const T2     = '#94a3b8';
const T3     = '#475569';

// ─── Entry ────────────────────────────────────────────────────────────────────
export function ContactPage() {
  return (
    <div style={{ minHeight: '100vh', background: BG, color: T1, fontFamily: 'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <ContactNav />
      <ContactForm />
      <AppFooter />
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function ContactNav() {
  const { t } = useI18n();
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: 'rgba(3,10,20,0.82)',
      backdropFilter: 'blur(18px)',
      WebkitBackdropFilter: 'blur(18px)',
      borderBottom: `1px solid rgba(26,45,69,0.9)`,
      height: '3.75rem',
      display: 'flex', alignItems: 'center',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%', padding: '0 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
          <div style={{ width: 28, height: 28, borderRadius: '7px', background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.75rem', color: '#fff' }}>A</span>
          </div>
          <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.05rem', color: T1, letterSpacing: '-0.02em' }}>
            api<span style={{ color: BLUE }}>-dyn</span>
          </span>
        </Link>
        <div style={{ flex: 1 }} />
        <LanguageSelector />
        <Link to="/" style={{ fontSize: '0.8rem', color: T2, textDecoration: 'none', padding: '0.4rem 0.75rem', border: `1px solid ${BORDER}`, borderRadius: '6px' }}>
          {t('contact.back')}
        </Link>
      </div>
    </nav>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────
function ContactForm() {
  const { t } = useI18n();

  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !message.trim()) {
      setError(t('contact.errorRequired'));
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t('contact.errorEmail'));
      return;
    }

    setLoading(true);
    try {
      await api.post('/contact', { name, email, subject, message });
      setSuccess(true);
    } catch {
      setError(t('contact.errorGeneric'));
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setName(''); setEmail(''); setSubject(''); setMessage('');
    setSuccess(false); setError('');
  }

  return (
    <section style={{ paddingTop: '8rem', paddingBottom: '5rem', minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 560, padding: '0 1.5rem' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <span style={{
            display: 'inline-block', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: BLUE, background: 'rgba(59,130,246,0.1)',
            border: `1px solid rgba(59,130,246,0.25)`, borderRadius: '999px',
            padding: '0.25rem 0.85rem', marginBottom: '1.25rem',
          }}>
            {t('contact.badge')}
          </span>
          <h1 style={{ margin: '0 0 0.75rem', fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800, color: T1, lineHeight: 1.15 }}>
            {t('contact.title')}
          </h1>
          <p style={{ margin: 0, fontSize: '1rem', color: T2, lineHeight: 1.7, maxWidth: 440, marginInline: 'auto' }}>
            {t('contact.subtitle')}
          </p>
        </div>

        {/* Card */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '2rem' }}>

          {success ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
              <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', fontWeight: 700, color: '#22c55e' }}>
                {t('contact.successTitle')}
              </h2>
              <p style={{ margin: '0 0 1.5rem', color: T2, fontSize: '0.9rem', lineHeight: 1.6 }}>
                {t('contact.successDesc')}
              </p>
              <button onClick={reset} style={btnStyle(false)}>
                {t('contact.sendAnother')}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Field label={t('contact.name')}>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder={t('contact.namePlaceholder')}
                    style={inputStyle}
                    disabled={loading}
                  />
                </Field>
                <Field label={t('contact.email')}>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={t('contact.emailPlaceholder')}
                    style={inputStyle}
                    disabled={loading}
                  />
                </Field>
              </div>
              <Field label={t('contact.subject')}>
                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder={t('contact.subjectPlaceholder')}
                  style={inputStyle}
                  disabled={loading}
                />
              </Field>
              <Field label={t('contact.message')}>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder={t('contact.messagePlaceholder')}
                  rows={6}
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                  disabled={loading}
                />
              </Field>

              {error && (
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', padding: '0.6rem 0.85rem' }}>
                  {error}
                </p>
              )}

              <button type="submit" disabled={loading} style={btnStyle(loading)}>
                {loading ? t('contact.sending') : t('contact.send')}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: T2, letterSpacing: '0.02em' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: BG2,
  border: `1px solid ${BORDER}`,
  borderRadius: '7px',
  padding: '0.6rem 0.85rem',
  color: T1,
  fontSize: '0.875rem',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

function btnStyle(loading: boolean): React.CSSProperties {
  return {
    background: loading ? T3 : `linear-gradient(135deg, ${BLUE_D}, #7c3aed)`,
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.7rem 1.5rem',
    fontSize: '0.9rem',
    fontWeight: 700,
    cursor: loading ? 'not-allowed' : 'pointer',
    width: '100%',
  };
}
