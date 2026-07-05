import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

type PlayerRow = {
  id: string;
  email: string | null;
  pseudo: string;
  display_name: string | null;
  role: 'player' | 'animateur' | 'admin';
  created_at: string;
};

export function PlayersPage() {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<PlayerRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.rpc('get_players_admin');
    if (error) { setError(error.message); setLoading(false); return; }
    setPlayers((data as PlayerRow[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete() {
    if (!confirmTarget) return;
    setDeleting(true);
    setError(null);
    const { error } = await supabase.rpc('delete_player_admin', { p_user_id: confirmTarget.id });
    setDeleting(false);
    if (error) { setError(error.message); return; }
    setConfirmTarget(null);
    load();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-strong)' }}>Joueurs</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
          Comptes créés sur Podium. La suppression est définitive et irréversible.
        </p>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--danger)', color: 'var(--danger)', fontSize: 13 }}>
          {error}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={thStyle}>Pseudo</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Rôle</th>
              <th style={thStyle}>Créé le</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} style={{ padding: 16, color: 'var(--text-secondary)' }}>Chargement…</td></tr>
            )}
            {!loading && players.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 16, color: 'var(--text-secondary)' }}>Aucun joueur.</td></tr>
            )}
            {players.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={tdStyle}>
                  <span style={{ color: 'var(--text-strong)', fontWeight: 600 }}>{p.pseudo}</span>
                  {p.display_name && (
                    <span style={{ color: 'var(--text-tertiary)', marginLeft: 6 }}>({p.display_name})</span>
                  )}
                </td>
                <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{p.email ?? '—'}</td>
                <td style={tdStyle}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                    background: p.role === 'admin' ? 'var(--danger-soft)' : p.role === 'animateur' ? 'var(--accent-soft)' : 'var(--bg-surface-3)',
                    color: p.role === 'admin' ? 'var(--danger)' : p.role === 'animateur' ? 'var(--accent)' : 'var(--text-secondary)',
                  }}>
                    {p.role}
                  </span>
                </td>
                <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>
                  {new Date(p.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>
                  <button
                    className="btn secondary"
                    onClick={() => setConfirmTarget(p)}
                    style={{ height: 30, padding: '0 12px', fontSize: 12, color: 'var(--danger)' }}
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {confirmTarget && (
        <div style={{
          position: 'fixed', inset: 0, background: 'var(--bg-overlay)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }}>
          <div className="card" style={{ maxWidth: 380, width: '90%' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 16, color: 'var(--text-strong)' }}>
              Supprimer {confirmTarget.pseudo} ?
            </h2>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-secondary)' }}>
              Cette action supprime définitivement le compte ({confirmTarget.email ?? 'sans email'})
              et toutes ses données associées (pronostics, historique, XP). Impossible à annuler.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn secondary" disabled={deleting} onClick={() => setConfirmTarget(null)}>
                Annuler
              </button>
              <button
                className="btn"
                disabled={deleting}
                onClick={handleDelete}
                style={{ background: 'var(--danger)', color: '#fff' }}
              >
                {deleting ? 'Suppression…' : 'Confirmer la suppression'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-tertiary)',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 16px',
};
