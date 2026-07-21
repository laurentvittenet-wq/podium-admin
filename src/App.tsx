import { useState } from 'react';
import { useAuth } from './lib/useAuth';
import { supabase } from './lib/supabaseClient';
import { Login } from './pages/Login';
import { ContestsPage } from './pages/ContestsPage';
import { ScoringRulesPage } from './pages/ScoringRulesPage';
import { MatchesPage } from './pages/MatchesPage';
import { PlayersPage } from './pages/PlayersPage';

const NAV = [
  { value: 'contests', label: 'Concours' },
  { value: 'matches', label: 'Matchs' },
  { value: 'players', label: 'Joueurs' },
  { value: 'rules', label: 'Règles de points' },
] as const;

type NavValue = (typeof NAV)[number]['value'];

export function App() {
  const auth = useAuth();
  const [page, setPage] = useState<NavValue>('contests');
  const [navOpen, setNavOpen] = useState(false);

  if (auth.status === 'loading') {
    return <div style={{ padding: 24, color: 'var(--text-secondary)' }}>Chargement…</div>;
  }

  if (auth.status === 'signed-out') {
    return <Login />;
  }

  if (auth.status === 'unauthorized') {
    return (
      <div style={{ minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="card" style={{ maxWidth: 380, textAlign: 'center' }}>
          <h1 style={{ margin: '0 0 8px', fontSize: 18, color: 'var(--text-strong)' }}>Accès réservé</h1>
          <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--text-secondary)' }}>
            Le compte <strong>{auth.profile.pseudo}</strong> n'a pas le rôle animateur ou admin. Demande à un admin de te promouvoir.
          </p>
          <button className="btn secondary" onClick={() => supabase.auth.signOut()}>Se déconnecter</button>
        </div>
      </div>
    );
  }

  const { profile } = auth;

  const brand = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)' }} />
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em', color: 'var(--text-strong)' }}>
        Podium
      </span>
    </div>
  );

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <button className="nav-toggle" aria-label="Ouvrir le menu" onClick={() => setNavOpen(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        {brand}
      </header>

      <div className={`app-sidebar-backdrop${navOpen ? ' open' : ''}`} onClick={() => setNavOpen(false)} />

      <aside className={`app-sidebar${navOpen ? ' open' : ''}`}>
        <div style={{ padding: '4px 8px 20px' }}>
          {brand}
        </div>
        {NAV.map((n) => (
          <button
            key={n.value}
            className={`nav-link${page === n.value ? ' active' : ''}`}
            onClick={() => {
              setPage(n.value);
              setNavOpen(false);
            }}
          >
            {n.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ padding: '8px 8px 4px', fontSize: 12, color: 'var(--text-tertiary)' }}>
          @{profile.pseudo} · {profile.role}
        </div>
        <button className="btn secondary" onClick={() => supabase.auth.signOut()}>Se déconnecter</button>
      </aside>

      <main className="app-main">
        {page === 'contests' && <ContestsPage />}
        {page === 'matches' && <MatchesPage />}
        {page === 'players' && <PlayersPage />}
        {page === 'rules' && <ScoringRulesPage />}
      </main>
    </div>
  );
}
