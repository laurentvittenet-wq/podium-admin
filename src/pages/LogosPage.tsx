import { useEffect, useState, type FormEvent } from 'react';
import { Check, Link2, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';

type Team = Database['public']['Tables']['teams']['Row'];
type Sport = Database['public']['Enums']['sport_type'];

const SPORTS: Sport[] = ['football', 'rugby', 'tennis', 'olympics'];

function slugify(text: string): string {
  return text
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/** supabase-js only exposes a generic "non-2xx status code" message for edge function errors; the actual reason lives in the response body. */
async function describeFunctionError(error: unknown): Promise<string> {
  const context = (error as { context?: Response })?.context;
  if (context && typeof context.json === 'function') {
    try {
      const body = await context.clone().json();
      if (body?.message) return body.message as string;
      if (body?.error) return body.error as string;
    } catch { /* not JSON, fall through */ }
  }
  return (error as { message?: string })?.message ?? 'Erreur inconnue.';
}

function TeamLogoThumb({ team }: { team: Team }) {
  return team.logo_url ? (
    <img src={team.logo_url} alt={team.name} style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-2)' }} />
  ) : (
    <div style={{
      width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)',
    }}>
      {team.name.slice(0, 3).toUpperCase()}
    </div>
  );
}

function TeamRow({ team, onDeleteLogo, onReplaceUrl, onUploadFile, busy }: {
  team: Team;
  onDeleteLogo: (t: Team) => void;
  onReplaceUrl: (t: Team, url: string) => void;
  onUploadFile: (t: Team, file: File) => void;
  busy: boolean;
}) {
  const [replacing, setReplacing] = useState(false);
  const [url, setUrl] = useState('');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 8px', borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <TeamLogoThumb team={team} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: 'var(--text-strong)' }}>{team.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{team.sport} · {team.source === 'fetched' ? 'récupéré automatiquement' : 'ajouté manuellement'}</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <label className="btn secondary icon-only sm" title="Remplacer par un fichier" aria-label="Remplacer par un fichier" style={{ cursor: busy ? 'not-allowed' : 'pointer' }}>
            <Upload size={15} />
            <input type="file" accept="image/*" disabled={busy} style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadFile(team, f); e.target.value = ''; }} />
          </label>
          <button type="button" className="btn secondary icon-only sm" disabled={busy} onClick={() => setReplacing((r) => !r)} title="Remplacer via une URL" aria-label="Remplacer via une URL">
            <Link2 size={15} />
          </button>
          <button type="button" className="btn secondary icon-only sm" disabled={busy || !team.logo_url} onClick={() => onDeleteLogo(team)} title="Supprimer le logo" aria-label="Supprimer le logo" style={{ color: 'var(--danger)' }}>
            <Trash2 size={15} />
          </button>
        </div>
      </div>
      {replacing && (
        <div style={{ display: 'flex', gap: 8, paddingLeft: 52 }}>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…/logo.png" style={{ flex: 1 }} />
          <button type="button" className="btn icon-only sm" disabled={busy || !url.trim()}
            onClick={() => { onReplaceUrl(team, url.trim()); setUrl(''); setReplacing(false); }}
            title="Valider" aria-label="Valider">
            <Check size={15} />
          </button>
          <button type="button" className="btn secondary icon-only sm" onClick={() => { setReplacing(false); setUrl(''); }} title="Annuler" aria-label="Annuler">
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

export function LogosPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyTeamId, setBusyTeamId] = useState<string | null>(null);

  const [league, setLeague] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchSummary, setSearchSummary] = useState<{ count: number; missing: number; league?: string; season?: number } | null>(null);

  const [addSport, setAddSport] = useState<Sport>('football');
  const [addName, setAddName] = useState('');
  const [adding, setAdding] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from('teams').select('*').order('sport').order('name');
    if (error) { setError(error.message); setLoading(false); return; }
    setTeams(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!league.trim()) return;
    setSearching(true);
    setError(null);
    setSearchSummary(null);
    const { data, error } = await supabase.functions.invoke<{ count: number; teams: { name: string; logoUrl: string | null; fetched: boolean }[]; league?: string; season?: number }>('team-logos', {
      body: { action: 'search', sport: 'football', league: league.trim() },
    });
    setSearching(false);
    if (error) { setError(await describeFunctionError(error)); return; }
    if (data) {
      const missing = data.teams.filter((t) => !t.fetched).length;
      setSearchSummary({ count: data.count, missing, league: data.league, season: data.season });
    }
    load();
  }

  async function handleAddTeam(e: FormEvent) {
    e.preventDefault();
    if (!addName.trim()) return;
    setAdding(true);
    setError(null);
    const { error } = await supabase.from('teams').insert({ sport: addSport, name: addName.trim(), source: 'manual' });
    setAdding(false);
    if (error) { setError(error.message); return; }
    setAddName('');
    load();
  }

  async function handleDeleteLogo(team: Team) {
    setBusyTeamId(team.id);
    setError(null);
    const { error } = await supabase.from('teams').update({ logo_url: null }).eq('id', team.id);
    setBusyTeamId(null);
    if (error) { setError(error.message); return; }
    load();
  }

  async function handleReplaceUrl(team: Team, url: string) {
    setBusyTeamId(team.id);
    setError(null);
    const { error } = await supabase.functions.invoke('team-logos', {
      body: { action: 'import-url', teamId: team.id, imageUrl: url },
    });
    setBusyTeamId(null);
    if (error) { setError(await describeFunctionError(error)); return; }
    load();
  }

  async function handleUploadFile(team: Team, file: File) {
    setBusyTeamId(team.id);
    setError(null);
    const ext = file.name.split('.').pop() || 'png';
    const path = `${team.sport}/${slugify(team.name)}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('team-logos').upload(path, file, { upsert: true, contentType: file.type || undefined });
    if (uploadError) { setBusyTeamId(null); setError(uploadError.message); return; }
    const { data: pub } = supabase.storage.from('team-logos').getPublicUrl(path);
    const { error: updateError } = await supabase.from('teams').update({ logo_url: `${pub.publicUrl}?v=${Date.now()}`, source: 'manual' }).eq('id', team.id);
    setBusyTeamId(null);
    if (updateError) { setError(updateError.message); return; }
    load();
  }

  const bySport = SPORTS.map((s) => ({ sport: s, teams: teams.filter((t) => t.sport === s) })).filter((g) => g.teams.length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-strong)' }}>Logos des équipes</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
          Récupère automatiquement les logos d'une compétition de football depuis API-Football, pour les afficher dans les encarts de rencontres à la place des abréviations. Pour les autres sports, ajoute les équipes et leurs logos manuellement ci-dessous.
        </p>
      </div>

      <form onSubmit={handleSearch} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16, color: 'var(--text-strong)' }}>Récupérer les logos d'une compétition (football)</h2>
        <div className="field">
          <label htmlFor="l-league">Compétition (nom reconnu par API-Football)</label>
          <input id="l-league" value={league} onChange={(e) => setLeague(e.target.value)} placeholder="Ligue 1" required />
        </div>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)' }}>
          Exemples : "Ligue 1", "Ligue 2", "Premier League", "Champions League". La saison en cours est sélectionnée automatiquement.
        </p>

        {error && <div style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</div>}
        {searchSummary && (
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {searchSummary.league ? `${searchSummary.league} (saison ${searchSummary.season}) — ` : ''}
            {searchSummary.count} équipe{searchSummary.count > 1 ? 's' : ''} trouvée{searchSummary.count > 1 ? 's' : ''}
            {searchSummary.missing > 0 ? ` — ${searchSummary.missing} sans logo disponible (remplace-les manuellement ci-dessous).` : '.'}
          </div>
        )}

        <button type="submit" className="btn icon-only" disabled={searching || !league.trim()}
          title={searching ? 'Recherche…' : 'Rechercher et récupérer les logos'}
          aria-label={searching ? 'Recherche…' : 'Rechercher et récupérer les logos'}
          style={{ alignSelf: 'flex-start' }}>
          <Search size={18} />
        </button>
      </form>

      <form onSubmit={handleAddTeam} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16, color: 'var(--text-strong)' }}>Ajouter une équipe manuellement</h2>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)' }}>
          Utile pour le rugby, le tennis, les JO, ou toute équipe absente d'API-Football. Ajoute d'abord l'équipe, puis attache-lui un logo (upload ou URL) depuis la liste ci-dessous.
        </p>
        <div className="form-row">
          <div className="field" style={{ flex: '1 1 160px' }}>
            <label htmlFor="a-sport">Sport</label>
            <select id="a-sport" value={addSport} onChange={(e) => setAddSport(e.target.value as Sport)}>
              {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="field" style={{ flex: '2 1 240px' }}>
            <label htmlFor="a-name">Nom de l'équipe</label>
            <input id="a-name" value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Stade Toulousain" required />
          </div>
        </div>
        <button type="submit" className="btn icon-only" disabled={adding || !addName.trim()}
          title="Ajouter l'équipe" aria-label="Ajouter l'équipe" style={{ alignSelf: 'flex-start' }}>
          <Plus size={18} />
        </button>
      </form>

      <div className="card">
        <h2 style={{ margin: '0 0 4px', fontSize: 16, color: 'var(--text-strong)' }}>Équipes enregistrées</h2>
        {loading ? (
          <div style={{ color: 'var(--text-tertiary)', padding: '10px 8px' }}>Chargement…</div>
        ) : teams.length === 0 ? (
          <div style={{ color: 'var(--text-tertiary)', padding: '10px 8px' }}>Aucune équipe pour l'instant. Lance une recherche ci-dessus.</div>
        ) : (
          bySport.map((g) => (
            <div key={g.sport} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-tertiary)', padding: '6px 8px' }}>{g.sport}</div>
              {g.teams.map((t) => (
                <TeamRow key={t.id} team={t} busy={busyTeamId === t.id}
                  onDeleteLogo={handleDeleteLogo} onReplaceUrl={handleReplaceUrl} onUploadFile={handleUploadFile} />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
