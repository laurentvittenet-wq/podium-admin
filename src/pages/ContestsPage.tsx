import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';

type Contest = Database['public']['Tables']['contests']['Row'];
type ScoringRule = Database['public']['Tables']['scoring_rules']['Row'];
type Sport = Database['public']['Enums']['sport_type'];

const SPORTS: Sport[] = ['football', 'rugby', 'tennis', 'olympics'];

export function ContestsPage() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [rules, setRules] = useState<ScoringRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { error } = await supabase.from('contests').insert({
      name,
      description: description || null,
      sport: sport || null,
      scoring_rule_id: scoringRuleId || null,
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    setName(''); setDescription(''); setSport(''); setScoringRuleId(''); setStartsAt(''); setEndsAt('');
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

      <form onSubmit={handleCreate} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16, color: 'var(--text-strong)' }}>Nouveau concours</h2>
        <div className="field">
          <label htmlFor="c-name">Nom</label>
          <input id="c-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Concours du jour" required />
        </div>
        <div className="field">
          <label htmlFor="c-desc">Description</label>
          <textarea id="c-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="c-sport">Sport</label>
            <select id="c-sport" value={sport} onChange={(e) => setSport(e.target.value as Sport | '')}>
              <option value="">Tous</option>
              {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="c-rule">Règle de points</label>
            <select id="c-rule" value={scoringRuleId} onChange={(e) => setScoringRuleId(e.target.value)}>
              <option value="">— Défaut (50 / +50 / cotes) —</option>
              {rules.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="c-start">Début</label>
            <input id="c-start" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="c-end">Fin</label>
            <input id="c-end" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </div>
        </div>

        {error && <div style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</div>}
        <button type="submit" className="btn" disabled={saving} style={{ alignSelf: 'flex-start' }}>
          Créer le concours
        </button>
      </form>

      <div className="card">
        <h2 style={{ margin: '0 0 12px', fontSize: 16, color: 'var(--text-strong)' }}>Concours existants</h2>
        {loading ? (
          <div style={{ color: 'var(--text-tertiary)' }}>Chargement…</div>
        ) : contests.length === 0 ? (
          <div style={{ color: 'var(--text-tertiary)' }}>Aucun concours pour l'instant.</div>
        ) : (
          <table>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-tertiary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '6px 8px' }}>Nom</th>
                <th style={{ padding: '6px 8px' }}>Sport</th>
                <th style={{ padding: '6px 8px' }}>Règle</th>
                <th style={{ padding: '6px 8px' }}>Période</th>
              </tr>
            </thead>
            <tbody>
              {contests.map((c) => (
                <tr key={c.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 8px', color: 'var(--text-strong)', fontWeight: 700 }}>{c.name}</td>
                  <td style={{ padding: '10px 8px' }}>{c.sport || 'Tous'}</td>
                  <td style={{ padding: '10px 8px' }}>{rules.find((r) => r.id === c.scoring_rule_id)?.name || 'Défaut'}</td>
                  <td style={{ padding: '10px 8px', fontSize: 12, color: 'var(--text-secondary)' }}>
                    {c.starts_at ? new Date(c.starts_at).toLocaleString('fr-FR') : '—'} → {c.ends_at ? new Date(c.ends_at).toLocaleString('fr-FR') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
