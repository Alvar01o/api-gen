import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../api/client';
import { useAuth, AuthUser } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { LanguageSelector } from '../components/LanguageSelector';

export function LoginPage() {
  const { login: authLogin } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { token, user } = await login(email, password);
      authLogin(token, user as AuthUser);
      navigate(user.role === 'admin' ? '/admin' : '/app');
    } catch (err: any) {
      setError(err?.response?.data?.error ?? t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
        <LanguageSelector variant="dark" />
      </div>

      <div style={styles.card}>
        <h1 style={styles.logo}>api-dyn</h1>
        <p style={styles.sub}>{t('auth.tagline')}</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>{t('auth.email')}</label>
          <input
            style={styles.input}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder={t('auth.emailPlaceholder')}
            required
            autoFocus
          />

          <label style={styles.label}>{t('auth.password')}</label>
          <input
            style={styles.input}
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={t('auth.passwordPlaceholder')}
            required
          />

          {error && <p style={styles.error}>{error}</p>}

          <button style={styles.btn} type="submit" disabled={loading}>
            {loading ? t('auth.signingIn') : t('auth.signIn')}
          </button>
        </form>

        <p style={styles.footer}>
          {t('auth.noAccount')}{' '}
          <Link to="/register" style={styles.link}>{t('auth.createOne')}</Link>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh', position: 'relative',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#0f172a',
  },
  card: {
    background: '#1e293b', borderRadius: '12px', padding: '2.5rem 2rem',
    width: '100%', maxWidth: '380px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
  },
  logo: { margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', fontFamily: 'monospace', letterSpacing: '-0.02em' },
  sub: { margin: '0.3rem 0 2rem', color: '#64748b', fontSize: '0.85rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  label: { fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' },
  input: { padding: '0.65rem 0.9rem', borderRadius: '7px', border: '1px solid #334155', background: '#0f172a', color: '#f8fafc', fontSize: '0.9rem', outline: 'none' },
  error: { margin: '0.2rem 0', padding: '0.5rem 0.75rem', background: '#fef2f2', color: '#b91c1c', borderRadius: '6px', fontSize: '0.82rem' },
  btn: { marginTop: '0.5rem', padding: '0.7rem', borderRadius: '7px', border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' },
  footer: { marginTop: '1.5rem', textAlign: 'center', fontSize: '0.82rem', color: '#64748b' },
  link: { color: '#60a5fa', textDecoration: 'none', fontWeight: 600 },
};
