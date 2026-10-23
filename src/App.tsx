import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GeoPosition, PointOfInterest } from './types/PointOfInterest';
import { poiService } from './services/poiService';
import { useGeolocation } from './hooks/useGeolocation';
import { useCompass } from './hooks/useCompass';
import { useBattery } from './hooks/useBattery';
import { usePoiTracking } from './hooks/usePoiTracking';
import { requestNotificationPermission, unlockAudio } from './utils/feedback';
import { AudioPanel, AudioProvider, useAudio } from './components/AudioManager';
import HudOverlay from './components/HudOverlay';
import RadarPanel from './components/RadarPanel';
import PoiPopup from './components/PoiPopup';
import SignalBanner from './components/SignalBanner';
import JournalPanel from './components/JournalPanel';
import ArView from './components/ArView';
import BootScreen from './components/BootScreen';
import Sheet from './components/Sheet';
import NavBar, { type PanelId } from './components/NavBar';
import MapScreen from './pages/MapScreen';
import AdminPage from './pages/AdminPage';

function Game() {
  const audio = useAudio();
  const [booted, setBooted] = useState(false);
  const [page, setPage] = useState<'game' | 'admin'>(() => (window.location.hash === '#admin' ? 'admin' : 'game'));
  const [panel, setPanel] = useState<PanelId | null>(null);
  const [follow, setFollow] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pois, setPois] = useState<PointOfInterest[]>([]);
  const [simulated, setSimulated] = useState<GeoPosition | null>(null);

  const geo = useGeolocation(booted);
  const compass = useCompass();
  const battery = useBattery();

  const position = simulated ?? geo.position;
  const tracking = usePoiTracking(position, pois);

  useEffect(() => {
    void poiService.getAll().then(setPois);
  }, []);

  const start = useCallback(async () => {
    unlockAudio();
    setBooted(true);
    audio.play();
    void requestNotificationPermission();
    void compass.request();
    try {
      await document.documentElement.requestFullscreen?.();
    } catch {
      /* plein écran refusé (iOS Safari) : mode PWA standalone à la place */
    }
  }, [audio, compass]);

  const simulate = useCallback((poi: PointOfInterest | null) => {
    if (!poi) return setSimulated(null);
    // ~15 m au sud du POI pour déclencher l'entrée de zone
    setSimulated({
      latitude: poi.latitude - 0.000135,
      longitude: poi.longitude,
      accuracy: 5,
      speed: null,
      heading: null,
      timestamp: Date.now(),
      simulated: true,
    });
    setFollow(true);
    setPanel(null);
  }, []);

  const selected = useMemo(() => pois.find((p) => p.id === selectedId) ?? null, [pois, selectedId]);
  const discoveredCount = useMemo(() => {
    const ids = new Set(pois.map((p) => p.id));
    return tracking.discovered.filter((d) => ids.has(d.poiId)).length;
  }, [pois, tracking.discovered]);

  const selectPoi = useCallback((poi: PointOfInterest) => {
    setSelectedId(poi.id);
    setPanel((p) => (p === 'ar' ? p : null));
  }, []);

  if (page === 'admin') {
    return <AdminPage pois={pois} onChange={setPois} onExit={() => { window.location.hash = ''; setPage('game'); }} />;
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-void">
      <div className="absolute inset-x-0 top-0 bottom-[calc(64px+env(safe-area-inset-bottom))]">
        <MapScreen
          position={position}
          heading={compass.heading ?? position?.heading ?? null}
          pois={tracking.visible}
          onSelectPoi={selectPoi}
          follow={follow}
          onFollowChange={setFollow}
        />
      </div>

      <div className="scanlines pointer-events-none absolute inset-0 z-[850]" />
      <div className="noise pointer-events-none absolute inset-0 z-[851]" />
      <div className="scan-line pointer-events-none absolute inset-x-0 z-[852] h-px" />

      <HudOverlay
        position={position}
        status={geo.status}
        error={geo.error}
        heading={compass.heading}
        targets={discoveredCount}
        totalTargets={pois.length}
        battery={battery}
        simulated={!!simulated}
      />

      {geo.status === 'denied' && !simulated && (
        <div className="panel absolute inset-x-4 top-[260px] z-[900] p-3 text-center text-xs text-alert">
          Autorisation GPS refusée. Activez la localisation pour ce site puis{' '}
          <button className="underline" onClick={geo.retry}>réessayez</button>.
        </div>
      )}
      {compass.permission === 'denied' && (
        <div className="absolute bottom-[80px] left-2 z-[900] text-[10px] text-signal">⚠ Boussole indisponible</div>
      )}

      <SignalBanner banner={tracking.banner} onDone={tracking.dismissBanner} />

      {panel === 'radar' && (
        <RadarPanel
          position={position}
          heading={compass.heading}
          pois={tracking.visible}
          distances={tracking.distances}
          onSelect={selectPoi}
          onClose={() => setPanel(null)}
        />
      )}
      {panel === 'journal' && (
        <JournalPanel
          pois={pois}
          discovered={tracking.discovered}
          stats={tracking.stats}
          simulating={!!simulated}
          onSelect={selectPoi}
          onSimulate={simulate}
          onReset={tracking.reset}
          onClose={() => setPanel(null)}
        />
      )}
      {panel === 'audio' && (
        <Sheet title="AUDIO D'AMBIANCE" onClose={() => setPanel(null)}>
          <AudioPanel />
        </Sheet>
      )}
      {panel === 'ar' && (
        <ArView
          position={position}
          heading={compass.heading}
          pois={tracking.visible}
          distances={tracking.distances}
          onSelect={selectPoi}
          onClose={() => setPanel(null)}
        />
      )}

      {selected && <PoiPopup poi={selected} distance={tracking.distances.get(selected.id)} onClose={() => setSelectedId(null)} />}

      <NavBar active={panel} audioPlaying={audio.playing} onSelect={setPanel} onAdmin={() => setPage('admin')} />

      {!booted && <BootScreen onStart={() => void start()} />}
    </div>
  );
}

export default function App() {
  return (
    <AudioProvider>
      <Game />
    </AudioProvider>
  );
}
