import { useEffect, useState, type FormEvent } from 'react';
import { Check, Pencil, Plus, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';

type Contest = Database['public']['Tables']['contests']['Row'];
type ScoringRule = Database['public']['Tables']['scoring_rules']['Row'];
type Sport = Database['public']['Enums']['sport_type'];

const SPORTS: Sport[] = ['football', 'rugby', 'tennis', 'olympics'];

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ContestsPage() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [rules, setRules] = useState<ScoringRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sport, setSport] = useState<Sport | ''>('');
  const [scoringRuleId, setScoringRuleId] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [{ data: c, error: e1 }, { data: r, error: e2 }] = await Promise.all([
      supabase.from('contests').select('*').order('created_at', { ascending: false }),
      supabase.from('scoring_rules').select('*').order('created_at', { ascending: false }),
    ]);
    if (e1 || e2) setError((e1 || e2)!.message);
    setContests(c || []);
    setRules(r || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function resetForm() {
    setEditingId(null);
    setName(''); setDescription(''); setSport(''); setScoringRuleId(''); setStartsAt(''); setEndsAt('');
  }

  function handleEdit(c: Contest) {
    setEditingId(c.id);
    setName(c.name);
    setDescription(c.description ?? '');
    setSport((c.sport as Sport | null) ?? '');
    setScoringRuleId(c.scoring_rule_id ?? '');
    setStartsAt(toDatetimeLocal(c.starts_at));
    setEndsAt(toDatetimeLocal(c.ends_at));
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      name,
      description: description || null,
      sport: sport || null,
      scoring_rule_id: scoringRuleId || null,
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
    };
    const { error } = editingId
      ? await supabase.from('contests').update(payload).eq('id', editingId)
      : await supabase.from('contests').insert(payload);
    setSaving(false);
    if (error) { setError(error.message); return; }
    resetForm();
    load();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-strong)' }}>Concours</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
          Un concours regroupe des matchs et applique une règle de points. Crée d'abord une règle si besoin.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16, color: 'var(--text-strong)' }}>
          {editingId ? 'Modifier le concours' : 'Nouveau concours'}
        </h2>
        <div className="field">
          <label htmlFor="c-name">Nom</label>
          <input id="c-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Concours du jour" required />
        </div>
        <div className="field">
          <label htmlFor="c-desc">Description</label>
          <textarea id="c-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>
        <div className="form-row">
          <div className="field" style={{ flex: '1 1 160px' }}>
            <label htmlFor="c-sport">Sport</label>
            <select id="c-sport" value={sport} onChange={(e) => setSport(e.target.value as Sport | '')}>
              <option value="">Tous</option>
              {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="field" style={{ flex: '1 1 160px' }}>
            <label htmlFor="c-rule">Règle de points</label>
            <select id="c-rule" value={scoringRuleId} onChange={(e) => setScoringRuleId(e.target.value)}>
              <option value="">— Défaut (50 / +50 / cotes) —</option>
              {rules.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="field" style={{ flex: '1 1 160px' }}>
            <label htmlFor="c-start">Début</label>
            <input id="c-start" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </div>
          <div className="field" style={{ flex: '1 1 160px' }}>
            <label htmlFor="c-end">Fin</label>
            <input id="c-end" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </div>
        </div>

        {error && <div style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="submit"
            className="btn icon-only"
            disabled={saving}
            title={editingId ? 'Enregistrer les modifications' : 'Créer le concours'}
            aria-label={editingId ? 'Enregistrer les modifications' : 'Créer le concours'}
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
        <h2 style={{ margin: '0 0 12px', fontSize: 16, color: 'var(--text-strong)' }}>Concours existants</h2>
        {loading ? (
          <div style={{ color: 'var(--text-tertiary)' }}>Chargement…</div>
        ) : contests.length === 0 ? (
          <div style={{ color: 'var(--text-tertiary)' }}>Aucun concours pour l'instant.</div>
        ) : (
          <div className="table-scroll">
          <table>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-tertiary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '6px 8px' }}>Nom</th>
                <th style={{ padding: '6px 8px' }}>Sport</th>
                <th style={{ padding: '6px 8px' }}>Règle</th>
                <th style={{ padding: '6px 8px' }}>Période</th>
                <th style={{ padding: '6px 8px' }}></th>
              </tr>
            </thead>
            <tbody>
              {contests.map((c) => (
                <tr key={c.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 8px', color: 'var(--text-strong)', fontWeight: 700 }}>{c.name}</td>
                  <td style={{ padding: '10px 8px' }}>{c.sport || 'Tous'}</td>
                  <td style={{ padding: '10px 8px' }}>{rules.find((r) => r.id === c.scoring_rule_id)?.name || 'Défaut'}</td>
                  <td style={{ padding: '10px 8px', fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {c.starts_at ? new Date(c.starts_at).toLocaleString('fr-FR') : '—'} → {c.ends_at ? new Date(c.ends_at).toLocaleString('fr-FR') : '—'}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button
                      type="button"
                      className="btn secondary icon-only sm"
                      onClick={() => handleEdit(c)}
                      title="Modifier"
                      aria-label="Modifier"
                    >
                      <Pencil size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
