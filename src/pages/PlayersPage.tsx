import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ShieldCheck, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const PAGE_SIZE = 50;

type PlayerRow = {
  id: string;
  email: string | null;
  pseudo: string;
  display_name: string | null;
  role: 'player' | 'animateur' | 'admin';
  created_at: string;
};

type ConfirmAction = { type: 'delete' | 'promote'; player: PlayerRow };

export function PlayersPage({ currentUserRole }: { currentUserRole: 'player' | 'animateur' | 'admin' }) {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.rpc('get_players_admin', {
      p_limit: PAGE_SIZE,
      p_offset: page * PAGE_SIZE,
    });
    if (error) { setError(error.message); setLoading(false); return; }
    const rows = (data as (PlayerRow & { total_count: number })[]) || [];
    setPlayers(rows);
    setTotalCount(rows[0]?.total_count ?? 0);
    setLoading(false);
  }

  useEffect(() => { load(); }, [page]);

  async function handleDelete() {
    if (!confirmAction) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.rpc('delete_player_admin', { p_user_id: confirmAction.player.id });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setConfirmAction(null);
    if (players.length === 1 && page > 0) setPage((p) => p - 1); else load();
  }

  async function handlePromote() {
    if (!confirmAction) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.rpc('promote_player_admin', { p_user_id: confirmAction.player.id });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setConfirmAction(null);
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
                  <div style={{ display: 'inline-flex', gap: 6 }}>
                    {currentUserRole === 'admin' && p.role === 'player' && (
                      <button
                        className="btn secondary icon-only sm"
                        onClick={() => setConfirmAction({ type: 'promote', player: p })}
                        title="Promouvoir en admin"
                        aria-label="Promouvoir en admin"
                        style={{ color: 'var(--accent)' }}
                      >
                        <ShieldCheck size={15} />
                      </button>
                    )}
                    <button
                      className="btn secondary icon-only sm"
                      onClick={() => setConfirmAction({ type: 'delete', player: p })}
                      title="Supprimer"
                      aria-label="Supprimer"
                      style={{ color: 'var(--danger)' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && totalCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            {page * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE + players.length, totalCount)} sur {totalCount} joueurs
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="btn secondary icon-only sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              title="Page précédente"
              aria-label="Page précédente"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              type="button"
              className="btn secondary icon-only sm"
              disabled={(page + 1) * PAGE_SIZE >= totalCount}
              onClick={() => setPage((p) => p + 1)}
              title="Page suivante"
              aria-label="Page suivante"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {confirmAction && confirmAction.type === 'delete' && (
        <div style={{
          position: 'fixed', inset: 0, background: 'var(--bg-overlay)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }}>
          <div className="card" style={{ maxWidth: 380, width: '90%' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 16, color: 'var(--text-strong)' }}>
              Supprimer {confirmAction.player.pseudo} ?
            </h2>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-secondary)' }}>
              Cette action supprime définitivement le compte ({confirmAction.player.email ?? 'sans email'})
              et toutes ses données associées (pronostics, historique, XP). Impossible à annuler.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                className="btn secondary icon-only"
                disabled={busy}
                onClick={() => setConfirmAction(null)}
                title="Annuler"
                aria-label="Annuler"
              >
                <X size={18} />
              </button>
              <button
                className="btn icon-only"
                disabled={busy}
                onClick={handleDelete}
                title={busy ? 'Suppression…' : 'Confirmer la suppression'}
                aria-label={busy ? 'Suppression…' : 'Confirmer la suppression'}
                style={{ background: 'var(--danger)', color: '#fff' }}
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmAction && confirmAction.type === 'promote' && (
        <div style={{
          position: 'fixed', inset: 0, background: 'var(--bg-overlay)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }}>
          <div className="card" style={{ maxWidth: 380, width: '90%' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 16, color: 'var(--text-strong)' }}>
              Promouvoir {confirmAction.player.pseudo} en admin ?
            </h2>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-secondary)' }}>
              Ce compte deviendra administrateur et n'apparaîtra plus dans le classement joueur.
              Tous ses pronostics et points remportés seront définitivement supprimés. Impossible à annuler.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                className="btn secondary icon-only"
                disabled={busy}
                onClick={() => setConfirmAction(null)}
                title="Annuler"
                aria-label="Annuler"
              >
                <X size={18} />
              </button>
              <button
                className="btn icon-only"
                disabled={busy}
                onClick={handlePromote}
                title={busy ? 'Promotion…' : 'Confirmer la promotion'}
                aria-label={busy ? 'Promotion…' : 'Confirmer la promotion'}
                style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
              >
                <ShieldCheck size={18} />
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
