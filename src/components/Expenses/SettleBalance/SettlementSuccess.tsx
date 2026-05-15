import React, { useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Heart, Coins, Handshake, HandCoins, BanknoteArrowUpIcon, CheckCheckIcon } from 'lucide-react';
import Button from '../../ui/Button';

interface SettlementSuccessProps {
  onDone: () => void;
  partnerAvatar?: string | null;
  userAvatar?: string | null;
  partnerName?: string;
}

const Particle = ({ type, delay }: { type: 'sparkle' | 'heart' | 'coin'; delay: number }) => {
  const randomX = useMemo(() => (Math.random() - 0.5) * 500, []);
  const randomY = useMemo(() => -250 - Math.random() * 500, []);
  const randomRotate = useMemo(() => (Math.random() - 0.5) * 360, []);
  const randomDuration = useMemo(() => 4 + Math.random() * 4, []);

  const icons = {
    sparkle: <Sparkles className="w-5 h-5 text-success/30" />,
    heart: <Heart className="w-4 h-4 text-primary/30 fill-current" />,
    coin: <Coins className="w-5 h-5 text-success/20" />
  };

  return (
    <motion.div
      initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
      animate={{ 
        x: randomX, 
        y: randomY, 
        opacity: [0, 0.6, 0], 
        scale: [0, 1.5, 0.5],
        rotate: randomRotate 
      }}
      transition={{ 
        duration: randomDuration, 
        delay, 
        ease: "easeOut",
        repeat: Infinity,
        repeatDelay: Math.random() * 3
      }}
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
    >
      {icons[type]}
    </motion.div>
  );
};

export default function SettlementSuccess({ onDone, partnerAvatar, userAvatar, partnerName }: SettlementSuccessProps) {
  const { t } = useTranslation();

  useEffect(() => {
    const timer = setTimeout(onDone, 6000); 
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#F4EBD9] dark:bg-background-dark overflow-hidden"
    >
      {/* 1. LAYER: DYNAMIC MESH BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ 
            scale: [1, 1.4, 1],
            x: [-100, 100, -100],
            y: [-100, 100, -100],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-20%] left-[-20%] w-[150%] h-[150%] opacity-40 dark:opacity-20"
          style={{
            background: 'radial-gradient(circle at center, #8BA888 0%, transparent 50%), radial-gradient(circle at 80% 20%, #CF7455 0%, transparent 40%), radial-gradient(circle at 20% 80%, #8BA888 0%, transparent 40%)',
            filter: 'blur(90px)'
          }}
        />
        
        {/* Large Background Text (Editorial Watermark) */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
          <h1 className="text-[25vw] font-display italic font-black tracking-tighter leading-none uppercase">
            {t('expenses.settlement.successWatermark')}
          </h1>
        </div>

        {/* Grain Overlay */}
        <div className="absolute inset-0 opacity-[0.04] contrast-150 mix-blend-multiply dark:mix-blend-overlay">
          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <filter id="noiseFilter">
              <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
            </filter>
            <rect width="100%" height="100%" filter="url(#noiseFilter)"/>
          </svg>
        </div>
      </div>

      {/* 2. LAYER: MAIN CONTENT COREOGRAPHY */}
      <div className="relative w-full max-w-[340px] flex flex-col items-center">
        
        {/* Avatars & Connection */}
        <div className="relative flex items-center justify-center gap-16 mb-12">
          {/* Connection Pulse Line */}
          <motion.div 
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent"
          />

          <motion.div
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 100 }}
            className="relative z-10"
          >
            <div className="w-16 h-16 rounded-[1.5rem] overflow-hidden border-2 border-white dark:border-white/10 shadow-xl bg-surface-1">
              {userAvatar ? <img src={userAvatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-primary font-bold">Me</div>}
            </div>
          </motion.div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.9, duration: 0.5, type: "spring" }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
          >
            <div className="bg-primary/10 backdrop-blur-md p-2 rounded-full border border-primary/20">
               <Heart className="w-5 h-5 text-primary fill-primary" />
            </div>
          </motion.div>

          <motion.div
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 100 }}
            className="relative z-10"
          >
            <div className="w-16 h-16 rounded-[1.5rem] overflow-hidden border-2 border-white dark:border-white/10 shadow-xl bg-surface-1">
              {partnerAvatar ? <img src={partnerAvatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-primary font-bold">{partnerName?.[0] ?? 'P'}</div>}
            </div>
          </motion.div>
        </div>

        {/* The "Settlement Receipt" Card */}
        <motion.div
          initial={{ y: 50, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ delay: 1.2, duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
          className="w-full bg-surface-1 rounded-xl p-10 shadow-card-lg border border-border-strong relative group"
        >
          {/* Decorative "Stamp" - Handshake Icon */}
          <motion.div 
            initial={{ scale: 3, opacity: 0, rotate: 15 }}
            animate={{ scale: 1, opacity: 1, rotate: -10 }}
            transition={{ delay: 2.2, type: "spring", stiffness: 200 }}
            className="absolute -top-3 -right-3 w-18 h-18 border-2 border-success rounded-full flex items-center justify-center text-success pointer-events-none"
          >
            <CheckCheckIcon className="w-10 h-10 transform -rotate-10" />
          </motion.div>

          <div className="flex flex-col items-center text-center space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-surface-2/30">
              {t('expenses.balance.settled')}
            </h4>

            <div className="relative">
              <motion.div 
                initial={{ scale: 1.1, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 1.8, duration: 1 }}
                className="flex items-start leading-none gap-2"
              >
                <span className="font-display text-[6.5rem] font-normal tracking-[-0.04em] leading-[0.8] tabular-nums text-surface-2 italic">
                  0,00
                </span>
                <span className="font-sans text-3xl font-light text-surface-2/20 pt-[0.8rem]">
                  €
                </span>
              </motion.div>
            </div>

            <div className="pt-6 border-t border-dashed border-surface-2/10 w-full">
              <p className="text-surface-2/60 text-lg font-light leading-relaxed">
                {t('expenses.balance.settledSubtitle')}
              </p>
            </div>
          </div>

          {/* Particle Burst */}
          <div className="absolute inset-0 pointer-events-none overflow-visible">
            {[...Array(12)].map((_, i) => (
              <Particle key={`sparkle-${i}`} type="sparkle" delay={2.5 + i * 0.1} />
            ))}
            {[...Array(6)].map((_, i) => (
              <Particle key={`heart-${i}`} type="heart" delay={2.8 + i * 0.2} />
            ))}
          </div>
        </motion.div>

        {/* Manual Dismiss */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 4.5 }}
          className="mt-12"
        >
          <Button 
            variant="ghost" 
            onClick={onDone} 
            className="text-[10px] font-black uppercase tracking-[0.4em] text-surface-2/10 hover:text-success transition-all hover:tracking-[0.5em]"
          >
            {t('cta.back')}
          </Button>
        </motion.div>
      </div>

      {/* 3. LAYER: PROGRESS UI */}
      <div className="absolute bottom-12 left-0 right-0 px-12 flex flex-col items-center gap-4">
        <div className="w-full max-w-[200px] h-[2px] bg-surface-2/5 rounded-full overflow-hidden">
          <motion.div 
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 6, ease: "linear" }}
            className="h-full bg-primary/20 origin-left"
          />
        </div>
      </div>
    </motion.div>
  );
}
