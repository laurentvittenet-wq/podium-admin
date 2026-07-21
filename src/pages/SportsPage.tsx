import { useEffect, useState, type FormEvent } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { fetchSports, type SportRow } from '../lib/sports';

function slugify(text: string): string {
  return text
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function SportsPage() {
  const [sports, setSports] = useState<SportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [color, setColor] = useState('#00E676');
  const [allowsDrawDefault, setAllowsDrawDefault] = useState(true);
  const [requiresScoreDefault, setRequiresScoreDefault] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<SportRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setSports(await fetchSports());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function resetForm() {
    setEditingId(null);
    setName(''); setSlug(''); setColor('#00E676');
    setAllowsDrawDefault(true); setRequiresScoreDefault(true);
    setSortOrder(sports.length);
    setActive(true);
  }

  function handleEdit(s: SportRow) {
    setEditingId(s.id);
    setName(s.name);
    setSlug(s.slug);
    setColor(s.color);
    setAllowsDrawDefault(s.allows_draw_default);
    setRequiresScoreDefault(s.requires_score_default);
    setSortOrder(s.sort_order);
    setActive(s.active);
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { error } = editingId
      ? await supabase.from('sports').update({
          name,
          color,
          allows_draw_default: allowsDrawDefault,
          requires_score_default: requiresScoreDefault,
          sort_order: sortOrder,
          active,
        }).eq('id', editingId)
      : await supabase.from('sports').insert({
          name,
          slug: slugify(name),
          color,
          allows_draw_default: allowsDrawDefault,
          requires_score_default: requiresScoreDefault,
          sort_order: sortOrder,
        });
    setSaving(false);
    if (error) { setError(error.message); return; }
    resetForm();
    load();
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    setError(null);
    const { error } = await supabase.from('sports').delete().eq('id', confirmDelete.id);
    setDeleting(false);
    if (error) {
      setError(
        error.code === '23503'
          ? `Impossible de supprimer "${confirmDelete.name}" : des matchs, concours ou équipes l'utilisent encore. Désactive-le plutôt.`
          : error.message,
      );
      setConfirmDelete(null);
      return;
    }
    setConfirmDelete(null);
    load();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-strong)' }}>Sports</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
          Cette liste alimente les sélecteurs de sport partout dans l'app (matchs, concours, équipes). Désactive un
          sport plutôt que de le supprimer s'il est déjà utilisé par des matchs existants.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card form-compact" style={{ display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ margin: 0, fontSize: 16, color: 'var(--text-strong)' }}>
          {editingId ? 'Modifier le sport' : 'Nouveau sport'}
        </h2>
        <div className="form-row" style={{ gap: 14 }}>
          <div className="field" style={{ flex: '2 1 160px' }}>
            <label htmlFor="s-name">Nom</label>
            <input id="s-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Basketball" required />
          </div>
          <div className="field" style={{ flex: '0 0 48px' }}>
            <label htmlFor="s-color">Couleur</label>
            <input id="s-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </div>
          <div className="field" style={{ flex: '0 0 72px' }}>
            <label htmlFor="s-order">Ordre</label>
            <input id="s-order" type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
          </div>
        </div>
        {!editingId && name && (
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)' }}>
            Identifiant technique : <code>{slugify(name) || '—'}</code> (fixé à la création)
          </p>
        )}
        {editingId && (
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)' }}>
            Identifiant technique : <code>{slug}</code>
          </p>
        )}

        <div className="form-row" style={{ alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={allowsDrawDefault} onChange={(e) => setAllowsDrawDefault(e.target.checked)} />
            Match nul possible par défaut
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={requiresScoreDefault} onChange={(e) => setRequiresScoreDefault(e.target.checked)} />
            Score à saisir par défaut
          </label>
          {editingId && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
              Actif (visible dans les sélecteurs)
            </label>
          )}
        </div>

        {error && <div style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="submit"
            className="btn icon-only"
            disabled={saving}
            title={editingId ? 'Enregistrer les modifications' : 'Créer le sport'}
            aria-label={editingId ? 'Enregistrer les modifications' : 'Créer le sport'}
            style={{ alignSelf: 'flex-start' }}
          >
            {editingId ? <Check size={18} /> : <Plus size={18} />}
          </button>
          {editingId && (
            <button
              type="button"
              className="btn secondary icon-only"
              disabled={saving}
              onClick={resetForm}
              title="Annuler"
              aria-label="Annuler"
              style={{ alignSelf: 'flex-start' }}
            >
              <X size={18} />
            </button>
          )}
        </div>
      </form>

      <div className="card">
        <h2 style={{ margin: '0 0 12px', fontSize: 16, color: 'var(--text-strong)' }}>Sports existants</h2>
        {loading ? (
          <div style={{ color: 'var(--text-tertiary)' }}>Chargement…</div>
        ) : sports.length === 0 ? (
          <div style={{ color: 'var(--text-tertiary)' }}>Aucun sport pour l'instant.</div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-tertiary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '6px 8px' }}>Sport</th>
                  <th style={{ padding: '6px 8px' }}>Défauts</th>
                  <th style={{ padding: '6px 8px' }}>Statut</th>
                  <th style={{ padding: '6px 8px' }}></th>
                </tr>
              </thead>
              <tbody>
                {sports.map((s) => (
                  <tr key={s.id} style={{ borderTop: '1px solid var(--border)', opacity: s.active ? 1 : 0.55 }}>
                    <td style={{ padding: '10px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flex: 'none' }} />
                        <span style={{ color: 'var(--text-strong)', fontWeight: 700 }}>{s.name}</span>
                        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>({s.slug})</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 8px', fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {s.allows_draw_default ? 'Nul possible' : 'Sans nul'} · {s.requires_score_default ? 'Score requis' : 'Sans score'}
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <span className="badge" style={{
                        background: s.active ? 'var(--success-soft)' : 'var(--bg-surface-3)',
                        color: s.active ? 'var(--success)' : 'var(--text-tertiary)',
                      }}>{s.active ? 'actif' : 'inactif'}</span>
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          type="button"
                          className="btn secondary icon-only sm"
                          onClick={() => handleEdit(s)}
                          title="Modifier"
                          aria-label="Modifier"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className="btn secondary icon-only sm"
                          onClick={() => setConfirmDelete(s)}
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
        )}
      </div>

      {confirmDelete && (
        <div style={{
          position: 'fixed', inset: 0, background: 'var(--bg-overlay)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }}>
          <div className="card" style={{ maxWidth: 380, width: '90%' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 16, color: 'var(--text-strong)' }}>
              Supprimer {confirmDelete.name} ?
            </h2>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-secondary)' }}>
              Si ce sport est déjà utilisé par des matchs, concours ou équipes, la suppression sera refusée —
              désactive-le dans ce cas plutôt que de le supprimer. Impossible à annuler.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                className="btn secondary icon-only"
                disabled={deleting}
                onClick={() => setConfirmDelete(null)}
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
