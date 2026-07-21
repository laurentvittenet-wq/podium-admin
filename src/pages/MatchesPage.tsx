import { useEffect, useState, type FormEvent } from 'react';
import { Check, Pencil, Plus, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';

type Match = Database['public']['Tables']['matches']['Row'];
type Contest = Database['public']['Tables']['contests']['Row'];
type Sport = Database['public']['Enums']['sport_type'];
type PickType = Database['public']['Enums']['pick_type'];
type Team = { name: string; abbr?: string; color?: string; textColor?: string };

const SPORTS: Sport[] = ['football', 'rugby', 'tennis', 'olympics'];

// Valeurs par défaut proposées selon le sport ; l'animateur peut toujours les
// ajuster à la création d'un match (cases à cocher), donc ce ne sont que des
// pré-réglages, pas une règle figée par sport.
const SPORT_DEFAULTS: Record<Sport, { allowsDraw: boolean; requiresScore: boolean }> = {
  football: { allowsDraw: true, requiresScore: true },
  rugby: { allowsDraw: true, requiresScore: false },
  tennis: { allowsDraw: false, requiresScore: false },
  olympics: { allowsDraw: false, requiresScore: false },
};

function resultLabel(pick: PickType, home: Team, away: Team) {
  if (pick === 'draw') return 'Match nul';
  return pick === 'home' ? home.name : away.name;
}

function SettleForm({ match, home, away, editingSettled, onDone, onCancel }: {
  match: Match; home: Team; away: Team; editingSettled: boolean; onDone: () => void; onCancel?: () => void;
}) {
  const score = match.score as unknown as { home: number; away: number } | null;
  const [homeScore, setHomeScore] = useState(score ? String(score.home) : '0');
  const [awayScore, setAwayScore] = useState(score ? String(score.away) : '0');
  const [result, setResult] = useState<PickType | null>(match.result);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSettle() {
    setBusy(true);
    setError(null);
    const { error } = match.requires_score
      ? await supabase.rpc('settle_match', {
          p_match_id: match.id,
          p_home_score: Number(homeScore),
          p_away_score: Number(awayScore),
        })
      : await supabase.rpc('settle_match', {
          p_match_id: match.id,
          p_result: result ?? undefined,
        });
    setBusy(false);
    if (error) { setError(error.message); return; }
    onDone();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {match.requires_score ? (
          <>
            <input type="number" min={0} value={homeScore} onChange={(e) => setHomeScore(e.target.value)}
              style={{ width: 44, height: 30, textAlign: 'center', background: 'var(--bg-surface-3)', border: '1px solid var(--border-strong)', borderRadius: 8, color: 'var(--text-strong)' }} />
            <span style={{ color: 'var(--text-tertiary)' }}>:</span>
            <input type="number" min={0} value={awayScore} onChange={(e) => setAwayScore(e.target.value)}
              style={{ width: 44, height: 30, textAlign: 'center', background: 'var(--bg-surface-3)', border: '1px solid var(--border-strong)', borderRadius: 8, color: 'var(--text-strong)' }} />
          </>
        ) : (
          <>
            {([
              ['home', home.abbr || home.name] as const,
              ...(match.allows_draw ? [['draw', 'Nul'] as const] : []),
              ['away', away.abbr || away.name] as const,
            ]).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setResult(value)}
                style={{
                  height: 30, padding: '0 10px', fontSize: 12, fontWeight: 700, borderRadius: 8, cursor: 'pointer',
                  border: `1.5px solid ${result === value ? 'transparent' : 'var(--border-strong)'}`,
                  background: result === value ? 'var(--accent-soft)' : 'var(--bg-surface-3)',
                  color: result === value ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                {label}
              </button>
            ))}
          </>
        )}
        <button
          type="button"
          className="btn icon-only sm"
          disabled={busy || (!match.requires_score && !result)}
          onClick={handleSettle}
          title={editingSettled ? 'Enregistrer' : 'Régler'}
          aria-label={editingSettled ? 'Enregistrer' : 'Régler'}
        >
          <Check size={15} />
        </button>
        {onCancel && (
          <button
            type="button"
            className="btn secondary icon-only sm"
            disabled={busy}
            onClick={onCancel}
            title="Annuler"
            aria-label="Annuler"
          >
            <X size={15} />
          </button>
        )}
      </div>
      {editingSettled && (
        <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>
          Recalculera les points de tous les pronostics sur ce match.
        </span>
      )}
      {error && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{error}</span>}
    </div>
  );
}

