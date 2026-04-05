"use client";

import { motion } from "framer-motion";

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export default function Hero() {
  return (
    <motion.section
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="text-center"
    >
      {/* Badge */}
      <motion.div variants={itemVariants} className="inline-flex mb-6">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/60">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          Free &amp; open-source URL shortener
        </span>
      </motion.div>

      {/* Headline */}
      <motion.h1
        variants={itemVariants}
        className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-balance leading-[1.1] mb-5"
      >
        Shrink your links,{" "}
        <span className="gradient-text">amplify your reach</span>
      </motion.h1>

      {/* Sub-headline */}
      <motion.p
        variants={itemVariants}
        className="text-lg sm:text-xl text-[var(--text-secondary)] max-w-xl mx-auto text-balance leading-relaxed"
      >
        Paste any long URL and get a clean, shareable short link in seconds.
        No sign-up required.
      </motion.p>
    </motion.section>
  );
}
