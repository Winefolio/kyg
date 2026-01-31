import { motion } from 'framer-motion';

const logoAnimation = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
} as const;

export function SplashScreen() {
  return (
    <motion.div
      className="fixed inset-0 z-50 bg-gradient-primary flex items-center justify-center"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <motion.div className="text-center" {...logoAnimation}>
        <img
          src="/logo-cata.svg"
          alt="Cata"
          className="w-24 h-24 mx-auto mb-4"
        />
        <motion.p
          className="text-white/60 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          Your personal sommelier
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
