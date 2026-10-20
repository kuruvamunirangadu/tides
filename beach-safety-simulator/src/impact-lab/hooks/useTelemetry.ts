import { useState, useEffect } from 'react';
import { TelemetryRecorder } from '../recorder/TelemetryRecorder';
import { TelemetrySnapshot, TelemetryEvent, ImpactLabRunSession } from '../types';

export function useTelemetry() {
  const recorder = TelemetryRecorder.getInstance();
  const [session, setSession] = useState<ImpactLabRunSession>(recorder.getSession());
  const [latestSnapshot, setLatestSnapshot] = useState<TelemetrySnapshot | undefined>(recorder.getLatestSnapshot());
  const [snapshotCount, setSnapshotCount] = useState<number>(recorder.getSnapshots().length);
  const [events, setEvents] = useState<readonly TelemetryEvent[]>(recorder.getEvents());

  useEffect(() => {
    // Throttle UI re-renders for telemetry to 10 FPS (100ms) to ensure Canvas 60 FPS runs unhindered
    let lastUiUpdate = 0;
    const UI_THROTTLE_MS = 100;

    const unsubscribe = recorder.subscribe(() => {
      const now = performance.now();
      if (now - lastUiUpdate >= UI_THROTTLE_MS) {
        lastUiUpdate = now;
        setSession(recorder.getSession());
        setLatestSnapshot(recorder.getLatestSnapshot());
        setSnapshotCount(recorder.getSnapshots().length);
        setEvents([...recorder.getEvents()]);
      }
    });

    return () => unsubscribe();
  }, []);

  return {
    recorder,
    session,
    latestSnapshot,
    snapshotCount,
    events,
    allSnapshots: recorder.getSnapshots(),
    startRecording: () => recorder.setRecording(true),
    pauseRecording: () => recorder.setRecording(false),
    newSession: (beachId: string, beachName: string) => recorder.createNewSession(beachId, beachName),
    exportTelemetryJSON: () => recorder.exportAsJSON(),
  };
}

