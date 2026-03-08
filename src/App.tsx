import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, useScroll, useTransform, AnimatePresence, useMotionValueEvent } from 'framer-motion';
import confetti from 'canvas-confetti';

// --- Phase Intro: Request Fullscreen ---
const PhaseIntro = ({ onComplete }: { onComplete: () => void }) => {
  const handleBegin = () => {
    // Attempt to request fullscreen. Need to catch errors as some browsers (like Safari iOS) 
    // restrict this or might throw if not triggered by a direct user gesture in a specific way.
    if (!document.fullscreenElement) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch((err) => {
          console.warn(`Error attempting to enable fullscreen: ${err.message}`);
        });
      }
    }
    onComplete();
  };

  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center bg-black z-[200]"
      exit={{ opacity: 0, transition: { duration: 1.5 } }}
    >
      <div className="text-center px-6 max-w-lg">
        <h2 className="text-xl md:text-2xl text-white/80 font-sans tracking-wide mb-8 leading-relaxed">
          For the best experience, please ensure your sound is on and view this in full screen.
        </h2>
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-8 py-3 rounded-full border border-white/40 text-white hover:bg-white/10 transition-all font-sans uppercase tracking-widest text-sm cursor-pointer"
          onClick={handleBegin}
        >
          Enter Fullscreen & Begin
        </motion.button>
      </div>
    </motion.div>
  );
};

const PhaseA = ({ onComplete }: { onComplete: () => void }) => {
  const text = "I have a question I've been meaning to ask you...";
  const [displayedText, setDisplayedText] = useState("");
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    let i = 0;
    let interval: ReturnType<typeof setInterval>;

    // Web Audio context for typing sound
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioContextClass();

    // Create a buffer for a snappy "click" sound (white noise burst with quick decay)
    const bufferSize = audioCtx.sampleRate * 0.05; // 50ms buffer
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let j = 0; j < bufferSize; j++) {
      // High frequency noise with sharp exponential decay
      data[j] = (Math.random() * 2 - 1) * Math.exp(-j / (audioCtx.sampleRate * 0.01));
    }

    const playTick = () => {
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const noiseSource = audioCtx.createBufferSource();
      noiseSource.buffer = buffer;

      // Filter to make it sound more like a mechanical clack rather than pure static
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800 + Math.random() * 400, audioCtx.currentTime); // Varies slightly per keystroke
      filter.Q.value = 1.0;

      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.8, audioCtx.currentTime); // Start loud
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.03); // Quick, snappy decay

      noiseSource.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);

      noiseSource.start();
    };

    // Wait for 1 second before starting the typing effect
    const timeout = setTimeout(() => {
      interval = setInterval(() => {
        setDisplayedText(text.slice(0, i + 1));

        // Add a slight randomization to the typing speed for realism (Optional, but helps the typewriter effect)
        // If it's a space, pause slightly longer
        if (text[i] !== ' ') {
          playTick();
        }

        i++;
        if (i === text.length) {
          clearInterval(interval);
          setTimeout(() => setShowButton(true), 1000);
        }
      }, 100);
    }, 1000);

    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
      audioCtx.close().catch(() => { });
    };
  }, []);

  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center bg-black z-[100]"
      exit={{ opacity: 0, transition: { duration: 3 } }}
    >
      <h1 className="text-2xl md:text-4xl text-white text-center px-6 leading-relaxed" style={{ fontFamily: "'Playfair Display', serif" }}>
        {displayedText}
      </h1>

      {/* Absolute positioning prevents the button from pushing the text upwards */}
      <div className="absolute top-[60%] w-full flex justify-center">
        <AnimatePresence>
          {showButton && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-10 py-3 rounded-full border border-white/30 text-white/80 hover:bg-white/10 hover:text-white transition-all animate-pulse tracking-widest uppercase text-sm cursor-pointer"
              onClick={onComplete}
            >
              Begin
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// --- Global Audio ---
// We initialize a global AudioContext so it persists across renders and interactions
const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
const globalAudioCtx = new AudioContextClass();

const playDrone = () => {
  if (globalAudioCtx.state === 'suspended') globalAudioCtx.resume();

  // Keep master gain low to be sweet background ambience
  const masterGain = globalAudioCtx.createGain();
  masterGain.gain.value = 0;
  masterGain.gain.linearRampToValueAtTime(0.07, globalAudioCtx.currentTime + 3); // Increased to 7% volume max
  masterGain.connect(globalAudioCtx.destination);

  // Soft reverberated delay illusion
  const delay = globalAudioCtx.createDelay(5.0);
  delay.delayTime.value = 0.5;
  const feedback = globalAudioCtx.createGain();
  feedback.gain.value = 0.4;
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(masterGain);

  // Magic Pentatonic Scale (C Maj Pentatonic: C5, D5, E5, G5, A5, C6)
  const scale = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];

  // Generative music box/chime loop
  const playChime = () => {
    if (!masterGain) return; // Prevent playing if stopped

    const now = globalAudioCtx.currentTime;
    const osc = globalAudioCtx.createOscillator();
    const oscGain = globalAudioCtx.createGain();

    // Pure, soft sine wave
    osc.type = 'sine';

    // Pick random note from the magical scale
    const note = scale[Math.floor(Math.random() * scale.length)];
    osc.frequency.setValueAtTime(note, now);

    // Soft attack, very long decay (like a chime or harp string)
    oscGain.gain.setValueAtTime(0, now);
    oscGain.gain.linearRampToValueAtTime(0.5, now + 0.1);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 3.0);

    osc.connect(oscGain);
    oscGain.connect(masterGain);
    oscGain.connect(delay); // Send to our delay loop for a magical echoing feel

    osc.start(now);
    osc.stop(now + 3.0);

    // Schedule the next random chime between 0.5s and 2.0s from now
    const nextTime = 500 + Math.random() * 1500;
    setTimeout(playChime, nextTime);
  };

  // Start the generative chimes loop
  playChime();
};

