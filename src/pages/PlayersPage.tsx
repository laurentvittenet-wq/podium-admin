import { useEffect, useState } from 'react';
import { Trash2, X } from 'lucide-react';
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

      <div className="card table-scroll" style={{ padding: 0 }}>
        <table style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse', fontSize: 13 }}>
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
                <td style={{ ...tdStyle, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{p.email ?? '—'}</td>
                <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                    background: p.role === 'admin' ? 'var(--danger-soft)' : p.role === 'animateur' ? 'var(--accent-soft)' : 'var(--bg-surface-3)',
                    color: p.role === 'admin' ? 'var(--danger)' : p.role === 'animateur' ? 'var(--accent)' : 'var(--text-secondary)',
                  }}>
                    {p.role}
                  </span>
                </td>
                <td style={{ ...tdStyle, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  {new Date(p.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button
                    className="btn secondary icon-only sm"
                    onClick={() => setConfirmTarget(p)}
                    title="Supprimer"
                    aria-label="Supprimer"
                    style={{ color: 'var(--danger)' }}
                  >
                    <Trash2 size={15} />
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
              <button
                className="btn secondary icon-only"
                disabled={deleting}
                onClick={() => setConfirmTarget(null)}
                title="Annuler"
                aria-label="Annuler"
              >
                <X size={18} />
              </button>
              <button
                className="btn icon-only"
                disabled={deleting}
                onClick={handleDelete}
                title={deleting ? 'Suppression…' : 'Confirmer la suppression'}
                aria-label={deleting ? 'Suppression…' : 'Confirmer la suppression'}
                style={{ background: 'var(--danger)', color: '#fff' }}
              >
                <Trash2 size={18} />
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
