import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppFooter } from '../components/AppFooter';
import { useAuth } from '../context/AuthContext';
import { AppProvider } from '../context/AppContext';
import { UploadForm } from '../components/UploadForm';
import { JobStatus } from '../components/JobStatus';
import { GraphView } from '../components/GraphView';
import { MyProjects } from '../components/MyProjects';
import { AllProjects } from '../components/AllProjects';
import { useI18n } from '../i18n/I18nContext';
import { LanguageSelector } from '../components/LanguageSelector';
import { TenantSelector } from '../components/TenantSelector';

type View = 'import' | 'projects' | 'all-projects';

const NAVBAR_H = '3.5rem';

// ─────────────────────────────────────────────────────────────────────────────

export function Dashboard() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<View>('import');
  const { t } = useI18n();

  const NAV_ITEMS: { id: View; label: string; icon: string; desc: string }[] = [
    { id: 'import' as View, label: t('nav.importSchema'), icon: '⬆', desc: t('nav.importSchemaDesc') },
    { id: 'projects' as View, label: t('nav.myProjects'), icon: '◈', desc: t('nav.myProjectsDesc') },
  ];

  const ADMIN_NAV_ITEMS: { id: View; label: string; icon: string; desc: string }[] = [
    { id: 'all-projects' as View, label: t('nav.allProjects'), icon: '⊞', desc: t('nav.allProjectsDesc') },
  ];

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const initials = user?.name
    ?.split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '?';

  return (
    <AppProvider>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f1f5f9' }}>

        {/* ─── Navbar ─────────────────────────────────────────────────────── */}
        <nav style={{
          background: '#0f172a',
          borderBottom: '1px solid #1e293b',
          position: 'sticky', top: 0, zIndex: 50,
          height: NAVBAR_H, flexShrink: 0,
          display: 'flex', alignItems: 'center',
        }}>
          <div style={{
            width: '100%', padding: '0 1.5rem',
            display: 'flex', alignItems: 'center', gap: '1rem',
          }}>
            {/* Brand */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '6px',
                background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.75rem', color: '#fff' }}>A</span>
              </div>
              <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1rem', color: '#f8fafc', letterSpacing: '-0.02em' }}>
                api<span style={{ color: '#3b82f6' }}>-dyn</span>
              </span>
              <span style={{ width: 1, height: 16, background: '#334155' }} />
              <span style={{ color: '#475569', fontSize: '0.75rem', fontWeight: 500 }}>{t('nav.schemaProvisioning')}</span>
            </div>

            {/* Right: user + actions */}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1e3a5f, #1e4080)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.68rem', fontWeight: 800, color: '#93c5fd', flexShrink: 0,
                }}>
                  {initials}
                </div>
                <div style={{ lineHeight: 1.3 }}>
                  <div style={{ fontSize: '0.78rem', color: '#e2e8f0', fontWeight: 600 }}>{user?.name}</div>
                  <div style={{ fontSize: '0.68rem', color: '#475569' }}>{user?.email}</div>
                </div>
                {user?.role === 'admin' && (
                  <span style={{
                    background: '#4c1d95', color: '#c4b5fd', fontSize: '0.6rem',
                    fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: '3px',
                    letterSpacing: '0.07em', border: '1px solid #6d28d9',
                  }}>ADMIN</span>
                )}
              </div>
              <LanguageSelector variant="dark" />
              {isAdmin && (
                <button onClick={() => navigate('/admin')} style={navBtnStyle('#1e293b', '#94a3b8')}>
                  {t('nav.adminPanel')}
                </button>
              )}
              <button onClick={handleLogout} style={navBtnStyle('#1e293b', '#fca5a5')}>
                {t('nav.signOut')}
              </button>
            </div>
          </div>
        </nav>

        {/* ─── Body (sidebar + content) ───────────────────────────────────── */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* ── Sidebar ───────────────────────────────────────────────────── */}
          <aside style={{
            width: 220,
            background: '#0f172a',
            borderRight: '1px solid #1e293b',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            overflowY: 'auto',
          }}>
            {/* Tenant Selector */}
            <TenantSelector />

            {/* Workspace label */}
            <div style={{ padding: '1.1rem 1.1rem 0.5rem', marginTop: '0.5rem', borderTop: '1px solid #1e293b' }}>
              <span style={{
                fontSize: '0.62rem', fontWeight: 700, color: '#334155',
                textTransform: 'uppercase', letterSpacing: '0.1em',
              }}>
                {t('nav.workspace')}
              </span>
            </div>

            {/* Nav items */}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', padding: '0 0.6rem' }}>
              {NAV_ITEMS.map((item) => (
                <NavButton key={item.id} item={item} active={view === item.id} onClick={() => setView(item.id)} />
              ))}
            </nav>

            {/* Admin section */}
            {isAdmin && (
              <>
                <div style={{ padding: '1.1rem 1.1rem 0.4rem', marginTop: '0.5rem' }}>
                  <span style={{
                    fontSize: '0.62rem', fontWeight: 700, color: '#7c3aed',
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                  }}>
                    {t('nav.admin')}
                  </span>
                </div>
                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', padding: '0 0.6rem' }}>
                  {ADMIN_NAV_ITEMS.map((item) => (
                    <NavButton key={item.id} item={item} active={view === item.id} onClick={() => setView(item.id)} accent="#7c3aed" />
                  ))}
                </nav>
              </>
            )}

            {/* Sidebar footer */}
            <div style={{ marginTop: 'auto', padding: '1rem 1.1rem', borderTop: '1px solid #1e293b' }}>
              <div style={{ fontSize: '0.65rem', color: '#1e293b', fontFamily: 'monospace' }}>
                api-dyn v1.0
              </div>
              <div style={{ fontSize: '0.62rem', color: '#1e293b', marginTop: '0.15rem' }}>
                &copy; {new Date().getFullYear()}
              </div>
            </div>
          </aside>

          {/* ── Content area ──────────────────────────────────────────────── */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

            {/* View: Import Schema */}
            {view === 'import' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <PageHeader
                  title={t('nav.importSchema')}
                  description="Upload a SQL schema to provision a database, inspect its structure, and generate a fully functional REST API automatically."
                />
                <div style={{ padding: '2rem 2rem 0' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', alignItems: 'start' }}>
                    <div>
                      <StepHeader step={1} title="Upload Schema" />
                      <UploadForm />
                    </div>
                    <div>
                      <StepHeader step={2} title="Provisioning Status" />
                      <JobStatus />
                    </div>
                  </div>

                  <div style={{ marginTop: '2rem' }}>
                    <StepHeader step={3} title="Schema Explorer & API Generation" />
                    <GraphView />
                  </div>
                </div>
                <AppFooter />
              </div>
            )}

            {/* View: My Projects */}
            {view === 'projects' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <PageHeader
                  title={t('nav.myProjects')}
                  description="All your previously generated REST APIs, organized by database. Expand any project to browse endpoints, copy URLs, and access Swagger documentation."
                />
                <div style={{ padding: '2rem' }}>
                  <MyProjects />
                </div>
                <AppFooter />
              </div>
            )}

            {/* View: All Projects (admin) */}
            {view === 'all-projects' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <PageHeader
                  title={t('nav.allProjects')}
                  description="Overview of every REST API generated by clients. Monitor usage, access Swagger documentation, and inspect generated endpoints across all users."
                />
                <div style={{ padding: '2rem' }}>
                  <AllProjects />
                </div>
                <AppFooter />
              </div>
            )}

          </div>
        </div>
      </div>
    </AppProvider>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NavButton({
  item, active, onClick, accent = '#3b82f6',
}: {
  item: { id: View; label: string; icon: string; desc: string };
  active: boolean;
  onClick: () => void;
  accent?: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.65rem 0.85rem',
        borderRadius: '8px', border: 'none', cursor: 'pointer',
        background: active ? (accent === '#3b82f6' ? '#1e3a5f' : 'rgba(124,58,237,0.15)') : 'transparent',
        textAlign: 'left', width: '100%',
        transition: 'background 0.15s',
        position: 'relative',
      }}
      onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
        if (!active) e.currentTarget.style.background = '#1e293b';
      }}
      onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
        if (!active) e.currentTarget.style.background = 'transparent';
      }}
    >
      {active && (
        <span style={{
          position: 'absolute', left: 0, top: '20%', bottom: '20%',
          width: 3, borderRadius: '0 3px 3px 0',
          background: accent,
        }} />
      )}
      <span style={{
        width: 32, height: 32, borderRadius: '7px', flexShrink: 0,
        background: active ? `rgba(${accent === '#3b82f6' ? '59,130,246' : '124,58,237'},0.2)` : '#1e293b',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.9rem',
        color: active ? (accent === '#3b82f6' ? '#60a5fa' : '#c4b5fd') : '#475569',
        border: active ? `1px solid rgba(${accent === '#3b82f6' ? '59,130,246' : '124,58,237'},0.3)` : '1px solid transparent',
        transition: 'all 0.15s',
      }}>
        {item.icon}
      </span>
      <div style={{ lineHeight: 1.3, minWidth: 0 }}>
        <div style={{
          fontSize: '0.82rem', fontWeight: 600,
          color: active ? '#e2e8f0' : '#94a3b8',
          transition: 'color 0.15s',
        }}>
          {item.label}
        </div>
        <div style={{ fontSize: '0.67rem', color: '#334155' }}>
          {item.desc}
        </div>
      </div>
    </button>
  );
}

function PageHeader({ title, description }: { title: string; description: string }) {
  return (
    <div style={{ background: '#0f172a', padding: '1.5rem 2rem 1.75rem', flexShrink: 0 }}>
      <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#f8fafc' }}>
        {title}
      </h1>
      <p style={{ margin: '0.3rem 0 0', fontSize: '0.83rem', color: '#64748b', maxWidth: 560, lineHeight: 1.6 }}>
        {description}
      </p>
    </div>
  );
}

function StepHeader({ step, title }: { step: number; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
      <div style={{
        width: 22, height: 22, borderRadius: '50%',
        background: '#2563eb', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0,
      }}>
        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#fff' }}>{step}</span>
      </div>
      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </span>
    </div>
  );
}


function navBtnStyle(bg: string, color: string): React.CSSProperties {
  return {
    padding: '0.3rem 0.85rem', borderRadius: '6px', border: '1px solid #334155',
    cursor: 'pointer', fontWeight: 600, fontSize: '0.775rem',
    background: bg, color, transition: 'opacity 0.15s',
  };
}
