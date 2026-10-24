export const durations = {
  intro: 3.4,
  authLoadingMinimum: 1500,
  contentReveal: 0.65,
};

export const easings = {
  smooth: [0.22, 1, 0.36, 1],
};

export const introLogo = {
  hidden: { opacity: 0, scale: 0.72, filter: 'blur(12px)' },
  reveal: {
    opacity: [0, 1, 1, 1, 0],
    scale: [0.72, 1.04, 1, 1.02, 7],
    filter: ['blur(12px)', 'blur(0px)', 'blur(0px)', 'blur(0px)', 'blur(3px)'],
    transition: {
      duration: durations.intro,
      times: [0, 0.19, 0.38, 0.76, 1],
      ease: easings.smooth,
    },
  },
};

export const authEntrance = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: easings.smooth, staggerChildren: 0.1, delayChildren: 0.08 },
  },
};

export const authItem = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: easings.smooth } },
};
