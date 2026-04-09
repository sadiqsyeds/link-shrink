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
