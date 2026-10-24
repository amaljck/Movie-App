import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { durations, easings, introLogo } from '../../animations/variants';
import { useAudio } from '../../context/AudioContext';

export default function IntroSplash({ onComplete }) {
  const reducedMotion = useReducedMotion();
  const completed = useRef(false);
  const [soundPrompt, setSoundPrompt] = useState(false);
  const [logoRun, setLogoRun] = useState(0);
  const { hasIntroAudio, isMuted, playIntro, stopIntro, unlockAudio } = useAudio();

  const finishIntro = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    try {
      sessionStorage.setItem('cinemate_intro_seen', 'true');
    } catch {
      // The intro still plays when browser storage is unavailable.
    }
    let promptTimer;
    const audioTimer = window.setTimeout(() => {
      if (isMuted) return;
      void playIntro().then((played) => {
        if (!played) promptTimer = window.setTimeout(() => setSoundPrompt(true), 500);
      });
    }, 0);
    const timer = window.setTimeout(finishIntro, reducedMotion ? 800 : durations.intro * 1000);
    return () => {
      window.clearTimeout(audioTimer);
      window.clearTimeout(promptTimer);
      window.clearTimeout(timer);
    };
  }, [finishIntro, isMuted, playIntro, reducedMotion]);

  const handleUnlock = () => {
    if (isMuted || !soundPrompt) return;
    setSoundPrompt(false);
    unlockAudio();
    setLogoRun((run) => run + 1);
    void playIntro();
  };

  const handleSkip = () => {
    stopIntro();
    finishIntro();
  };

  return (
    <AnimatePresence>
      <motion.div
        className="intro-splash"
        onPointerDown={handleUnlock}
        onKeyDown={handleUnlock}
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.45, ease: easings.smooth } }}
      >
        <div className="intro-glow" />
        <div className="intro-poster-field" aria-hidden="true">
          {Array.from({ length: 8 }, (_, index) => <span key={index} />)}
        </div>
        <motion.div
          key={logoRun}
          className="intro-wordmark"
          variants={introLogo}
          initial="hidden"
          animate={reducedMotion ? { opacity: 1, scale: 1 } : 'reveal'}
          onAnimationComplete={finishIntro}
        >
          CINEMATE
        </motion.div>
        {!reducedMotion && <motion.div className="intro-light-streak" initial={{ x: '-130vw', opacity: 0 }} animate={{ x: '130vw', opacity: [0, 1, 1, 0] }} transition={{ delay: 0.78, duration: 0.9, ease: 'easeInOut' }} />}
        {soundPrompt && hasIntroAudio && !isMuted && (
          <button type="button" className="intro-sound-prompt" onClick={handleUnlock}>
            Click anywhere to enter with sound
          </button>
        )}
        <button
          type="button"
          className="intro-skip"
          onPointerDown={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          onClick={handleSkip}
        >
          Skip intro
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
