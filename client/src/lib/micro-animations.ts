import { Variants } from "framer-motion";

// Card and container animations
export const containerVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
      staggerChildren: 0.1
    }
  },
  exit: { 
    opacity: 0, 
    y: -10,
    transition: {
      duration: 0.3
    }
  }
};

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  }
};

// Button interaction animations
export const buttonVariants: Variants = {
  idle: { scale: 1 },
  hover: { 
    scale: 1.02,
    transition: {
      duration: 0.2,
      ease: "easeInOut"
    }
  },
  tap: { 
    scale: 0.98,
    transition: {
      duration: 0.1,
      ease: "easeInOut"
    }
  },
  loading: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

// Input field animations
export const inputVariants: Variants = {
  idle: { 
    borderColor: "rgba(255, 255, 255, 0.2)",
    boxShadow: "0 0 0 0 rgba(59, 130, 246, 0)"
  },
  focus: { 
    borderColor: "rgba(59, 130, 246, 0.8)",
    boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  },
  error: {
    borderColor: "rgba(239, 68, 68, 0.8)",
    boxShadow: "0 0 0 3px rgba(239, 68, 68, 0.1)",
    x: [-2, 2, -2, 2, 0],
    transition: {
      duration: 0.4,
      ease: "easeInOut"
    }
  },
  success: {
    borderColor: "rgba(34, 197, 94, 0.8)",
    boxShadow: "0 0 0 3px rgba(34, 197, 94, 0.1)",
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  }
};

// Character slot animations
export const slotVariants: Variants = {
  empty: { 
    scale: 1,
    borderColor: "rgba(255, 255, 255, 0.3)"
  },
  filled: { 
    scale: 1.05,
    borderColor: "rgba(255, 255, 255, 0.6)",
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25
    }
  },
  active: {
    scale: [1, 1.08, 1],
    borderColor: ["rgba(59, 130, 246, 0.8)", "rgba(96, 165, 250, 0.9)", "rgba(59, 130, 246, 0.8)"],
    transition: {
      duration: 1.2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  },
  complete: {
    scale: 1.1,
    borderColor: "rgba(34, 197, 94, 0.8)",
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 30
    }
  }
};

// Progress and feedback animations
export const progressVariants: Variants = {
  initial: { width: "0%" },
  animate: (progress: number) => ({
    width: `${progress}%`,
    transition: {
      duration: 0.8,
      ease: "easeOut"
    }
  })
};

export const pulseVariants: Variants = {
  idle: { scale: 1, opacity: 1 },
  pulse: {
    scale: [1, 1.1, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 0.6,
      ease: "easeInOut"
    }
  }
};

// Status indicator animations
export const statusVariants: Variants = {
  waiting: {
    backgroundColor: "rgba(156, 163, 175, 0.8)",
    scale: 1
  },
  active: {
    backgroundColor: "rgba(34, 197, 94, 0.8)",
    scale: [1, 1.1, 1],
    transition: {
      backgroundColor: { duration: 0.3 },
      scale: { duration: 0.5, repeat: 2 }
    }
  },
  paused: {
    backgroundColor: "rgba(251, 191, 36, 0.8)",
    scale: 1
  },
  completed: {
    backgroundColor: "rgba(59, 130, 246, 0.8)",
    scale: 1
  }
};

// Notification animations
export const notificationVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: -50, 
    scale: 0.9 
  },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25
    }
  },
  exit: { 
    opacity: 0, 
    y: -20, 
    scale: 0.95,
    transition: {
      duration: 0.2
    }
  }
};

// Modal and overlay animations
export const modalVariants: Variants = {
  hidden: { 
    opacity: 0,
    scale: 0.95,
    y: 20
  },
  visible: { 
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 30
    }
  },
  exit: { 
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: {
      duration: 0.2
    }
  }
};

export const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.3 }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

// List item animations
export const listItemVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.4,
      ease: "easeOut"
    }
  }),
  hover: {
    x: 5,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    transition: {
      duration: 0.2
    }
  }
};

// Slide transition animations
export const slideVariants: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: "easeInOut"
    }
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 300 : -300,
    opacity: 0,
    transition: {
      duration: 0.5,
      ease: "easeInOut"
    }
  })
};

// Floating action animations
export const floatingVariants: Variants = {
  idle: {
    y: [0, -5, 0],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  },
  hover: {
    y: -8,
    scale: 1.05,
    transition: {
      duration: 0.3
    }
  }
};

// Loading spinner animations
export const spinnerVariants: Variants = {
  spin: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear"
    }
  }
};

// Success/error feedback animations
export const feedbackVariants: Variants = {
  success: {
    scale: [1, 1.2, 1],
    rotate: [0, 10, -10, 0],
    transition: {
      duration: 0.6,
      ease: "easeInOut"
    }
  },
  error: {
    x: [-5, 5, -5, 5, 0],
    transition: {
      duration: 0.4,
      ease: "easeInOut"
    }
  }
};