const playSwishSound = () => {
  if (globalAudioCtx.state === 'suspended') globalAudioCtx.resume();

  const bufferSize = globalAudioCtx.sampleRate * 0.2;
  const buffer = globalAudioCtx.createBuffer(1, bufferSize, globalAudioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const noise = globalAudioCtx.createBufferSource();
  noise.buffer = buffer;

  const filter = globalAudioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1200, globalAudioCtx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(300, globalAudioCtx.currentTime + 0.2);
  filter.Q.value = 1.5;

  const gain = globalAudioCtx.createGain();
  gain.gain.setValueAtTime(0, globalAudioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0.8, globalAudioCtx.currentTime + 0.05);
  gain.gain.linearRampToValueAtTime(0, globalAudioCtx.currentTime + 0.2);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(globalAudioCtx.destination);

  noise.start();
};

const playConfettiSound = () => {
  if (globalAudioCtx.state === 'suspended') globalAudioCtx.resume();

  // Magical, sweet sparkle/chime glissando instead of a pop
  const numSparkles = 12;
  const startFreq = 800;
  const endFreq = 2400;

  for (let i = 0; i < numSparkles; i++) {
    const osc = globalAudioCtx.createOscillator();
    const gain = globalAudioCtx.createGain();

    // Triangle wave for a chime-like, bell sound
    osc.type = 'triangle';

    // Calculate the time this individual sparkle starts (arpeggiating upwards quickly)
    const startTime = globalAudioCtx.currentTime + (i * 0.03);

    // Calculate pitch sliding up the scale
    const freq = startFreq + ((endFreq - startFreq) * (i / numSparkles));

    // Small random detune for chorus/shimmer effect
    osc.frequency.setValueAtTime(freq + (Math.random() * 50 - 25), startTime);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02); // Quick attack
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4); // Sparkly decay

    osc.connect(gain);
    gain.connect(globalAudioCtx.destination);

    osc.start(startTime);
    osc.stop(startTime + 0.5);
  }
};

