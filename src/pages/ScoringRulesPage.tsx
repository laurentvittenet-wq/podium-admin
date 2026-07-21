import { useEffect, useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';

type ScoringRule = Database['public']['Tables']['scoring_rules']['Row'];
type ConfidenceLevel = { multiplier: number; malus: number };

const DEFAULT_LEVELS: ConfidenceLevel[] = [
  { multiplier: 1, malus: 0 },
  { multiplier: 2, malus: 25 },
  { multiplier: 3, malus: 50 },
];

export function ScoringRulesPage() {
  const [rules, setRules] = useState<ScoringRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [basePoints, setBasePoints] = useState(50);
  const [exactBonus, setExactBonus] = useState(50);
  const [oddsWeighted, setOddsWeighted] = useState(true);
  const [levels, setLevels] = useState<ConfidenceLevel[]>(DEFAULT_LEVELS);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from('scoring_rules').select('*').order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setRules(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { error } = await supabase.from('scoring_rules').insert({
      name,
      base_points: basePoints,
      exact_score_bonus: exactBonus,
      odds_weighted: oddsWeighted,
      confidence_levels: levels as unknown as Database['public']['Tables']['scoring_rules']['Insert']['confidence_levels'],
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    setName('');
    setBasePoints(50);
    setExactBonus(50);
    setOddsWeighted(true);
    setLevels(DEFAULT_LEVELS);
    load();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-strong)' }}>Règles de points</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
          Un concours applique une seule règle. Le calcul se fait côté serveur (fonction <code>settle_match</code>), jamais côté client.
        </p>
      </div>

      <form onSubmit={handleCreate} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16, color: 'var(--text-strong)' }}>Nouvelle règle</h2>
        <div className="field">
          <label htmlFor="rule-name">Nom</label>
          <input id="rule-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Barème standard" required />
        </div>
        <div className="form-row">
          <div className="field" style={{ flex: '1 1 180px' }}>
            <label htmlFor="base">Points bon résultat (1/N/2)</label>
            <input id="base" type="number" min={0} value={basePoints} onChange={(e) => setBasePoints(Number(e.target.value))} />
          </div>
          <div className="field" style={{ flex: '1 1 180px' }}>
            <label htmlFor="bonus">Bonus score exact</label>
            <input id="bonus" type="number" min={0} value={exactBonus} onChange={(e) => setExactBonus(Number(e.target.value))} />
          </div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={oddsWeighted} onChange={(e) => setOddsWeighted(e.target.checked)} />
          Pondérer par les cotes (points × cote)
        </label>

        <div>
          <div style={{ font: '600 13px var(--font-ui)', color: 'var(--text-secondary)', marginBottom: 8 }}>
            Multiplicateur de confiance — malus si le prono est faux
          </div>
          <div className="form-row" style={{ gap: 12 }}>
            {levels.map((lvl, i) => (
              <div key={lvl.multiplier} className="field" style={{ flex: '1 1 100px' }}>
                <label>×{lvl.multiplier} malus</label>
                <input
                  type="number" min={0} value={lvl.malus}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setLevels((prev) => prev.map((l, idx) => (idx === i ? { ...l, malus: v } : l)));
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {error && <div style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</div>}
        <button
          type="submit"
          className="btn icon-only"
          disabled={saving}
          title="Créer la règle"
          aria-label="Créer la règle"
          style={{ alignSelf: 'flex-start' }}
        >
          <Plus size={18} />
        </button>
      </form>

      <div className="card">
        <h2 style={{ margin: '0 0 12px', fontSize: 16, color: 'var(--text-strong)' }}>Règles existantes</h2>
        {loading ? (
          <div style={{ color: 'var(--text-tertiary)' }}>Chargement…</div>
        ) : rules.length === 0 ? (
          <div style={{ color: 'var(--text-tertiary)' }}>Aucune règle pour l'instant.</div>
        ) : (
          <div className="table-scroll">
          <table>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-tertiary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '6px 8px' }}>Nom</th>
                <th style={{ padding: '6px 8px' }}>Base</th>
                <th style={{ padding: '6px 8px' }}>Bonus exact</th>
                <th style={{ padding: '6px 8px' }}>Cotes</th>
                <th style={{ padding: '6px 8px' }}>Confiance</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 8px', color: 'var(--text-strong)', fontWeight: 700 }}>{r.name}</td>
                  <td style={{ padding: '10px 8px', fontFamily: 'var(--font-mono)' }}>{r.base_points}</td>
                  <td style={{ padding: '10px 8px', fontFamily: 'var(--font-mono)' }}>+{r.exact_score_bonus}</td>
                  <td style={{ padding: '10px 8px' }}>{r.odds_weighted ? 'Oui' : 'Non'}</td>
                  <td style={{ padding: '10px 8px', fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {(r.confidence_levels as unknown as ConfidenceLevel[]).map((l) => `×${l.multiplier}(-${l.malus})`).join(' · ')}
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
