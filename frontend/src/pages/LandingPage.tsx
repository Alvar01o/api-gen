import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AppFooter } from '../components/AppFooter';
import { useI18n } from '../i18n/I18nContext';
import { LanguageSelector } from '../components/LanguageSelector';

// ─── Palette ──────────────────────────────────────────────────────────────────
const BG     = '#030a14';
const BG2    = '#07101f';
const CARD   = '#0c1a2e';
const BORDER = '#1a2d45';
const BLUE   = '#3b82f6';
const BLUE_L = '#60a5fa';
const BLUE_D = '#2563eb';
const PURPLE = '#8b5cf6';
const GREEN  = '#22c55e';
const CYAN   = '#06b6d4';
const YELLOW = '#f59e0b';
const RED    = '#ef4444';
const T1     = '#f8fafc';
const T2     = '#94a3b8';
const T3     = '#475569';

// ─── Entry ────────────────────────────────────────────────────────────────────
export function LandingPage() {
  const { isAuthenticated } = useAuth();
  return (
    <div style={{ minHeight: '100vh', background: BG, color: T1, fontFamily: 'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', overflowX: 'hidden' }}>
      <LandingNav isAuthenticated={isAuthenticated} />
      <HeroSection isAuthenticated={isAuthenticated} />
      <StatsBar />
      <FeaturesSection />
      <HowItWorksSection />
      <LambdaCallout />
      <CtaSection isAuthenticated={isAuthenticated} />
      <AppFooter />
      <style>{GLOBAL_CSS}</style>
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function LandingNav({ isAuthenticated }: { isAuthenticated: boolean }) {
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
      <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%', padding: '0 1.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        {/* Brand */}
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.55rem', marginRight: '1.5rem' }}>
          <div style={{ width: 28, height: 28, borderRadius: '7px', background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.75rem', color: '#fff' }}>A</span>
          </div>
          <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.05rem', color: T1, letterSpacing: '-0.02em' }}>
            api<span style={{ color: BLUE }}>-dyn</span>
          </span>
        </Link>

        {/* Nav links */}
        <div style={{ display: 'flex', gap: '0.15rem' }}>
          {([
            { label: t('landing.features'),    href: '#features' },
            { label: t('landing.howItWorks'),   href: '#how-it-works' },
            { label: t('landing.lambda'),       to: '/lambda' },
            { label: t('landing.health'),       to: '/health' },
            { label: t('contact.badge'),        to: '/contact' },
          ] as Array<{ label: string; href?: string; to?: string }>).map(item =>
            item.to
              ? <NavLinkInternal key={item.label} to={item.to}>{item.label}</NavLinkInternal>
              : <NavAnchor key={item.label} href={item.href!}>{item.label}</NavAnchor>
          )}
        </div>

        {/* CTAs */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <LanguageSelector variant="light" />
          {isAuthenticated
            ? <Link to="/app" style={primarySmBtn}>{t('landing.dashboard')}</Link>
            : <>
                <Link to="/login"    style={ghostSmBtn}>{t('landing.signIn')}</Link>
                <Link to="/register" style={primarySmBtn}>{t('landing.register')}</Link>
              </>
          }
        </div>
      </div>
    </nav>
  );
}

function NavLinkInternal({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} style={{ padding: '0.35rem 0.75rem', borderRadius: 7, fontSize: '0.82rem', color: T3, textDecoration: 'none', fontWeight: 500 }}
      onMouseEnter={e => { e.currentTarget.style.color = T2; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
      onMouseLeave={e => { e.currentTarget.style.color = T3; e.currentTarget.style.background = 'transparent'; }}>
      {children}
    </Link>
  );
}

function NavAnchor({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} style={{ padding: '0.35rem 0.75rem', borderRadius: 7, fontSize: '0.82rem', color: T3, textDecoration: 'none', fontWeight: 500 }}
      onMouseEnter={e => { e.currentTarget.style.color = T2; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
      onMouseLeave={e => { e.currentTarget.style.color = T3; e.currentTarget.style.background = 'transparent'; }}>
      {children}
    </a>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function HeroSection({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { t } = useI18n();
  return (
    <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 'calc(3.75rem + 5rem) 1.5rem 5rem', position: 'relative', overflow: 'hidden' }}>
      {/* Radial glow */}
      <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)', width: 900, height: 700, background: 'radial-gradient(ellipse at center,rgba(37,99,235,0.13) 0%,rgba(124,58,237,0.07) 45%,transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '60%', right: '-10%', width: 500, height: 500, background: 'radial-gradient(ellipse at center,rgba(6,182,212,0.06) 0%,transparent 60%)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%', textAlign: 'center', position: 'relative' }}>
        {/* Eyebrow */}
        <div className="lp-fadein" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 1rem', borderRadius: 20, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.22)', marginBottom: '2rem' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: GREEN, boxShadow: `0 0 8px ${GREEN}`, animation: 'lp-pulse 2s ease-in-out infinite' }} />
          <span style={{ fontSize: '0.72rem', color: BLUE_L, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'monospace' }}>{t('landing.heroBadge')}</span>
        </div>

        {/* Headline */}
        <h1 className="lp-fadein lp-d1" style={{ margin: 0, fontSize: 'clamp(2.8rem,6vw,5.25rem)', fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 1.04 }}>
          <span style={{ display: 'block', color: T1 }}>{t('landing.heroTitle1')}</span>
          <span style={{ display: 'block', background: 'linear-gradient(135deg,#60a5fa 0%,#a78bfa 55%,#818cf8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            {t('landing.heroTitle2')}
          </span>
        </h1>

        {/* Sub */}
        <p className="lp-fadein lp-d2" style={{ margin: '1.75rem auto 0', maxWidth: 580, fontSize: 'clamp(1rem,2vw,1.15rem)', color: T2, lineHeight: 1.78 }}>
          {t('landing.heroDesc')}
        </p>

        {/* CTAs */}
        <div className="lp-fadein lp-d3" style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginTop: '2.5rem', flexWrap: 'wrap' }}>
          {isAuthenticated
            ? <Link to="/app" style={primaryLgBtn}>{t('landing.goToDashboard')}</Link>
            : <>
                <Link to="/register" style={primaryLgBtn}>{t('landing.getStarted')}</Link>
                <Link to="/login"    style={ghostLgBtn}>{t('landing.viewDocs')}</Link>
              </>
          }
        </div>

        {/* Hero terminal visual */}
        <div className="lp-fadein lp-d4" style={{ marginTop: '5rem' }}>
          <HeroTerminal />
        </div>
      </div>
    </section>
  );
}

// ─── Hero Terminal Visual ─────────────────────────────────────────────────────
function HeroTerminal() {
  const { t } = useI18n();
  return (
    <div style={{ position: 'relative', display: 'inline-block', width: '100%', maxWidth: 920 }}>
      {/* Glow under terminal */}
      <div style={{ position: 'absolute', inset: '10% 5%', background: 'radial-gradient(ellipse,rgba(37,99,235,0.18) 0%,transparent 70%)', filter: 'blur(30px)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '1fr 72px 1fr', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(59,130,246,0.18)', boxShadow: '0 0 0 1px rgba(59,130,246,0.06), 0 40px 80px rgba(0,0,0,0.5)' }}>
        {/* Left: SQL input */}
        <div style={{ background: '#08152a' }}>
          <TerminalChrome filename={t('landing.terminalTitle')} subtitle="SQL · UTF-8" />
          <pre style={{ margin: 0, padding: '1.4rem 1.5rem', fontSize: '0.77rem', lineHeight: 1.75, fontFamily: "'Fira Code',Consolas,monospace", textAlign: 'left', overflowX: 'auto', color: T2 }}
            dangerouslySetInnerHTML={{ __html: SQL_CODE }} />
        </div>

        {/* Middle: engine indicator */}
        <div style={{ background: '#0a1628', borderLeft: `1px solid ${BORDER}`, borderRight: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '1rem 0' }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#1d4ed8,#6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(99,102,241,0.4)' }}>
            <span style={{ fontSize: '1.1rem' }}>⚡</span>
          </div>
          <span style={{ fontSize: '0.58rem', color: T3, fontFamily: 'monospace', textAlign: 'center', lineHeight: 1.5, letterSpacing: '0.05em' }}>{t('landing.engineLabel')}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[1,2,3].map(i => <span key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: BLUE, display: 'block', opacity: 0.4 + i * 0.2 }} />)}
          </div>
        </div>

        {/* Right: API output */}
        <div style={{ background: '#060f1c' }}>
          <TerminalChrome filename={t('landing.outputTitle')} subtitle="REST" />
          <div style={{ padding: '1.4rem 1.5rem', textAlign: 'left' }}>
            {/* Status lines */}
            <div style={{ marginBottom: '1rem' }}>
              {[
                { icon: '✓', text: 'Database provisioned',    color: GREEN },
                { icon: '✓', text: '2 tables detected',       color: GREEN },
                { icon: '✓', text: '12 endpoints generated',  color: GREEN },
                { icon: '✓', text: 'Swagger UI ready',        color: BLUE_L },
              ].map(l => (
                <div key={l.text} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                  <span style={{ color: l.color, fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 800, width: 14 }}>{l.icon}</span>
                  <span style={{ color: T2, fontFamily: 'monospace', fontSize: '0.75rem' }}>{l.text}</span>
                </div>
              ))}
            </div>

            {/* Endpoints */}
            <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: '1rem' }}>
              {[
                { m: 'GET',    p: '/mysql/mydb/users',           mc: BLUE_L },
                { m: 'POST',   p: '/mysql/mydb/users',           mc: GREEN },
                { m: 'GET',    p: '/mysql/mydb/users/:id',       mc: BLUE_L },
                { m: 'PUT',    p: '/mysql/mydb/users/:id',       mc: YELLOW },
                { m: 'DELETE', p: '/mysql/mydb/users/:id',       mc: RED },
                { m: 'GET',    p: '/mysql/mydb/users/:id/posts', mc: BLUE_L },
                { m: 'GET',    p: '/mysql/mydb/posts',           mc: BLUE_L },
                { m: 'POST',   p: '/mysql/mydb/posts',           mc: GREEN },
              ].map((e, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.22rem' }}>
                  <span style={{ width: 52, fontSize: '0.64rem', fontWeight: 800, color: e.mc, fontFamily: 'monospace', textAlign: 'right', flexShrink: 0 }}>{e.m}</span>
                  <span style={{ fontSize: '0.72rem', color: T3, fontFamily: 'monospace' }}>{e.p}</span>
                </div>
              ))}
              <div style={{ marginTop: '0.6rem', fontSize: '0.68rem', color: PURPLE, fontFamily: 'monospace' }}>
                → Swagger UI at /mysql/mydb/docs
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TerminalChrome({ filename, subtitle }: { filename: string; subtitle: string }) {
  return (
    <div style={{ padding: '0.6rem 1rem', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: '0.45rem', background: 'rgba(255,255,255,0.025)' }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: RED,    flexShrink: 0 }} />
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: YELLOW, flexShrink: 0 }} />
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: GREEN,  flexShrink: 0 }} />
      <span style={{ marginLeft: '0.5rem', fontSize: '0.72rem', color: T3, fontFamily: 'monospace', flex: 1 }}>{filename}</span>
      <span style={{ fontSize: '0.62rem', color: '#1e3a5f', fontFamily: 'monospace' }}>{subtitle}</span>
    </div>
  );
}