// --- Scene 5: Question Reveal ---
const Proposal = ({ onReveal }: { onReveal: () => void }) => {
  const [escapeCount, setEscapeCount] = useState(0);
  const [buttonPos, setButtonPos] = useState({ x: 0, y: 0 });

  // Start the drone exactly once when this component mounts
  useEffect(() => {
    playDrone();
  }, []);

  const MAX_ESCAPES = 3;

  const handleInteraction = () => {
    if (escapeCount < MAX_ESCAPES - 1) {
      playSwishSound();
      const maxOffsetX = window.innerWidth / 2 - 150;
      const maxOffsetY = window.innerHeight / 2 - 150;

      const randomX = (Math.random() * 2 - 1) * maxOffsetX;
      const randomY = (Math.random() * 2 - 1) * maxOffsetY;

      setButtonPos({ x: randomX, y: randomY });
      setEscapeCount(prev => prev + 1);
    } else if (escapeCount === MAX_ESCAPES - 1) {
      playSwishSound();
      // Return smoothly to the original center position below the text
      setButtonPos({ x: 0, y: 0 });
      setEscapeCount(prev => prev + 1);
    }
  };

  const handleClick = () => {
    if (escapeCount >= MAX_ESCAPES) {
      playConfettiSound();
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
      });
      onReveal();
    } else {
      handleInteraction();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5 }}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-white/90 backdrop-blur-md"
    >
      <h2 className="text-4xl md:text-6xl text-rose-600 mb-16 text-center px-4 leading-tight" style={{ fontFamily: "'Dancing Script', cursive" }}>
        Will you go on a date with me?
      </h2>

      <motion.button
        animate={{
          x: buttonPos.x,
          y: buttonPos.y,
          scale: escapeCount >= MAX_ESCAPES ? 1.1 : 1,
          backgroundColor: escapeCount >= MAX_ESCAPES ? "#fbbf24" : "#e11d48",
          color: escapeCount >= MAX_ESCAPES ? "#78350f" : "#ffffff",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        onMouseEnter={handleInteraction}
        onClick={handleClick}
        className={`px-12 py-4 rounded-full font-bold text-xl shadow-xl cursor-pointer ${escapeCount >= MAX_ESCAPES ? 'animate-pulse shadow-amber-300' : 'shadow-rose-300'}`}
      >
        Yes
      </motion.button>
    </motion.div>
  )
}

