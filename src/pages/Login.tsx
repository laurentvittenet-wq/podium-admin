import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabaseClient';

export function Login() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { data: { pseudo } } });
    setBusy(false);
    if (error) setError(error.message);
  }

  return (
    <div style={{ minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <form onSubmit={handleSubmit} className="card" style={{ width: 360, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)' }} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, letterSpacing: '-0.03em', color: 'var(--text-strong)' }}>
              Podium <span style={{ color: 'var(--text-tertiary)', fontWeight: 700 }}>· Animateur</span>
            </span>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
            {mode === 'signin' ? 'Connecte-toi pour gérer les concours.' : 'Crée un compte animateur (à faire promouvoir ensuite).'}
          </p>
        </div>

        {mode === 'signup' && (
          <div className="field">
            <label htmlFor="pseudo">Pseudo</label>
            <input id="pseudo" value={pseudo} onChange={(e) => setPseudo(e.target.value)} required />
          </div>
        )}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="password">Mot de passe</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </div>

        {error && <div style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</div>}

        <button type="submit" className="btn" disabled={busy}>
          {mode === 'signin' ? 'Se connecter' : 'Créer le compte'}
        </button>
        <button
          type="button"
          className="btn secondary"
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }}
        >
          {mode === 'signin' ? "Créer un compte" : 'Déjà un compte ? Se connecter'}
        </button>
      </form>
    </div>
  );
}