const SQL_CODE = `<span style="color:#60a5fa">CREATE TABLE</span> <span style="color:#38bdf8">users</span> (
  id         <span style="color:#60a5fa">INT PRIMARY KEY AUTO_INCREMENT</span>,
  name       <span style="color:#60a5fa">VARCHAR</span>(100) <span style="color:#60a5fa">NOT NULL</span>,
  email      <span style="color:#60a5fa">VARCHAR</span>(255) <span style="color:#60a5fa">UNIQUE</span>,
  role       <span style="color:#60a5fa">ENUM</span>(<span style="color:#86efac">'admin'</span>,<span style="color:#86efac">'client'</span>),
  created_at <span style="color:#60a5fa">TIMESTAMP</span>
);

<span style="color:#60a5fa">CREATE TABLE</span> <span style="color:#38bdf8">posts</span> (
  id         <span style="color:#60a5fa">INT PRIMARY KEY AUTO_INCREMENT</span>,
  user_id    <span style="color:#60a5fa">INT REFERENCES</span> <span style="color:#38bdf8">users</span>(id),
  title      <span style="color:#60a5fa">VARCHAR</span>(200) <span style="color:#60a5fa">NOT NULL</span>,
  body       <span style="color:#60a5fa">TEXT</span>,
  created_at <span style="color:#60a5fa">TIMESTAMP</span>
);`;

