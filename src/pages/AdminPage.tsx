import { useRef, useState, type FormEvent } from 'react';
import type { PointOfInterest } from '../types/PointOfInterest';
import { DEFAULT_ACTIVATION_RADIUS } from '../types/PointOfInterest';
import { exportPoisJson, importPoisJson, poiService } from '../services/poiService';
import { DEMO_IMAGE, newId } from '../utils/poiParser';
import { asset } from '../utils/asset';
import MapScreen from './MapScreen';

interface AdminPageProps {
  pois: PointOfInterest[];
  onChange: (pois: PointOfInterest[]) => void;
  onExit: () => void;
}

// Protection côté client uniquement (MVP) : à remplacer par une authentification serveur avec l'API REST.
const ADMIN_PASSWORD = (import.meta.env.VITE_ADMIN_PASSWORD as string | undefined) || 'nantes44';
const SESSION_KEY = 'nantes-ops:admin-unlocked';

interface FormState {
  id: string | null;
  name: string;
  latitude: string;
  longitude: string;
  riddle: string;
  icon: string;
  audio: string;
  activationRadius: string;
}

const emptyForm = (): FormState => ({
  id: null,
  name: '',
  latitude: '',
  longitude: '',
  riddle: '',
  icon: DEMO_IMAGE,
  audio: '',
  activationRadius: String(DEFAULT_ACTIVATION_RADIUS),
});

