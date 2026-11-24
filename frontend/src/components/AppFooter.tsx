import React from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';

export function AppFooter() {
  const { t } = useI18n();

  return (
    <footer style={{ borderTop: '1px solid #e2e8f0', background: '#fff' }}>
      <div style={{ padding: '2rem 2rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '2rem', flexWrap: 'wrap' }}>
        {/* Brand */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: 260 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 22, height: 22, borderRadius: '5px', background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.6rem', color: '#fff' }}>A</span>
            </div>
            <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', letterSpacing: '-0.02em' }}>
              api<span style={{ color: '#2563eb' }}>-dyn</span>
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', lineHeight: 1.6 }}>
            {t('footer.tagline')}
          </p>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
            &copy; {new Date().getFullYear()} api-dyn. {t('footer.rights')}
          </span>
        </div>

        {/* Link columns */}
        <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
          <FooterCol title={t('footer.platform')}>
            <FooterLink to="/health" label={t('footer.healthCheck')} />
            <FooterLink to="/lambda" label={t('footer.lambdaService')} />
            <FooterLink to="/contact" label={t('footer.contact')} />
          </FooterCol>
          <FooterCol title={t('footer.resources')}>
            <FooterLink href="http://localhost:3000/api-docs" label={t('footer.apiReference')} />
            <FooterLink href="http://localhost:4000/docs" label={t('footer.lambdaDocs')} />
          </FooterCol>
          <FooterCol title={t('footer.stack')}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>TypeScript · Express</span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>BullMQ · Redis</span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>PostgreSQL · MySQL</span>
          </FooterCol>
        </div>
      </div>

      <div style={{ borderTop: '1px solid #f1f5f9', padding: '0.65rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>
          {t('footer.builtWith')}
        </span>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.1rem' }}>
        {title}
      </span>
      {children}
    </div>
  );
}

function FooterLink({ href, to, label }: { href?: string; to?: string; label: string }) {
  const s: React.CSSProperties = { fontSize: '0.75rem', color: '#64748b', textDecoration: 'none' };
  const onEnter = (e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.color = '#2563eb'; };
  const onLeave = (e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.color = '#64748b'; };
  if (to) {
    return <Link to={to} style={s} onMouseEnter={onEnter} onMouseLeave={onLeave}>{label}</Link>;
  }
  return <a href={href} target="_blank" rel="noopener noreferrer" style={s} onMouseEnter={onEnter} onMouseLeave={onLeave}>{label}</a>;
}