// --- Final Reveal Panel ---
const Reveal = () => {
  const [showHeartShower, setShowHeartShower] = useState(false);

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    if (e.currentTarget.currentTime >= 4.5 && !showHeartShower) {
      setShowHeartShower(true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 2 }}
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center overflow-hidden"
      style={{
        backgroundImage: 'url(/assets/final_scene_bgcolor.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Video Background matching the page color, placed in the bottom left quadrant */}
      <video
        src="/assets/final_scene_quadrant.mp4"
        autoPlay
        playsInline
        onTimeUpdate={handleTimeUpdate}
        className="absolute bottom-0 left-0 w-full md:w-1/2 h-1/3 md:h-1/2 object-contain md:object-cover z-[0]"
        style={{
          // Use a CSS mask to feather the top and right edges smoothly into the background
          maskImage: 'radial-gradient(circle at bottom left, black 25%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(circle at bottom left, black 25%, transparent 75%)'
        }}
      />

      {/* Subtle Magical Dust Effect at 5 seconds */}
      {showHeartShower && (
        <div className="absolute inset-0 pointer-events-none z-[85] overflow-hidden flex justify-center">
          {[...Array(25)].map((_, i) => (
            <motion.div
              key={i}
              initial={{
                y: -50,
                x: (Math.random() - 0.5) * window.innerWidth * 0.9,
                opacity: 0,
                scale: Math.random() * 0.5 + 0.8 // Slightly larger 
              }}
              animate={{
                y: window.innerHeight,
                opacity: [0, Math.random() * 0.5 + 0.5, 0], // Higher opacity
                x: `calc(${(Math.random() - 0.5) * window.innerWidth * 0.9}px + ${Math.random() > 0.5 ? 20 : -20}px)`,
              }}
              transition={{
                duration: Math.random() * 5 + 5, // 5 to 10 seconds
                delay: Math.random() * 1.5,
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "loop"
              }}
              // Darker, richer pink so it contrasts beautifully and visibly against the bright white background
              className="absolute top-0 w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_12px_rgba(255,100,100,0.9)]"
            />
          ))}
        </div>
      )}

      <div className="relative p-6 md:p-8 rounded-2xl shadow-2xl bg-white/95 backdrop-blur-md max-w-lg w-[90%] text-center z-[90]">
        <h2 className="text-3xl text-rose-600 mb-6" style={{ fontFamily: "'Dancing Script', cursive" }}>
          I can't wait!
        </h2>

        {/* TODO: Replace this placeholder image with a Pixar-style image of you and her */}
        {/* Placeholder image asset: /assets/final-date-image.png */}
        <div className="w-full aspect-square bg-rose-100 rounded-xl overflow-hidden mb-8 shadow-inner border border-rose-100 flex items-center justify-center">
          <img
            src="/assets/openart-image_1772931479440_a2fac5a0_1772931479739_e4244b1f.jpg"
            alt="Us"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="space-y-6 text-gray-800 text-center flex flex-col items-center">
          <div className="flex flex-col items-center">
            <span className="font-sans text-amber-600 uppercase tracking-[0.2em] text-xs font-bold mb-1 opacity-80">Date</span>
            <span className="text-xl md:text-2xl font-serif text-gray-800" style={{ fontFamily: "'Playfair Display', serif" }}>29th March 2026</span>
          </div>

          <div className="flex flex-col items-center">
            <span className="font-sans text-amber-600 uppercase tracking-[0.2em] text-xs font-bold mb-1 opacity-80">Time</span>
            <span className="text-xl md:text-2xl font-serif text-gray-800" style={{ fontFamily: "'Playfair Display', serif" }}>7:00 PM</span>
          </div>

          <div className="flex flex-col items-center pb-2">
            <span className="font-sans text-amber-600 uppercase tracking-[0.2em] text-xs font-bold mb-1 opacity-80">Place</span>
            <span className="text-2xl md:text-3xl text-rose-600" style={{ fontFamily: "'Dancing Script', cursive" }}>Musaafer</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// --- Scene 3 & 4: Video Background Journey ---
const PhaseB = ({ onReveal, phase }: { onReveal: () => void, phase: string }) => {
  const [showProposal, setShowProposal] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);

  // Use a slight delay before triggering the video source to organically 
  // prevent the 100% volume audio initialization spike on mount.
  useEffect(() => {
    const timer = setTimeout(() => {
      setVideoSrc(`/assets/background_video.mp4?v=${Date.now()}`);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;

    // Dynamic Audio Fade-in during the first 2 seconds (starts from 0)
    if (video.currentTime <= 2.0) {
      video.volume = Math.min(1, video.currentTime / 2.0);
    }

    // Dynamic Audio Fade-out during the last 2 seconds
    if (video.duration > 0) {
      const timeLeft = video.duration - video.currentTime;
      if (timeLeft <= 2.0 && timeLeft > 0) {
        // Linearly decrease volume from 1.0 to 0.0 over 2.0s
        video.volume = Math.max(0, timeLeft / 2.0);
      }
    }

    // Show the proposal shortly before the video finishes
    if (video.duration > 0 && video.currentTime >= video.duration - 0.5) {
      if (!showProposal) setShowProposal(true);
    }
  };

  const handleVideoEnded = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    // Leave the video frame pinned behind the proposal text
    e.currentTarget.pause();
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 2.5, ease: "easeInOut" }}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden"
    >
      {videoSrc && (
        <video
          src={videoSrc}
          autoPlay
          playsInline
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleVideoEnded}
          // Intentionally hardcode initial volume so the browser doesn't spike
          onCanPlay={(e) => { e.currentTarget.volume = 0; }}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Proposal Overlay */}
      <AnimatePresence>
        {showProposal && phase !== 'Reveal' && (
          <Proposal onReveal={onReveal} />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// --- Main App ---
export default function App() {
  const [phase, setPhase] = useState<'Intro' | 'A' | 'Transition' | 'B' | 'Reveal'>('Intro');

  useEffect(() => {
    if (phase === 'Transition') {
      // Phase A takes 3 seconds to fade out entirely.
      // Wait for 3.5 seconds (leaving a 0.5s pause of pure black) before mounting and playing the video.
      const timer = setTimeout(() => setPhase('B'), 3500);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  return (
    <div className="w-full min-h-screen bg-black font-sans overflow-x-hidden">
      <AnimatePresence>
        {phase === 'Intro' && <PhaseIntro onComplete={() => setPhase('A')} />}
      </AnimatePresence>

      <AnimatePresence>
        {phase === 'A' && <PhaseA onComplete={() => setPhase('Transition')} />}
      </AnimatePresence>

      {(phase === 'B' || phase === 'Reveal') && (
        <PhaseB onReveal={() => setPhase('Reveal')} phase={phase} />
      )}

      {/* Reveal Overlay */}
      <AnimatePresence>
        {phase === 'Reveal' && <Reveal />}
      </AnimatePresence>
    </div>
  )
}
