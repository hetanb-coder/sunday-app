import {
  getRecordingPermissionsAsync,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  type RecordingOptions,
} from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';

export type VoiceRecorderLifecycle =
  | 'idle'
  | 'requestingPermission'
  | 'preparing'
  | 'recording'
  | 'stopping'
  | 'ready'
  | 'permissionDenied'
  | 'error';

export type VoiceRecordingResult = {
  uri: string;
  durationMillis: number;
  mimeType: 'audio/mp4';
  fileExtension: '.m4a';
};

const RECORDING_OPTIONS: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  isMeteringEnabled: true,
};

const restoreAudioMode = async () => {
  try {
    await setAudioModeAsync({ allowsRecording: false });
  } catch (error) {
    if (__DEV__) console.warn('[Voice recorder] Could not restore audio mode', error);
  }
};

export function useVoiceRecorder() {
  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(recorder, 80);
  const [lifecycle, setLifecycle] = useState<VoiceRecorderLifecycle>('idle');
  const [canAskPermissionAgain, setCanAskPermissionAgain] = useState(true);
  const [result, setResult] = useState<VoiceRecordingResult | null>(null);
  const mounted = useRef(true);
  const operation = useRef(0);
  const nativeStopPromise = useRef<Promise<void> | null>(null);
  const nativeRecorderActive = useRef(false);
  const lifecycleRef = useRef<VoiceRecorderLifecycle>('idle');
  const smoothedActivity = useRef(0);

  const updateLifecycle = useCallback((next: VoiceRecorderLifecycle) => {
    lifecycleRef.current = next;
    if (mounted.current) setLifecycle(next);
  }, []);

  const stopRecorderOnce = useCallback(async () => {
    if (nativeStopPromise.current) return nativeStopPromise.current;
    if (!nativeRecorderActive.current) return;
    // Claim this recorder before crossing the async boundary. Every competing
    // cleanup path now sees it as inactive and cannot query/stop the same
    // native shared object after Expo has disposed it.
    nativeRecorderActive.current = false;
    nativeStopPromise.current = recorder.stop().finally(() => {
      nativeStopPromise.current = null;
    });
    return nativeStopPromise.current;
  }, [recorder]);

  const stopNativeRecorder = useCallback(async () => {
    try {
      await stopRecorderOnce();
    } catch (error) {
      if (__DEV__) console.warn('[Voice recorder] Cleanup stop failed', error);
    } finally {
      await restoreAudioMode();
    }
  }, [stopRecorderOnce]);

  const cancel = useCallback(async () => {
    operation.current += 1;
    const previous = lifecycleRef.current;
    lifecycleRef.current = 'idle';
    if (mounted.current) setLifecycle('idle');
    if (previous !== 'idle' && previous !== 'ready' && previous !== 'permissionDenied') {
      await stopNativeRecorder();
    } else {
      await restoreAudioMode();
    }
  }, [stopNativeRecorder]);

  const start = useCallback(async () => {
    if (!['idle', 'permissionDenied', 'error'].includes(lifecycleRef.current)) return false;

    const operationId = ++operation.current;
    setResult(null);
    updateLifecycle('requestingPermission');

    try {
      let permission = await getRecordingPermissionsAsync();
      if (operation.current !== operationId || !mounted.current) return false;

      if (!permission.granted && permission.canAskAgain) {
        permission = await requestRecordingPermissionsAsync();
      }
      if (operation.current !== operationId || !mounted.current) return false;

      setCanAskPermissionAgain(permission.canAskAgain);
      if (!permission.granted) {
        updateLifecycle('permissionDenied');
        return false;
      }

      updateLifecycle('preparing');
      await setAudioModeAsync({
        allowsRecording: true,
        allowsBackgroundRecording: false,
        shouldPlayInBackground: false,
        playsInSilentMode: true,
        interruptionMode: 'doNotMix',
      });
      await recorder.prepareToRecordAsync(RECORDING_OPTIONS);
      nativeRecorderActive.current = true;

      if (operation.current !== operationId || !mounted.current) {
        await stopNativeRecorder();
        return false;
      }

      recorder.record();
      updateLifecycle('recording');
      return true;
    } catch (error) {
      if (__DEV__) console.error('[Voice recorder] Start failed', error);
      if (operation.current === operationId) updateLifecycle('error');
      await stopNativeRecorder();
      return false;
    }
  }, [recorder, stopNativeRecorder, updateLifecycle]);

  const stop = useCallback(async (): Promise<VoiceRecordingResult | null> => {
    if (lifecycleRef.current !== 'recording') return null;

    const operationId = ++operation.current;
    const durationMillis = recorderState.durationMillis;
    updateLifecycle('stopping');
    try {
      await stopRecorderOnce();
      if (operation.current !== operationId || !mounted.current) return null;
      const uri = recorder.uri;
      if (!uri) throw new Error('Recording completed without a local URI');

      const nextResult: VoiceRecordingResult = {
        uri,
        durationMillis,
        mimeType: 'audio/mp4',
        fileExtension: '.m4a',
      };
      setResult(nextResult);
      updateLifecycle('ready');
      if (__DEV__) {
        console.info('[Voice recorder] Local recording ready', {
          uri: nextResult.uri,
          durationMillis: nextResult.durationMillis,
          mimeType: nextResult.mimeType,
        });
      }
      await restoreAudioMode();
      return nextResult;
    } catch (error) {
      if (__DEV__) console.error('[Voice recorder] Stop failed', error);
      if (operation.current === operationId) updateLifecycle('error');
      await stopNativeRecorder();
      return null;
    }
  }, [recorder, recorderState.durationMillis, stopNativeRecorder, stopRecorderOnce, updateLifecycle]);

  useEffect(() => () => {
    mounted.current = false;
    operation.current += 1;
    // `useAudioRecorder` owns native disposal on unmount. Close/retry call
    // `cancel` before unmount; invoking stop here would race that disposal.
    nativeRecorderActive.current = false;
    void restoreAudioMode();
  }, []);

  const metering = lifecycle === 'recording' ? recorderState.metering : undefined;
  const normalized = typeof metering === 'number'
    ? Math.max(0, Math.min(1, (metering + 55) / 45))
    : 0;
  const damping = normalized > smoothedActivity.current ? 0.34 : 0.16;
  smoothedActivity.current += (normalized - smoothedActivity.current) * damping;

  return {
    lifecycle,
    canAskPermissionAgain,
    result,
    durationMillis: recorderState.durationMillis,
    audioActivity: smoothedActivity.current,
    start,
    stop,
    cancel,
  };
}
