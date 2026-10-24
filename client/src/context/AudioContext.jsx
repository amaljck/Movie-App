import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { audioConfig } from '../config/audio';

const AudioContext = createContext(null);

const readMutedPreference = () => {
  try {
    return localStorage.getItem(audioConfig.storageKey) === 'true';
  } catch {
    return false;
  }
};

export function AudioProvider({ children }) {
  const location = useLocation();
  const [isMuted, setIsMuted] = useState(readMutedPreference);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasIntroAudio, setHasIntroAudio] = useState(true);
  const introRef = useRef(null);
  const ambientRef = useRef(null);
  const mutedRef = useRef(isMuted);
  const unlockedRef = useRef(false);
  const watchPageRef = useRef(false);
  const previousWatchRef = useRef(false);
  const tabVisibleRef = useRef(typeof document === 'undefined' || document.visibilityState === 'visible');
  const fadeTimersRef = useRef(new Map());
  const pauseTimersRef = useRef(new Set());

  const schedulePause = useCallback((audio) => {
    const timer = window.setTimeout(() => {
      pauseTimersRef.current.delete(timer);
      if (audio.volume === 0) audio.pause();
    }, audioConfig.fadeDuration);
    pauseTimersRef.current.add(timer);
  }, []);

  const clearFade = useCallback((audio) => {
    const timer = fadeTimersRef.current.get(audio);
    if (timer) window.clearInterval(timer);
    fadeTimersRef.current.delete(audio);
  }, []);

  const fadeVolume = useCallback((audio, targetVolume, duration = audioConfig.fadeDuration) => {
    if (!audio) return;
    clearFade(audio);
    const startVolume = audio.volume;
    const startedAt = Date.now();
    if (duration <= 0 || startVolume === targetVolume) {
      audio.volume = targetVolume;
      return;
    }
    const timer = window.setInterval(() => {
      const progress = Math.min(1, (Date.now() - startedAt) / duration);
      audio.volume = startVolume + ((targetVolume - startVolume) * progress);
      if (progress >= 1) clearFade(audio);
    }, 25);
    fadeTimersRef.current.set(audio, timer);
  }, [clearFade]);

  const playAudio = useCallback(async (audio, targetVolume) => {
    if (!audio || mutedRef.current) return false;
    audio.volume = 0;
    try {
      await audio.play();
      unlockedRef.current = true;
      setIsUnlocked(true);
      fadeVolume(audio, targetVolume);
      return true;
    } catch {
      return false;
    }
  }, [fadeVolume]);

  const playIntro = useCallback(async () => {
    const audio = introRef.current;
    if (!audio || mutedRef.current) return false;
    try {
      audio.currentTime = 0;
    } catch {
      // Media metadata may not be available yet.
    }
    return playAudio(audio, audioConfig.introVolume);
  }, [playAudio]);

  const stopIntro = useCallback(() => {
    const audio = introRef.current;
    if (!audio) return;
    clearFade(audio);
    audio.pause();
    audio.volume = 0;
  }, [clearFade]);

  const startAmbient = useCallback(async () => {
    const audio = ambientRef.current;
    if (!audio || mutedRef.current || watchPageRef.current || !tabVisibleRef.current) return false;
    const intro = introRef.current;
    if (intro && !intro.paused) {
      fadeVolume(intro, 0);
      schedulePause(intro);
    }
    audio.loop = true;
    if (!audio.paused) {
      fadeVolume(audio, audioConfig.ambientVolume);
      return true;
    }
    try {
      audio.currentTime = 0;
    } catch {
      // The browser may not have loaded the track metadata yet.
    }
    return playAudio(audio, audioConfig.ambientVolume);
  }, [fadeVolume, playAudio, schedulePause]);

  const stopAmbient = useCallback((immediate = false) => {
    const audio = ambientRef.current;
    if (!audio) return;
    if (immediate) {
      clearFade(audio);
      audio.pause();
      audio.volume = 0;
      return;
    }
    fadeVolume(audio, 0);
    schedulePause(audio);
  }, [clearFade, fadeVolume, schedulePause]);

  const pauseForMovie = useCallback(() => {
    stopAmbient(true);
  }, [stopAmbient]);

  const resumeAfterMovie = useCallback(() => {
    if (!watchPageRef.current) void startAmbient();
  }, [startAmbient]);

  const unlockAudio = useCallback(() => {
    unlockedRef.current = true;
    setIsUnlocked(true);
  }, []);

  const toggleMute = useCallback(() => {
    const nextMuted = !mutedRef.current;
    mutedRef.current = nextMuted;
    setIsMuted(nextMuted);
    try {
      localStorage.setItem(audioConfig.storageKey, String(nextMuted));
    } catch {
      // Audio continues to work when browser storage is unavailable.
    }

    if (nextMuted) {
      stopAmbient();
      const intro = introRef.current;
      if (intro) {
        fadeVolume(intro, 0);
        schedulePause(intro);
      }
    } else {
      unlockAudio();
      if (!watchPageRef.current) void startAmbient();
    }
  }, [fadeVolume, schedulePause, startAmbient, stopAmbient, unlockAudio]);

  useEffect(() => {
    const intro = new Audio(audioConfig.introPath);
    const ambient = new Audio(audioConfig.ambientPath);
    intro.preload = 'auto';
    ambient.preload = 'auto';
    ambient.loop = true;
    intro.volume = 0;
    ambient.volume = 0;
    introRef.current = intro;
    ambientRef.current = ambient;
    setHasIntroAudio(true);
    const updatePlaying = () => setIsPlaying(
      Boolean((introRef.current && !introRef.current.paused) || (ambientRef.current && !ambientRef.current.paused)),
    );
    const onIntroError = () => setHasIntroAudio(false);
    intro.addEventListener('play', updatePlaying);
    intro.addEventListener('pause', updatePlaying);
    intro.addEventListener('ended', updatePlaying);
    intro.addEventListener('error', onIntroError);
    ambient.addEventListener('play', updatePlaying);
    ambient.addEventListener('pause', updatePlaying);
    ambient.addEventListener('ended', updatePlaying);

    const onVisibilityChange = () => {
      tabVisibleRef.current = document.visibilityState === 'visible';
      if (!tabVisibleRef.current) {
        stopAmbient(true);
        const introAudio = introRef.current;
        if (introAudio) {
          fadeVolume(introAudio, 0);
          schedulePause(introAudio);
        }
      } else if (!watchPageRef.current && !mutedRef.current) {
        void startAmbient();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      intro.removeEventListener('play', updatePlaying);
      intro.removeEventListener('pause', updatePlaying);
      intro.removeEventListener('ended', updatePlaying);
      intro.removeEventListener('error', onIntroError);
      ambient.removeEventListener('play', updatePlaying);
      ambient.removeEventListener('pause', updatePlaying);
      ambient.removeEventListener('ended', updatePlaying);
      for (const timer of fadeTimersRef.current.values()) window.clearInterval(timer);
      fadeTimersRef.current.clear();
      for (const timer of pauseTimersRef.current) window.clearTimeout(timer);
      pauseTimersRef.current.clear();
      intro.pause();
      ambient.pause();
      intro.removeAttribute('src');
      ambient.removeAttribute('src');
      intro.load();
      ambient.load();
      introRef.current = null;
      ambientRef.current = null;
    };
  }, [fadeVolume, schedulePause, startAmbient, stopAmbient]);

  useEffect(() => {
    const isWatching = /^\/watch\/[^/]+/.test(location.pathname);
    watchPageRef.current = isWatching;
    if (isWatching) {
      stopAmbient(true);
    } else if (previousWatchRef.current && !mutedRef.current && tabVisibleRef.current) {
      void startAmbient();
    }
    previousWatchRef.current = isWatching;
  }, [location.pathname, startAmbient, stopAmbient]);

  useEffect(() => {
    mutedRef.current = isMuted;
    if (isMuted) {
      stopAmbient();
    } else if (unlockedRef.current && !watchPageRef.current && tabVisibleRef.current) {
      void startAmbient();
    }
  }, [isMuted, startAmbient, stopAmbient]);

  const value = useMemo(() => ({
    playIntro,
    stopIntro,
    startAmbient,
    stopAmbient,
    pauseForMovie,
    resumeAfterMovie,
    toggleMute,
    unlockAudio,
    isMuted,
    isUnlocked,
    isPlaying,
    hasIntroAudio,
  }), [
    isMuted,
    isUnlocked,
    isPlaying,
    hasIntroAudio,
    pauseForMovie,
    playIntro,
    stopIntro,
    resumeAfterMovie,
    startAmbient,
    stopAmbient,
    toggleMute,
    unlockAudio,
  ]);

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) throw new Error('useAudio must be used within AudioProvider');
  return context;
}