export default function AdminPage({ pois, onChange, onExit }: AdminPageProps) {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const login = (e: FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, '1');
      setUnlocked(true);
    } else {
      setAuthError(true);
    }
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setUnlocked(false);
    setPassword('');
    onExit();
  };

  if (!unlocked) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-void p-6">
        <div className="holo-text text-xl tracking-[0.3em]">ACCÈS RESTREINT</div>
        <form onSubmit={login} className="panel w-full max-w-xs space-y-3 p-4">
          <input
            className="field"
            type="password"
            autoFocus
            placeholder="Code d'autorisation"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setAuthError(false);
            }}
          />
          {authError && <div className="text-xs text-alert">⚠ ACCÈS REFUSÉ</div>}
          <button className="btn-neon w-full" type="submit">AUTHENTIFIER</button>
          <button className="btn-neon w-full !border-signal !text-signal" type="button" onClick={onExit}>RETOUR</button>
        </form>
      </div>
    );
  }

  const set = <K extends keyof FormState>(key: K, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const flash = (ok: boolean, text: string) => setMessage({ ok, text });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);
    const radius = Number(form.activationRadius);
    if (!form.name.trim()) return flash(false, 'Nom obligatoire');
    if (!Number.isFinite(latitude) || Math.abs(latitude) > 90) return flash(false, 'Latitude invalide');
    if (!Number.isFinite(longitude) || Math.abs(longitude) > 180) return flash(false, 'Longitude invalide');
    if (!Number.isFinite(radius) || radius <= 0) return flash(false, "Rayon d'activation invalide");
    const poi: PointOfInterest = {
      id: form.id ?? newId(),
      name: form.name.trim(),
      latitude,
      longitude,
      riddle: form.riddle.trim(),
      icon: form.icon.trim() || DEMO_IMAGE,
      ...(form.audio.trim() ? { audio: form.audio.trim() } : {}),
      activationRadius: radius,
    };
    onChange(await poiService.save(poi));
    flash(true, form.id ? 'POI modifié' : 'POI ajouté');
    setForm(emptyForm());
  };

  const edit = (p: PointOfInterest) =>
    setForm({
      id: p.id,
      name: p.name,
      latitude: String(p.latitude),
      longitude: String(p.longitude),
      riddle: p.riddle,
      icon: p.icon,
      audio: p.audio ?? '',
      activationRadius: String(p.activationRadius),
    });

  const remove = async (p: PointOfInterest) => {
    if (!window.confirm(`Supprimer « ${p.name} » ?`)) return;
    onChange(await poiService.remove(p.id));
    if (form.id === p.id) setForm(emptyForm());
    flash(true, 'POI supprimé');
  };

  const exportJson = () => {
    const blob = new Blob([exportPoisJson(pois)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pois.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (file: File | undefined) => {
    if (!file) return;
    try {
      const list = importPoisJson(await file.text());
      onChange(await poiService.replaceAll(list));
      flash(true, `${list.length} POI importés`);
    } catch (err) {
      flash(false, `Import impossible : ${(err as Error).message}`);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  // Aperçu : le POI en cours d'édition est affiché à sa position saisie
  const previewPois: PointOfInterest[] = (() => {
    const lat = Number(form.latitude);
    const lon = Number(form.longitude);
    if (!form.latitude || !form.longitude || !Number.isFinite(lat) || !Number.isFinite(lon)) return pois;
    const draft: PointOfInterest = {
      id: form.id ?? '__draft__',
      name: form.name || 'Nouveau POI',
      latitude: lat,
      longitude: lon,
      riddle: form.riddle,
      icon: form.icon || DEMO_IMAGE,
      audio: form.audio.trim() || undefined,
      activationRadius: Number(form.activationRadius) || DEFAULT_ACTIVATION_RADIUS,
    };
    return [...pois.filter((p) => p.id !== draft.id), draft];
  })();

  return (
    <div className="h-full overflow-y-auto bg-void pb-8 pt-[env(safe-area-inset-top)]">
      <header className="sticky top-0 z-[1500] flex items-center justify-between border-b border-neon/40 bg-black/95 px-3 py-2">
        <span className="holo-text tracking-[0.25em]">ADMINISTRATION</span>
        <div className="flex gap-2">
          <button className="btn-neon !px-2 !py-1 text-xs" onClick={onExit}>← JEU</button>
          <button className="btn-neon !border-alert !px-2 !py-1 text-xs !text-alert" onClick={logout}>VERROUILLER</button>
        </div>
      </header>

      <div className="space-y-4 p-3 text-xs">
        <div className="relative h-64 border border-neon/40">
          <MapScreen
            position={null}
            pois={previewPois}
            highlightId={form.id ?? '__draft__'}
            showPoiRadius
            fitToPois
            onSelectPoi={(p) => p.id !== '__draft__' && edit(p)}
            onMapClick={(lat, lon) => setForm((f) => ({ ...f, latitude: lat.toFixed(6), longitude: lon.toFixed(6) }))}
          />
          <div className="pointer-events-none absolute bottom-1 left-1 z-[800] bg-black/70 px-1 text-[10px] text-radar">
            Touchez la carte pour positionner le POI
          </div>
        </div>

        <form onSubmit={submit} className="panel space-y-2 p-3">
          <div className="tracking-widest text-radar">{form.id ? 'MODIFIER LE POI' : 'AJOUTER UN POI'}</div>
          <input className="field" placeholder="Nom" value={form.name} onChange={(e) => set('name', e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <input className="field" inputMode="decimal" placeholder="Latitude" value={form.latitude} onChange={(e) => set('latitude', e.target.value)} />
            <input className="field" inputMode="decimal" placeholder="Longitude" value={form.longitude} onChange={(e) => set('longitude', e.target.value)} />
          </div>
          <textarea className="field" rows={3} placeholder="Énigme" value={form.riddle} onChange={(e) => set('riddle', e.target.value)} />
          <input className="field" placeholder="Image (URL ou /icons/…)" value={form.icon} onChange={(e) => set('icon', e.target.value)} />
          <input className="field" placeholder="Son (ex. /audio/chateau.mp3, optionnel)" value={form.audio} onChange={(e) => set('audio', e.target.value)} />
          <label className="flex items-center gap-2">
            <span className="whitespace-nowrap">RAYON (m)</span>
            <input className="field" inputMode="numeric" value={form.activationRadius} onChange={(e) => set('activationRadius', e.target.value)} />
          </label>
          <div className="flex gap-2">
            <button className="btn-neon flex-1" type="submit">{form.id ? 'ENREGISTRER' : '+ AJOUTER'}</button>
            {form.id && <button className="btn-neon !border-signal !text-signal" type="button" onClick={() => setForm(emptyForm())}>ANNULER</button>}
          </div>
          {message && <div className={message.ok ? 'text-radar' : 'text-alert'}>{message.ok ? '✔' : '⚠'} {message.text}</div>}
        </form>

        <div className="flex gap-2">
          <button className="btn-neon flex-1" onClick={exportJson}>⭳ EXPORT JSON</button>
          <button className="btn-neon flex-1" onClick={() => fileRef.current?.click()}>⭱ IMPORT JSON</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => void importJson(e.target.files?.[0])} />
        </div>

        <ul className="space-y-1">
          {pois.map((p) => (
            <li key={p.id} className="flex items-center gap-2 border border-neon/30 p-2">
              <img src={asset(p.icon)} alt="" className="h-8 w-8 object-contain" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-neon">{p.name}</div>
                <div className="text-neon/60">{p.latitude.toFixed(5)}, {p.longitude.toFixed(5)} · {p.activationRadius} m</div>
              </div>
              <button className="btn-neon !px-2 !py-1" onClick={() => edit(p)}>✎</button>
              <button className="btn-neon !border-alert !px-2 !py-1 !text-alert" onClick={() => void remove(p)}>🗑</button>
            </li>
          ))}
        </ul>

        <button
          className="btn-neon w-full !border-signal !text-signal"
          onClick={async () => {
            if (window.confirm('Restaurer les 10 POI de démonstration ?')) {
              onChange(await poiService.reset());
              flash(true, 'POI de démonstration restaurés');
            }
          }}
        >
          RESTAURER LES POI DE DÉMO
        </button>
      </div>
    </div>
  );
}
