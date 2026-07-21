import { useEffect, useState, type FormEvent } from 'react';
import { Check, ChevronLeft, ChevronRight, Pencil, Plus, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';

type Match = Database['public']['Tables']['matches']['Row'];
type Contest = Database['public']['Tables']['contests']['Row'];
type ScoringRule = Database['public']['Tables']['scoring_rules']['Row'];
type Sport = Database['public']['Enums']['sport_type'];
type PickType = Database['public']['Enums']['pick_type'];
type Team = { name: string; abbr?: string; color?: string; textColor?: string };

const SPORTS: Sport[] = ['football', 'rugby', 'tennis', 'olympics'];
const MATCHES_PAGE_SIZE = 50;

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

function isFutureMatch(match: Match) {
  return new Date(match.kickoff_at).getTime() > Date.now();
}

function formatKickoff(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${yy} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function EditMatchModal({ match, contests, rules, onDone, onCancel }: {
  match: Match; contests: Contest[]; rules: ScoringRule[]; onDone: () => void; onCancel: () => void;
}) {
  const home = match.home_team as unknown as Team;
  const away = match.away_team as unknown as Team;
  const odds = match.odds as unknown as { home: number; draw?: number; away: number } | null;

  const [contestId, setContestId] = useState(match.contest_id || '');
  const [sport, setSport] = useState<Sport>(match.sport);
  const [allowsDraw, setAllowsDraw] = useState(match.allows_draw);
  const [requiresScore, setRequiresScore] = useState(match.requires_score);
  const [competition, setCompetition] = useState(match.competition);
  const [homeName, setHomeName] = useState(home.name);
  const [homeAbbr, setHomeAbbr] = useState(home.abbr || '');
  const [homeColor, setHomeColor] = useState(home.color || '#00E676');
  const [awayName, setAwayName] = useState(away.name);
  const [awayAbbr, setAwayAbbr] = useState(away.abbr || '');
  const [awayColor, setAwayColor] = useState(away.color || '#4D7CFF');
  const [kickoffAt, setKickoffAt] = useState(() => {
    const d = new Date(match.kickoff_at);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [oddsHome, setOddsHome] = useState(odds ? String(odds.home) : '1.8');
  const [oddsDraw, setOddsDraw] = useState(odds?.draw !== undefined ? String(odds.draw) : '3.4');
  const [oddsAway, setOddsAway] = useState(odds ? String(odds.away) : '4.2');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedContest = contests.find((c) => c.id === contestId);
  const selectedRule = rules.find((r) => r.id === selectedContest?.scoring_rule_id);
  const oddsWeighted = selectedContest ? (selectedRule ? selectedRule.odds_weighted : true) : true;

  function handleSportChange(s: Sport) {
    setSport(s);
    setAllowsDraw(SPORT_DEFAULTS[s].allowsDraw);
    setRequiresScore(SPORT_DEFAULTS[s].requiresScore);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const updatedHome: Team = { name: homeName, abbr: homeAbbr || undefined, color: homeColor };
    const updatedAway: Team = { name: awayName, abbr: awayAbbr || undefined, color: awayColor };
    const updatedOdds = !oddsWeighted
      ? null
      : allowsDraw
        ? { home: Number(oddsHome), draw: Number(oddsDraw), away: Number(oddsAway) }
        : { home: Number(oddsHome), away: Number(oddsAway) };
    const { error } = await supabase.from('matches').update({
      contest_id: contestId || null,
      sport,
      competition,
      home_team: updatedHome,
      away_team: updatedAway,
      kickoff_at: new Date(kickoffAt).toISOString(),
      odds: updatedOdds,
      allows_draw: allowsDraw,
      requires_score: requiresScore,
    }).eq('id', match.id);
    setSaving(false);
    if (error) { setError(error.message); return; }
    onDone();
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--bg-overlay)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16, overflowY: 'auto',
    }}>
      <form onSubmit={handleSubmit} className="card form-compact" style={{ maxWidth: 520, width: '100%', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ margin: 0, fontSize: 16, color: 'var(--text-strong)' }}>Modifier le match</h2>

        <div className="form-row">
          <div className="field" style={{ flex: '1 1 140px' }}>
            <label htmlFor="em-contest">Concours</label>
            <select id="em-contest" value={contestId} onChange={(e) => setContestId(e.target.value)}>
              <option value="">— Aucun —</option>
              {contests.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field" style={{ flex: '1 1 120px' }}>
            <label htmlFor="em-sport">Sport</label>
            <select id="em-sport" value={sport} onChange={(e) => handleSportChange(e.target.value as Sport)}>
              {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="field" style={{ flex: '2 1 160px' }}>
            <label htmlFor="em-competition">Compétition</label>
            <input id="em-competition" value={competition} onChange={(e) => setCompetition(e.target.value)} required />
          </div>
        </div>

        <div className="form-row" style={{ alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={allowsDraw} onChange={(e) => setAllowsDraw(e.target.checked)} />
            Match nul possible
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={requiresScore} onChange={(e) => setRequiresScore(e.target.checked)} />
            Score à saisir au règlement
          </label>
        </div>

        <div className="form-row" style={{ flexWrap: 'nowrap' }}>
          <div className="field" style={{ flex: '1 1 80px', minWidth: 0 }}>
            <label htmlFor="em-home-name">Équipe/joueur domicile</label>
            <input id="em-home-name" value={homeName} onChange={(e) => setHomeName(e.target.value)} required />
          </div>
          <div className="field" style={{ flex: '0 0 50px' }}>
            <label htmlFor="em-home-abbr">Abrév.</label>
            <input id="em-home-abbr" value={homeAbbr} onChange={(e) => setHomeAbbr(e.target.value.toUpperCase())} maxLength={4} />
          </div>
          <div className="field" style={{ flex: '0 0 34px' }}>
            <label htmlFor="em-home-color">Couleur</label>
            <input id="em-home-color" type="color" value={homeColor} onChange={(e) => setHomeColor(e.target.value)} />
          </div>
        </div>
        <div className="form-row" style={{ flexWrap: 'nowrap' }}>
          <div className="field" style={{ flex: '1 1 80px', minWidth: 0 }}>
            <label htmlFor="em-away-name">Équipe/joueur extérieur</label>
            <input id="em-away-name" value={awayName} onChange={(e) => setAwayName(e.target.value)} required />
          </div>
          <div className="field" style={{ flex: '0 0 50px' }}>
            <label htmlFor="em-away-abbr">Abrév.</label>
            <input id="em-away-abbr" value={awayAbbr} onChange={(e) => setAwayAbbr(e.target.value.toUpperCase())} maxLength={4} />
          </div>
          <div className="field" style={{ flex: '0 0 34px' }}>
            <label htmlFor="em-away-color">Couleur</label>
            <input id="em-away-color" type="color" value={awayColor} onChange={(e) => setAwayColor(e.target.value)} />
          </div>
        </div>

        <div className="form-row">
          <div className="field" style={{ flex: '1 1 180px' }}>
            <label htmlFor="em-kickoff">Coup d'envoi</label>
            <input id="em-kickoff" type="datetime-local" value={kickoffAt} onChange={(e) => setKickoffAt(e.target.value)} required />
          </div>
        </div>
        {oddsWeighted && (
          <div className="form-row" style={{ flexWrap: 'nowrap' }}>
            <div className="field" style={{ flex: '1 1 0' }}>
              <label htmlFor="em-odds-home">Cote 1</label>
              <input id="em-odds-home" type="number" step="0.1" min="1" value={oddsHome} onChange={(e) => setOddsHome(e.target.value)} />
            </div>
            {allowsDraw && (
              <div className="field" style={{ flex: '1 1 0' }}>
                <label htmlFor="em-odds-draw">Cote N</label>
                <input id="em-odds-draw" type="number" step="0.1" min="1" value={oddsDraw} onChange={(e) => setOddsDraw(e.target.value)} />
              </div>
            )}
            <div className="field" style={{ flex: '1 1 0' }}>
              <label htmlFor="em-odds-away">Cote 2</label>
              <input id="em-odds-away" type="number" step="0.1" min="1" value={oddsAway} onChange={(e) => setOddsAway(e.target.value)} />
            </div>
          </div>
        )}

        {error && <div style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn secondary icon-only" disabled={saving} onClick={onCancel} title="Annuler" aria-label="Annuler">
            <X size={18} />
          </button>
          <button type="submit" className="btn icon-only" disabled={saving} title="Enregistrer" aria-label="Enregistrer">
            <Check size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}

function ScoreCell({ match, home, away, onDone }: { match: Match; home: Team; away: Team; onDone: () => void }) {
  const [editing, setEditing] = useState(false);
  const score = match.score as unknown as { home: number; away: number } | null;

  if (match.status === 'settled' && !editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-strong)' }}>
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
  const [rules, setRules] = useState<ScoringRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Match | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editMatch, setEditMatch] = useState<Match | null>(null);
  const [matchesPage, setMatchesPage] = useState(0);
  const [matchesTotal, setMatchesTotal] = useState(0);

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
    const from = matchesPage * MATCHES_PAGE_SIZE;
    const to = from + MATCHES_PAGE_SIZE - 1;
    const [{ data: m, error: e1, count }, { data: c, error: e2 }, { data: r, error: e3 }] = await Promise.all([
      supabase.from('matches').select('*', { count: 'exact' }).order('kickoff_at', { ascending: false }).range(from, to),
      supabase.from('contests').select('*').order('created_at', { ascending: false }),
      supabase.from('scoring_rules').select('*'),
    ]);
    if (e1 || e2 || e3) setError((e1 || e2 || e3)!.message);
    setMatches(m || []);
    setMatchesTotal(count ?? 0);
    setContests(c || []);
    setRules(r || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [matchesPage]);

  // La règle "Défaut" (aucun concours choisi, ou concours sans règle assignée)
  // pondère par les cotes -- même comportement que settle_match côté serveur.
  const selectedContest = contests.find((c) => c.id === contestId);
  const selectedRule = rules.find((r) => r.id === selectedContest?.scoring_rule_id);
  const oddsWeighted = selectedContest ? (selectedRule ? selectedRule.odds_weighted : true) : true;

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const home: Team = { name: homeName, abbr: homeAbbr || undefined, color: homeColor };
    const away: Team = { name: awayName, abbr: awayAbbr || undefined, color: awayColor };
    const odds = !oddsWeighted
      ? null
      : allowsDraw
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
    if (matchesPage === 0) load(); else setMatchesPage(0);
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    setError(null);
    const { error } = await supabase.from('matches').delete().eq('id', confirmDelete.id);
    setDeleting(false);
    if (error) { setError(error.message); return; }
    setConfirmDelete(null);
    if (matches.length === 1 && matchesPage > 0) setMatchesPage((p) => p - 1); else load();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-strong)' }}>Matchs</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
          Règle un match une fois le résultat connu : les points de tous les pronos sont recalculés côté serveur.
        </p>
      </div>

      <form onSubmit={handleCreate} className="card form-compact" style={{ display: 'flex', flexDirection: 'column' }}>
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
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={allowsDraw} onChange={(e) => setAllowsDraw(e.target.checked)} />
            Match nul possible
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={requiresScore} onChange={(e) => setRequiresScore(e.target.checked)} />
            Score à saisir au règlement
          </label>
        </div>

        <div className="form-row" style={{ flexWrap: 'nowrap' }}>
          <div className="field" style={{ flex: '1 1 80px', minWidth: 0 }}>
            <label htmlFor="m-home-name">Équipe/joueur domicile</label>
            <input id="m-home-name" value={homeName} onChange={(e) => setHomeName(e.target.value)} required />
          </div>
          <div className="field" style={{ flex: '0 0 50px' }}>
            <label htmlFor="m-home-abbr">Abrév.</label>
            <input id="m-home-abbr" value={homeAbbr} onChange={(e) => setHomeAbbr(e.target.value.toUpperCase())} maxLength={4} />
          </div>
          <div className="field" style={{ flex: '0 0 34px' }}>
            <label htmlFor="m-home-color">Couleur</label>
            <input id="m-home-color" type="color" value={homeColor} onChange={(e) => setHomeColor(e.target.value)} />
          </div>
        </div>
        <div className="form-row" style={{ flexWrap: 'nowrap' }}>
          <div className="field" style={{ flex: '1 1 80px', minWidth: 0 }}>
            <label htmlFor="m-away-name">Équipe/joueur extérieur</label>
            <input id="m-away-name" value={awayName} onChange={(e) => setAwayName(e.target.value)} required />
          </div>
          <div className="field" style={{ flex: '0 0 50px' }}>
            <label htmlFor="m-away-abbr">Abrév.</label>
            <input id="m-away-abbr" value={awayAbbr} onChange={(e) => setAwayAbbr(e.target.value.toUpperCase())} maxLength={4} />
          </div>
          <div className="field" style={{ flex: '0 0 34px' }}>
            <label htmlFor="m-away-color">Couleur</label>
            <input id="m-away-color" type="color" value={awayColor} onChange={(e) => setAwayColor(e.target.value)} />
          </div>
        </div>

        <div className="form-row">
          <div className="field" style={{ flex: '1 1 180px' }}>
            <label htmlFor="m-kickoff">Coup d'envoi</label>
            <input id="m-kickoff" type="datetime-local" value={kickoffAt} onChange={(e) => setKickoffAt(e.target.value)} required />
          </div>
        </div>
        {oddsWeighted && (
          <div className="form-row" style={{ flexWrap: 'nowrap' }}>
            <div className="field" style={{ flex: '1 1 0' }}>
              <label htmlFor="m-odds-home">Cote 1</label>
              <input id="m-odds-home" type="number" step="0.1" min="1" value={oddsHome} onChange={(e) => setOddsHome(e.target.value)} />
            </div>
            {allowsDraw && (
              <div className="field" style={{ flex: '1 1 0' }}>
                <label htmlFor="m-odds-draw">Cote N</label>
                <input id="m-odds-draw" type="number" step="0.1" min="1" value={oddsDraw} onChange={(e) => setOddsDraw(e.target.value)} />
              </div>
            )}
            <div className="field" style={{ flex: '1 1 0' }}>
              <label htmlFor="m-odds-away">Cote 2</label>
              <input id="m-odds-away" type="number" step="0.1" min="1" value={oddsAway} onChange={(e) => setOddsAway(e.target.value)} />
            </div>
          </div>
        )}
        {!oddsWeighted && (
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)' }}>
            La règle de points de ce concours ne pondère pas par les cotes : aucune cote à saisir.
          </p>
        )}

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
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {matches.map((m) => {
              const home = m.home_team as unknown as Team;
              const away = m.away_team as unknown as Team;
              return (
                <div key={m.id} style={{ padding: '10px 0', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0, flexWrap: 'wrap', rowGap: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-strong)' }}>
                        {home.name} — {away.name}
                      </span>
                      <span className="badge" style={{
                        fontSize: 10, height: 18, padding: '0 7px',
                        background: m.status === 'settled' ? 'var(--success-soft)' : m.status === 'locked' ? 'var(--bg-surface-3)' : 'var(--accent-soft)',
                        color: m.status === 'settled' ? 'var(--success)' : m.status === 'locked' ? 'var(--text-secondary)' : 'var(--accent)',
                      }}>{m.status}</span>
                      {!m.allows_draw && <span className="badge" style={{ fontSize: 10, height: 18, padding: '0 7px', background: 'var(--bg-surface-3)', color: 'var(--text-tertiary)' }}>Sans nul</span>}
                      {!m.requires_score && <span className="badge" style={{ fontSize: 10, height: 18, padding: '0 7px', background: 'var(--bg-surface-3)', color: 'var(--text-tertiary)' }}>Sans score</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 4, flex: 'none' }}>
                      {isFutureMatch(m) && (
                        <button
                          type="button"
                          className="btn secondary icon-only sm"
                          onClick={() => setEditMatch(m)}
                          title="Modifier le match"
                          aria-label="Modifier le match"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn secondary icon-only sm"
                        onClick={() => setConfirmDelete(m)}
                        title="Supprimer le match"
                        aria-label="Supprimer le match"
                        style={{ color: 'var(--danger)' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{formatKickoff(m.kickoff_at)}</span>
                    <ScoreCell match={m} home={home} away={away} onDone={load} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!loading && matchesTotal > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            {matchesPage * MATCHES_PAGE_SIZE + 1}–{Math.min(matchesPage * MATCHES_PAGE_SIZE + matches.length, matchesTotal)} sur {matchesTotal} matchs
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="btn secondary icon-only sm"
              disabled={matchesPage === 0}
              onClick={() => setMatchesPage((p) => Math.max(0, p - 1))}
              title="Page précédente"
              aria-label="Page précédente"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              type="button"
              className="btn secondary icon-only sm"
              disabled={(matchesPage + 1) * MATCHES_PAGE_SIZE >= matchesTotal}
              onClick={() => setMatchesPage((p) => p + 1)}
              title="Page suivante"
              aria-label="Page suivante"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {editMatch && (
        <EditMatchModal
          match={editMatch}
          contests={contests}
          rules={rules}
          onDone={() => { setEditMatch(null); load(); }}
          onCancel={() => setEditMatch(null)}
        />
      )}

      {confirmDelete && (
        <div style={{
          position: 'fixed', inset: 0, background: 'var(--bg-overlay)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }}>
          <div className="card" style={{ maxWidth: 380, width: '90%' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 16, color: 'var(--text-strong)' }}>
              Supprimer {(confirmDelete.home_team as unknown as Team).name} — {(confirmDelete.away_team as unknown as Team).name} ?
            </h2>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-secondary)' }}>
              Cette action supprime définitivement le match ainsi que tous les pronostics des joueurs sur cette
              rencontre : leurs points, bonus et malus attribués disparaissent avec. Impossible à annuler.
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