function ScoreCell({ match, home, away, onDone }: { match: Match; home: Team; away: Team; onDone: () => void }) {
  const [editing, setEditing] = useState(false);
  const score = match.score as unknown as { home: number; away: number } | null;

  if (match.status === 'settled' && !editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-strong)' }}>
          {match.requires_score ? `${score?.home}:${score?.away}` : match.result ? resultLabel(match.result, home, away) : '—'}
        </span>
        <button
          type="button"
          className="btn secondary icon-only sm"
          onClick={() => setEditing(true)}
          title="Modifier"
          aria-label="Modifier"
        >
          <Pencil size={15} />
        </button>
      </div>
    );
  }

  return (
    <SettleForm
      match={match}
      home={home}
      away={away}
      editingSettled={match.status === 'settled'}
      onDone={() => { setEditing(false); onDone(); }}
      onCancel={match.status === 'settled' ? () => setEditing(false) : undefined}
    />
  );
}

export function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [contestId, setContestId] = useState('');
  const [sport, setSport] = useState<Sport>('football');
  const [allowsDraw, setAllowsDraw] = useState(SPORT_DEFAULTS.football.allowsDraw);
  const [requiresScore, setRequiresScore] = useState(SPORT_DEFAULTS.football.requiresScore);
  const [competition, setCompetition] = useState('');
  const [homeName, setHomeName] = useState('');
  const [homeAbbr, setHomeAbbr] = useState('');
  const [homeColor, setHomeColor] = useState('#00E676');
  const [awayName, setAwayName] = useState('');
  const [awayAbbr, setAwayAbbr] = useState('');
  const [awayColor, setAwayColor] = useState('#4D7CFF');
  const [kickoffAt, setKickoffAt] = useState('');
  const [oddsHome, setOddsHome] = useState('1.8');
  const [oddsDraw, setOddsDraw] = useState('3.4');
  const [oddsAway, setOddsAway] = useState('4.2');
  const [saving, setSaving] = useState(false);

  function handleSportChange(s: Sport) {
    setSport(s);
    setAllowsDraw(SPORT_DEFAULTS[s].allowsDraw);
    setRequiresScore(SPORT_DEFAULTS[s].requiresScore);
  }

  async function load() {
    setLoading(true);
    const [{ data: m, error: e1 }, { data: c, error: e2 }] = await Promise.all([
      supabase.from('matches').select('*').order('kickoff_at', { ascending: false }),
      supabase.from('contests').select('*').order('created_at', { ascending: false }),
    ]);
    if (e1 || e2) setError((e1 || e2)!.message);
    setMatches(m || []);
    setContests(c || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const home: Team = { name: homeName, abbr: homeAbbr || undefined, color: homeColor };
    const away: Team = { name: awayName, abbr: awayAbbr || undefined, color: awayColor };
    const odds = allowsDraw
      ? { home: Number(oddsHome), draw: Number(oddsDraw), away: Number(oddsAway) }
      : { home: Number(oddsHome), away: Number(oddsAway) };
    const { error } = await supabase.from('matches').insert({
      contest_id: contestId || null,
      sport,
      competition,
      home_team: home,
      away_team: away,
      kickoff_at: kickoffAt ? new Date(kickoffAt).toISOString() : new Date().toISOString(),
      odds,
      allows_draw: allowsDraw,
      requires_score: requiresScore,
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    setCompetition(''); setHomeName(''); setHomeAbbr(''); setAwayName(''); setAwayAbbr(''); setKickoffAt('');
    load();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-strong)' }}>Matchs</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
          Règle un match une fois le résultat connu : les points de tous les pronos sont recalculés côté serveur.
        </p>
      </div>

      <form onSubmit={handleCreate} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16, color: 'var(--text-strong)' }}>Nouveau match</h2>
        <div className="form-row">
          <div className="field" style={{ flex: '1 1 140px' }}>
            <label htmlFor="m-contest">Concours</label>
            <select id="m-contest" value={contestId} onChange={(e) => setContestId(e.target.value)}>
              <option value="">— Aucun —</option>
              {contests.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field" style={{ flex: '1 1 120px' }}>
            <label htmlFor="m-sport">Sport</label>
            <select id="m-sport" value={sport} onChange={(e) => handleSportChange(e.target.value as Sport)}>
              {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="field" style={{ flex: '2 1 160px' }}>
            <label htmlFor="m-competition">Compétition</label>
            <input id="m-competition" value={competition} onChange={(e) => setCompetition(e.target.value)} placeholder="Ligue 1" required />
          </div>
        </div>

        <div className="form-row" style={{ alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={allowsDraw} onChange={(e) => setAllowsDraw(e.target.checked)} />
            Match nul possible
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={requiresScore} onChange={(e) => setRequiresScore(e.target.checked)} />
            Score à saisir au règlement
          </label>
        </div>

        <div className="form-row">
          <div className="field" style={{ flex: '1 1 160px' }}>
            <label htmlFor="m-home-name">Équipe/joueur domicile</label>
            <input id="m-home-name" value={homeName} onChange={(e) => setHomeName(e.target.value)} required />
          </div>
          <div className="field" style={{ flex: '0 1 90px' }}>
            <label htmlFor="m-home-abbr">Abrév.</label>
            <input id="m-home-abbr" value={homeAbbr} onChange={(e) => setHomeAbbr(e.target.value.toUpperCase())} maxLength={4} />
          </div>
          <div className="field" style={{ flex: '0 0 70px' }}>
            <label htmlFor="m-home-color">Couleur</label>
            <input id="m-home-color" type="color" value={homeColor} onChange={(e) => setHomeColor(e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="field" style={{ flex: '1 1 160px' }}>
            <label htmlFor="m-away-name">Équipe/joueur extérieur</label>
            <input id="m-away-name" value={awayName} onChange={(e) => setAwayName(e.target.value)} required />
          </div>
          <div className="field" style={{ flex: '0 1 90px' }}>
            <label htmlFor="m-away-abbr">Abrév.</label>
            <input id="m-away-abbr" value={awayAbbr} onChange={(e) => setAwayAbbr(e.target.value.toUpperCase())} maxLength={4} />
          </div>
          <div className="field" style={{ flex: '0 0 70px' }}>
            <label htmlFor="m-away-color">Couleur</label>
            <input id="m-away-color" type="color" value={awayColor} onChange={(e) => setAwayColor(e.target.value)} />
          </div>
        </div>

        <div className="form-row">
          <div className="field" style={{ flex: '1 1 180px' }}>
            <label htmlFor="m-kickoff">Coup d'envoi</label>
            <input id="m-kickoff" type="datetime-local" value={kickoffAt} onChange={(e) => setKickoffAt(e.target.value)} required />
          </div>
          <div className="field" style={{ flex: '0 1 90px' }}>
            <label htmlFor="m-odds-home">Cote 1</label>
            <input id="m-odds-home" type="number" step="0.1" min="1" value={oddsHome} onChange={(e) => setOddsHome(e.target.value)} />
          </div>
          {allowsDraw && (
            <div className="field" style={{ flex: '0 1 90px' }}>
              <label htmlFor="m-odds-draw">Cote N</label>
              <input id="m-odds-draw" type="number" step="0.1" min="1" value={oddsDraw} onChange={(e) => setOddsDraw(e.target.value)} />
            </div>
          )}
          <div className="field" style={{ flex: '0 1 90px' }}>
            <label htmlFor="m-odds-away">Cote 2</label>
            <input id="m-odds-away" type="number" step="0.1" min="1" value={oddsAway} onChange={(e) => setOddsAway(e.target.value)} />
          </div>
        </div>

        {error && <div style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</div>}
        <button
          type="submit"
          className="btn icon-only"
          disabled={saving}
          title="Créer le match"
          aria-label="Créer le match"
          style={{ alignSelf: 'flex-start' }}
        >
          <Plus size={18} />
        </button>
      </form>

      <div className="card">
        <h2 style={{ margin: '0 0 12px', fontSize: 16, color: 'var(--text-strong)' }}>Matchs</h2>
        {loading ? (
          <div style={{ color: 'var(--text-tertiary)' }}>Chargement…</div>
        ) : matches.length === 0 ? (
          <div style={{ color: 'var(--text-tertiary)' }}>Aucun match pour l'instant.</div>
        ) : (
          <div className="table-scroll">
          <table>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-tertiary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '6px 8px' }}>Match</th>
                <th style={{ padding: '6px 8px' }}>Coup d'envoi</th>
                <th style={{ padding: '6px 8px' }}>Statut</th>
                <th style={{ padding: '6px 8px' }}>Résultat / Régler</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => {
                const home = m.home_team as unknown as Team;
                const away = m.away_team as unknown as Team;
                return (
                  <tr key={m.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
                      <div style={{ color: 'var(--text-strong)', fontWeight: 700 }}>{home.name} — {away.name}</div>
                      <div style={{ marginTop: 3, display: 'flex', gap: 4 }}>
                        {!m.allows_draw && <span className="badge" style={{ background: 'var(--bg-surface-3)', color: 'var(--text-tertiary)' }}>Sans nul</span>}
                        {!m.requires_score && <span className="badge" style={{ background: 'var(--bg-surface-3)', color: 'var(--text-tertiary)' }}>Sans score</span>}
                      </div>
                    </td>
                    <td style={{ padding: '10px 8px', fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{new Date(m.kickoff_at).toLocaleString('fr-FR')}</td>
                    <td style={{ padding: '10px 8px' }}>
                      <span className="badge" style={{
                        background: m.status === 'settled' ? 'var(--success-soft)' : m.status === 'locked' ? 'var(--bg-surface-3)' : 'var(--accent-soft)',
                        color: m.status === 'settled' ? 'var(--success)' : m.status === 'locked' ? 'var(--text-secondary)' : 'var(--accent)',
                      }}>{m.status}</span>
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <ScoreCell match={m} home={home} away={away} onDone={load} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
