import React, { useState } from 'react';
import { useI18n, Lang } from '../i18n/I18nContext';

const LANGUAGES: { code: Lang; label: string; flag: string }[] = [
  { code: 'en', label: 'English',    flag: '🇺🇸' },
  { code: 'es', label: 'Español',    flag: '🇪🇸' },
  { code: 'fr', label: 'Français',   flag: '🇫🇷' },
  { code: 'pt', label: 'Português',  flag: '🇧🇷' },
];

interface Props {
  /** 'dark' = for dark navbars (Dashboard, Health, Lambda), 'light' = for light navbars (Landing) */
  variant?: 'dark' | 'light';
}

export function LanguageSelector({ variant = 'dark' }: Props) {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);

  const current = LANGUAGES.find(l => l.code === lang)!;

  const isDark = variant === 'dark';
  const btnBg      = isDark ? '#1e293b' : 'rgba(255,255,255,0.08)';
  const btnColor   = isDark ? '#94a3b8' : 'rgba(255,255,255,0.75)';
  const btnBorder  = isDark ? '#334155' : 'rgba(255,255,255,0.15)';
  const dropBg     = isDark ? '#1e293b' : '#0f172a';
  const dropBorder = isDark ? '#334155' : '#1e293b';
  const itemHover  = isDark ? '#0f172a' : '#1e293b';

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.35rem',
          padding: '0.28rem 0.65rem',
          borderRadius: '6px', border: `1px solid ${btnBorder}`,
          background: btnBg, color: btnColor,
          cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
          userSelect: 'none',
        }}
      >
        <span style={{ fontSize: '0.9rem', lineHeight: 1 }}>{current.flag}</span>
        <span style={{ letterSpacing: '0.01em' }}>{current.code.toUpperCase()}</span>
        <span style={{ fontSize: '0.6rem', opacity: 0.6, marginLeft: '0.1rem' }}>▾</span>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 99 }}
            onClick={() => setOpen(false)}
          />
          {/* Dropdown */}
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0,
            background: dropBg, border: `1px solid ${dropBorder}`,
            borderRadius: '8px', minWidth: 140,
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            zIndex: 100, overflow: 'hidden',
          }}>
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                onClick={() => { setLang(l.code); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.6rem',
                  width: '100%', padding: '0.55rem 0.85rem',
                  border: 'none', background: lang === l.code ? itemHover : 'transparent',
                  color: lang === l.code ? '#f8fafc' : '#94a3b8',
                  cursor: 'pointer', fontSize: '0.8rem', textAlign: 'left',
                  fontWeight: lang === l.code ? 700 : 400,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (lang !== l.code) e.currentTarget.style.background = itemHover; }}
                onMouseLeave={e => { if (lang !== l.code) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ fontSize: '1rem' }}>{l.flag}</span>
                <span>{l.label}</span>
                {lang === l.code && <span style={{ marginLeft: 'auto', color: '#3b82f6', fontSize: '0.7rem' }}>✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