// ─── Stats Bar ────────────────────────────────────────────────────────────────
function StatsBar() {
  const { t } = useI18n();
  const stats = [
    { value: t('landing.deployTime'),  label: t('landing.deployTimeLabel'), color: CYAN },
    { value: t('landing.engines'),     label: t('landing.enginesLabel'),     color: BLUE_L },
    { value: t('landing.endpoints'),   label: t('landing.endpointsLabel'),   color: PURPLE },
    { value: t('landing.docs'),        label: t('landing.docsLabel'),        color: GREEN },
  ];
  return (
    <div style={{ background: BG2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
        {stats.map(s => (
          <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: s.color, fontFamily: 'monospace', letterSpacing: '-0.01em' }}>{s.value}</span>
            <span style={{ fontSize: '0.7rem', color: T3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────
function FeaturesSection() {
  const { t } = useI18n();
  const features = [
    {
      icon: '⬆',
      color: BLUE,
      title: t('landing.sqlTitle'),
      desc: t('landing.sqlDesc'),
    },
    {
      icon: '⚡',
      color: YELLOW,
      title: t('landing.crudTitle'),
      desc: t('landing.crudDesc'),
    },
    {
      icon: '⊞',
      color: PURPLE,
      title: t('landing.docsTitle'),
      desc: t('landing.docsDesc'),
    },
    {
      icon: '◈',
      color: GREEN,
      title: t('landing.multiTitle'),
      desc: t('landing.multiDesc'),
    },
    {
      icon: '⇄',
      color: CYAN,
      title: t('landing.realtimeTitle'),
      desc: t('landing.realtimeDesc'),
    },
    {
      icon: '↻',
      color: RED,
      title: t('landing.lambdaTitle'),
      desc: t('landing.lambdaDesc'),
    },
  ];

  return (
    <section id="features" style={{ padding: '7rem 1.5rem', background: BG }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <SectionEyebrow color={BLUE}>Features</SectionEyebrow>
          <h2 style={{ margin: '0.75rem 0 0', fontSize: 'clamp(1.8rem,3.5vw,2.75rem)', fontWeight: 900, color: T1, letterSpacing: '-0.03em' }}>
            {t('landing.featuresTitle')}{' '}
            <span style={{ color: BLUE_L }}>{t('landing.featuresTitleHighlight')}</span>
          </h2>
          <p style={{ margin: '1rem auto 0', maxWidth: 520, fontSize: '1rem', color: T2, lineHeight: 1.75 }}>
            {t('landing.featuresSubtitle')}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(290px,1fr))', gap: '1rem' }}>
          {features.map(f => (
            <div
              key={f.title}
              className="lp-card"
              style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '1.75rem', transition: 'all 0.2s ease', cursor: 'default' }}
              onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = `${f.color}55`; el.style.background = `${f.color}08`; el.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = BORDER; el.style.background = CARD; el.style.transform = 'translateY(0)'; }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 11, background: `${f.color}18`, border: `1px solid ${f.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', marginBottom: '1.1rem' }}>
                {f.icon}
              </div>
              <h3 style={{ margin: '0 0 0.6rem', fontSize: '1rem', fontWeight: 700, color: T1 }}>{f.title}</h3>
              <p style={{ margin: 0, fontSize: '0.83rem', color: T2, lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────
function HowItWorksSection() {
  const { t } = useI18n();
  const steps = [
    {
      n: '01',
      color: BLUE,
      title: t('landing.step1Title'),
      desc: t('landing.step1Desc'),
      code: 'POST /schema/upload\nContent-Type: multipart/form-data\n\nfile=schema.sql\nengine=mysql\ndbName=my_app',
    },
    {
      n: '02',
      color: PURPLE,
      title: t('landing.step2Title'),
      desc: t('landing.step2Desc'),
      code: 'Job status: validating\nJob status: creating-db\nJob status: applying-schema\nJob status: completed ✓',
    },
    {
      n: '03',
      color: GREEN,
      title: t('landing.step3Title'),
      desc: t('landing.step3Desc'),
      code: 'GET  /mysql/my_app/users\nPOST /mysql/my_app/users\nGET  /mysql/my_app/docs\n\n→ 200 { data, meta }',
    },
  ];

  return (
    <section id="how-it-works" style={{ padding: '7rem 1.5rem', background: BG2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '4.5rem' }}>
          <SectionEyebrow color={PURPLE}>{t('landing.howItWorksTitle')}</SectionEyebrow>
          <h2 style={{ margin: '0.75rem 0 0', fontSize: 'clamp(1.8rem,3.5vw,2.75rem)', fontWeight: 900, color: T1, letterSpacing: '-0.03em' }}>
            {t('landing.howItWorksSubtitle')}
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '1.25rem', position: 'relative' }}>
          {/* Connecting line */}
          <div style={{ position: 'absolute', top: '3.25rem', left: '16.5%', right: '16.5%', height: 1, background: `linear-gradient(90deg,${BLUE}40,${PURPLE}40,${GREEN}40)`, pointerEvents: 'none', display: 'none' }} />

          {steps.map((s, i) => (
            <div key={s.n} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden', position: 'relative' }}>
              {/* Top accent line */}
              <div style={{ height: 3, background: `linear-gradient(90deg,${s.color},${s.color}44)` }} />
              <div style={{ padding: '1.75rem' }}>
                {/* Step number */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.1rem' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '2rem', fontWeight: 900, color: `${s.color}40`, lineHeight: 1 }}>{s.n}</span>
                  {i < steps.length - 1 && (
                    <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: T3 }}>→</span>
                  )}
                </div>
                <h3 style={{ margin: '0 0 0.65rem', fontSize: '1.05rem', fontWeight: 700, color: T1 }}>{s.title}</h3>
                <p style={{ margin: '0 0 1.25rem', fontSize: '0.83rem', color: T2, lineHeight: 1.7 }}>{s.desc}</p>
                {/* Code block */}
                <pre style={{ margin: 0, padding: '0.9rem 1rem', background: '#050d1a', border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: '0.72rem', color: `${s.color}cc`, fontFamily: "'Fira Code',Consolas,monospace", lineHeight: 1.65, overflowX: 'auto' }}>
                  {s.code}
                </pre>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Lambda Callout ───────────────────────────────────────────────────────────
function LambdaCallout() {
  const { t } = useI18n();
  return (
    <section style={{ padding: '7rem 1.5rem', background: BG }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', border: `1px solid rgba(139,92,246,0.3)` }}>
          {/* Background gradient */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(37,99,235,0.1) 0%,rgba(124,58,237,0.12) 50%,rgba(6,182,212,0.06) 100%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: '-40%', right: '-10%', width: 500, height: 500, background: 'radial-gradient(ellipse,rgba(139,92,246,0.12) 0%,transparent 60%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', padding: 'clamp(2rem,5vw,4rem)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '3rem', alignItems: 'center' }}>
            {/* Text */}
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.8rem', borderRadius: 20, background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', marginBottom: '1.25rem' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: PURPLE, boxShadow: `0 0 6px ${PURPLE}` }} />
                <span style={{ fontSize: '0.68rem', color: PURPLE, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'monospace' }}>{t('landing.lambdaBadge')}</span>
              </div>
              <h2 style={{ margin: '0 0 1rem', fontSize: 'clamp(1.6rem,3vw,2.4rem)', fontWeight: 900, color: T1, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                {t('landing.lambdaCalloutTitle')}
              </h2>
              <p style={{ margin: '0 0 1.75rem', fontSize: '0.95rem', color: T2, lineHeight: 1.78, maxWidth: 480 }}>
                {t('landing.lambdaCalloutDesc')}
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Link to="/lambda" style={{ ...primarySmBtn, padding: '0.55rem 1.25rem', fontSize: '0.85rem' }}>
                  {t('landing.lambdaLearnMore')}
                </Link>
              </div>
            </div>

            {/* Feature list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { icon: '⇄', color: CYAN,   text: 'Dual-engine: MySQL + PostgreSQL simultaneously' },
                { icon: '⊞', color: PURPLE, text: 'Auto-generated OpenAPI 3.0.3 + Swagger UI per database' },
                { icon: '◈', color: GREEN,  text: 'belongsTo (LEFT JOIN) + hasMany (correlated subquery)' },
                { icon: '⊟', color: BLUE,   text: 'LRU connection pooling — up to 50 concurrent databases' },
                { icon: '↻', color: YELLOW, text: 'Hot-swappable routing — no restarts, atomic replacement' },
                { icon: '≡', color: RED,    text: 'Filtering, pagination, sorting on every collection' },
              ].map(f => (
                <div key={f.text} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 10, border: `1px solid rgba(255,255,255,0.04)` }}>
                  <span style={{ width: 28, height: 28, borderRadius: 7, background: `${f.color}18`, border: `1px solid ${f.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', flexShrink: 0, marginTop: 1 }}>{f.icon}</span>
                  <span style={{ fontSize: '0.82rem', color: T2, lineHeight: 1.55 }}>{f.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── CTA Section ──────────────────────────────────────────────────────────────
function CtaSection({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { t } = useI18n();
  return (
    <section style={{ padding: '8rem 1.5rem', background: BG2, borderTop: `1px solid ${BORDER}`, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 800, height: 500, background: 'radial-gradient(ellipse,rgba(37,99,235,0.1) 0%,rgba(124,58,237,0.07) 40%,transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
        <SectionEyebrow color={GREEN}>{t('landing.ctaGetStarted')}</SectionEyebrow>
        <h2 style={{ margin: '0.75rem 0 0', fontSize: 'clamp(2rem,4vw,3.25rem)', fontWeight: 900, color: T1, letterSpacing: '-0.035em', lineHeight: 1.1 }}>
          {t('landing.ctaTitle')}
        </h2>
        <p style={{ margin: '1.25rem auto 0', maxWidth: 480, fontSize: '1rem', color: T2, lineHeight: 1.78 }}>
          {t('landing.ctaSubtitle')}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginTop: '2.5rem', flexWrap: 'wrap' }}>
          {isAuthenticated
            ? <Link to="/app" style={primaryLgBtn}>{t('landing.ctaGoToDashboard')}</Link>
            : <>
                <Link to="/register" style={primaryLgBtn}>{t('landing.ctaGetStarted')}</Link>
                <Link to="/login"    style={ghostLgBtn}>{t('landing.ctaViewDocs')}</Link>
              </>
          }
        </div>
        {/* Tech badges */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '3rem', flexWrap: 'wrap' }}>
          {['TypeScript', 'Express', 'BullMQ', 'Redis', 'MySQL', 'PostgreSQL', 'OpenAPI'].map(t => (
            <span key={t} style={{ padding: '0.2rem 0.65rem', borderRadius: 20, fontSize: '0.68rem', color: T3, background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, fontFamily: 'monospace' }}>{t}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────
function SectionEyebrow({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.85rem', borderRadius: 20, background: `${color}10`, border: `1px solid ${color}30`, marginBottom: '0.5rem' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
      <span style={{ fontSize: '0.7rem', color, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'monospace' }}>{children}</span>
    </div>
  );
}

// ─── Button styles ────────────────────────────────────────────────────────────
const primaryLgBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center',
  padding: '0.8rem 1.85rem', borderRadius: 10,
  background: 'linear-gradient(135deg,#2563eb,#7c3aed)',
  color: '#fff', fontWeight: 700, fontSize: '0.95rem',
  textDecoration: 'none', letterSpacing: '-0.01em',
  boxShadow: '0 0 0 1px rgba(99,102,241,0.3), 0 8px 24px rgba(37,99,235,0.35)',
  transition: 'opacity 0.15s, transform 0.15s',
};
const ghostLgBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center',
  padding: '0.8rem 1.85rem', borderRadius: 10,
  background: 'transparent',
  color: '#94a3b8', fontWeight: 600, fontSize: '0.95rem',
  textDecoration: 'none',
  border: '1px solid #1a2d45',
  transition: 'color 0.15s, border-color 0.15s',
};
const primarySmBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center',
  padding: '0.4rem 1rem', borderRadius: 8,
  background: 'linear-gradient(135deg,#2563eb,#7c3aed)',
  color: '#fff', fontWeight: 700, fontSize: '0.8rem',
  textDecoration: 'none',
  boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
};
const ghostSmBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center',
  padding: '0.4rem 1rem', borderRadius: 8,
  background: 'transparent',
  color: '#94a3b8', fontWeight: 600, fontSize: '0.8rem',
  textDecoration: 'none',
  border: '1px solid #1a2d45',
};

// ─── Global CSS ───────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @keyframes lp-pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.4; }
  }
  .lp-fadein {
    animation: lp-fadein-anim 0.7s ease both;
  }
  .lp-d1 { animation-delay: 0.1s; }
  .lp-d2 { animation-delay: 0.2s; }
  .lp-d3 { animation-delay: 0.3s; }
  .lp-d4 { animation-delay: 0.45s; }
  @keyframes lp-fadein-anim {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;
