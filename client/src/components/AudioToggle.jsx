import { motion, useReducedMotion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useAudio } from '../context/AudioContext';

export default function AudioToggle({ floating = false }) {
  const { isMuted, isPlaying, toggleMute } = useAudio();
  const location = useLocation();
  const reducedMotion = useReducedMotion();

  if (/^\/watch\/[^/]+/.test(location.pathname)) return null;
  return (
    <motion.button
      type="button"
      className={`audio-toggle${floating ? ' audio-toggle-floating' : ''}`}
      onClick={toggleMute}
      aria-label={isMuted ? 'Unmute background audio' : 'Mute background audio'}
      aria-pressed={!isMuted}
      title={isMuted ? 'Unmute background audio' : 'Mute background audio'}
      whileHover={reducedMotion ? undefined : { scale: 1.06 }}
      whileTap={reducedMotion ? undefined : { scale: 0.94 }}
    >
      <svg className="speaker-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 9v6h4l5 4V5L8 9H4Z" />
        {isMuted
          ? <path d="m17 9 5 6m0-6-5 6" />
          : <path d="M16 9a4 4 0 0 1 0 6m2-9a8 8 0 0 1 0 12" />}
      </svg>
      <span className={`audio-equalizer${isPlaying && !isMuted ? ' is-playing' : ''}`} aria-hidden="true">
        <i /><i /><i />
      </span>
    </motion.button>
  );
}
