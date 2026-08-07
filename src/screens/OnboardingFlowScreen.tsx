import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Mic,
  Square,
  CheckCircle2,
  Check,
  Zap,
  Flame,
  Crown,
  Info,
  ChevronLeft,
  Smile,
  Lightbulb,
} from 'lucide-react';
import { useWeave } from '../context/WeaveContext';
import { Task } from '../types';

// ==========================================
// CORAL LEAF MASCOT ILLUSTRATIONS (CONSISTENT & CUTE)
// ==========================================

// Base Leaf Geometry Helper (Almond Leaf Body)
// Center: (100, 85), Width: ~105, Height: ~130
// Body Path: M 100 22 C 152 22, 170 70, 152 118 C 136 142, 100 152, 100 152 C 100 152, 64 142, 48 118 C 30 70, 48 22, 100 22 Z

const MascotWelcome = () => (
  <svg width="220" height="170" viewBox="0 0 220 170" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto my-1 overflow-visible">
    {/* Floor shadow */}
    <ellipse cx="110" cy="158" rx="55" ry="7" fill="#F3E5DC" opacity="0.8" />
    
    {/* Festive Party Streamers & Confetti blowing out from mascot body (Left & Right Sides) */}
    {/* Right Side */}
    <motion.rect
      x="160" y="65" width="5" height="9" rx="2" fill="#FF7A59"
      animate={{ y: [-10, -45, -20], x: [0, 30, 45], rotate: [0, 180, 360], opacity: [0, 1, 0.6] }}
      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
    />
    <motion.circle
      cx="175" cy="72" r="3.5" fill="#10B981"
      animate={{ y: [-5, -40, -15], x: [0, 25, 40], opacity: [0, 1, 0.7] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut', delay: 0.2 }}
    />
    <motion.rect
      x="150" y="55" width="4" height="10" rx="1.5" fill="#3B82F6"
      animate={{ y: [-15, -50, -25], x: [0, 10, 25], rotate: [0, 270, 450], opacity: [0, 1, 0.6] }}
      transition={{ duration: 2.6, repeat: Infinity, ease: 'easeOut', delay: 0.4 }}
    />
    <motion.path
      d="M 165 40 L 167 44 L 171 45 L 167 47 L 165 51 L 163 47 L 159 45 L 163 44 Z" fill="#F59E0B"
      animate={{ y: [10, -30, -10], x: [0, 20, 35], rotate: [0, 120, 240], opacity: [0, 1, 0.8] }}
      transition={{ duration: 2.1, repeat: Infinity, ease: 'easeOut', delay: 0.1 }}
    />
    <motion.path
      d="M 145 60 Q 165 45 185 50 T 205 35" stroke="#EC4899" strokeWidth="2.5" strokeLinecap="round" fill="none"
      animate={{ pathLength: [0.2, 1, 0.2], opacity: [0.3, 1, 0.3] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.path
      d="M 152 70 Q 170 60 190 75" stroke="#3B82F6" strokeWidth="2.2" strokeLinecap="round" fill="none"
      animate={{ pathLength: [0, 1, 0], opacity: [0, 1, 0] }}
      transition={{ duration: 2.0, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
    />

    {/* Left Side */}
    <motion.rect
      x="60" y="65" width="5" height="9" rx="2" fill="#10B981"
      animate={{ y: [-10, -45, -20], x: [0, -30, -45], rotate: [0, -180, -360], opacity: [0, 1, 0.6] }}
      transition={{ duration: 2.3, repeat: Infinity, ease: 'easeOut', delay: 0.1 }}
    />
    <motion.circle
      cx="45" cy="72" r="3.5" fill="#FF7A59"
      animate={{ y: [-5, -40, -15], x: [0, -25, -40], opacity: [0, 1, 0.7] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut', delay: 0.3 }}
    />
    <motion.rect
      x="70" y="55" width="4" height="10" rx="1.5" fill="#F59E0B"
      animate={{ y: [-15, -50, -25], x: [0, -10, -25], rotate: [0, -270, -450], opacity: [0, 1, 0.6] }}
      transition={{ duration: 2.7, repeat: Infinity, ease: 'easeOut', delay: 0.2 }}
    />
    <motion.path
      d="M 55 40 L 57 44 L 61 45 L 57 47 L 55 51 L 53 47 L 49 45 L 53 44 Z" fill="#8B5CF6"
      animate={{ y: [10, -30, -10], x: [0, -20, -35], rotate: [0, -120, -240], opacity: [0, 1, 0.8] }}
      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut', delay: 0.4 }}
    />
    <motion.path
      d="M 75 60 Q 55 45 35 50 T 15 35" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" fill="none"
      animate={{ pathLength: [0.2, 1, 0.2], opacity: [0.3, 1, 0.3] }}
      transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
    />
    <motion.path
      d="M 68 70 Q 50 60 30 75" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" fill="none"
      animate={{ pathLength: [0, 1, 0], opacity: [0, 1, 0] }}
      transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
    />

    {/* Gentle happy floating mascot group */}
    <motion.g
      animate={{ y: [0, -5, 0], rotate: [-1.5, 1.5, -1.5] }}
      transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
      style={{ originX: '110px', originY: '158px' }}
    >
      {/* Stick Legs */}
      <path d="M 95 146 C 90 154, 80 160, 72 158" stroke="#D86257" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M 125 146 C 130 154, 140 160, 148 158" stroke="#D86257" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <circle cx="70" cy="158" r="2.5" fill="#D86257" />
      <circle cx="150" cy="158" r="2.5" fill="#D86257" />

      {/* Main Leaf Body */}
      <path
        d="M 110 30 C 162 30, 180 78, 162 126 C 146 150, 110 160, 110 160 C 110 160, 74 150, 58 126 C 40 78, 58 30, 110 30 Z"
        fill="#EE7B70"
        stroke="#D86257"
        strokeWidth="2.5"
      />

      {/* Top Curved Stem */}
      <path
        d="M 110 30 C 112 18, 124 12, 132 18 C 132 24, 120 28, 110 30 Z"
        fill="#EE7B70"
        stroke="#D86257"
        strokeWidth="2"
      />

      {/* Stick Arms resting naturally on the outer side silhouette of the leaf */}
      <path d="M 52 92 C 38 98, 36 112, 48 110" stroke="#D86257" strokeWidth="2.8" strokeLinecap="round" fill="none" />
      <path d="M 168 92 C 182 98, 184 112, 172 110" stroke="#D86257" strokeWidth="2.8" strokeLinecap="round" fill="none" />

      {/* Internal Leaf Veins */}
      <path d="M 110 30 L 110 158" stroke="#C85248" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M 110 56 C 130 48, 148 54, 155 60" stroke="#C85248" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M 110 80 C 135 73, 152 80, 160 86" stroke="#C85248" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M 110 106 C 130 100, 148 108, 152 116" stroke="#C85248" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M 110 56 C 90 48, 72 54, 65 60" stroke="#C85248" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M 110 80 C 85 73, 68 80, 60 86" stroke="#C85248" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M 110 106 C 90 100, 72 108, 68 116" stroke="#C85248" strokeWidth="1.8" strokeLinecap="round" fill="none" />

      {/* Kawaii Face: Eyes with natural blinking animation */}
      <motion.ellipse
        cx="90"
        cy="82"
        rx="5"
        fill="#321A18"
        animate={{ ry: [6, 6, 0.5, 6, 6] }}
        transition={{ duration: 3.5, repeat: Infinity, times: [0, 0.45, 0.5, 0.55, 1] }}
      />
      <motion.circle
        cx="88.5"
        cy="80"
        fill="#FFFFFF"
        animate={{ r: [2.2, 2.2, 0.2, 2.2, 2.2], opacity: [1, 1, 0, 1, 1] }}
        transition={{ duration: 3.5, repeat: Infinity, times: [0, 0.45, 0.5, 0.55, 1] }}
      />
      <motion.circle
        cx="91.8"
        cy="84"
        fill="#FFFFFF"
        animate={{ r: [1, 1, 0.1, 1, 1], opacity: [1, 1, 0, 1, 1] }}
        transition={{ duration: 3.5, repeat: Infinity, times: [0, 0.45, 0.5, 0.55, 1] }}
      />

      <motion.ellipse
        cx="130"
        cy="82"
        rx="5"
        fill="#321A18"
        animate={{ ry: [6, 6, 0.5, 6, 6] }}
        transition={{ duration: 3.5, repeat: Infinity, times: [0, 0.45, 0.5, 0.55, 1] }}
      />
      <motion.circle
        cx="128.5"
        cy="80"
        fill="#FFFFFF"
        animate={{ r: [2.2, 2.2, 0.2, 2.2, 2.2], opacity: [1, 1, 0, 1, 1] }}
        transition={{ duration: 3.5, repeat: Infinity, times: [0, 0.45, 0.5, 0.55, 1] }}
      />
      <motion.circle
        cx="131.8"
        cy="84"
        fill="#FFFFFF"
        animate={{ r: [1, 1, 0.1, 1, 1], opacity: [1, 1, 0, 1, 1] }}
        transition={{ duration: 3.5, repeat: Infinity, times: [0, 0.45, 0.5, 0.55, 1] }}
      />

      {/* Rosy Pink Blush Cheeks */}
      <ellipse cx="82" cy="91" rx="6.5" ry="4" fill="#FF9E93" opacity="0.9" />
      <ellipse cx="138" cy="91" rx="6.5" ry="4" fill="#FF9E93" opacity="0.9" />

      {/* Sweet Smile */}
      <path d="M 102 93 Q 110 101 118 93" stroke="#8A2E26" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </motion.g>

    {/* Small floating star icons around mascot */}
    <motion.g
      animate={{ y: [0, -6, 0], rotate: [-6, 6, -6] }}
      transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
    >
      <path d="M192 32 L195 38 L201 41 L195 44 L192 50 L189 44 L183 41 L189 38 Z" fill="#F59E0B" />
    </motion.g>

    <motion.g
      animate={{ y: [0, -5, 0], scale: [1, 1.15, 1] }}
      transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
    >
      <path d="M25 40 L27 44 L31 46 L27 48 L25 52 L23 48 L19 46 L23 44 Z" fill="#FF7A59" />
    </motion.g>
  </svg>
);

// Mascot for Question 1: Primary Focus (Body turning, pupils prominently looking left and right)
const MascotPrimaryFocus = () => (
  <svg width="180" height="155" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto my-2">
    <ellipse cx="100" cy="150" rx="55" ry="7" fill="#F3E5DC" opacity="0.8" />

    {/* Looping Body Turning / Tilting left & right as if inspecting options */}
    <motion.g
      animate={{ rotate: [-4, 4, -4], x: [-3, 3, -3] }}
      transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
    >
      {/* Stick Legs standing thoughtfully */}
      <path d="M 85 138 C 80 146, 70 152, 62 150" stroke="#D86257" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M 115 138 C 120 146, 130 152, 138 150" stroke="#D86257" strokeWidth="2.5" strokeLinecap="round" fill="none" />

      {/* Main Leaf Body */}
      <path
        d="M 100 22 C 152 22, 170 70, 152 118 C 136 142, 100 152, 100 152 C 100 152, 64 142, 48 118 C 30 70, 48 22, 100 22 Z"
        fill="#EE7B70"
        stroke="#D86257"
        strokeWidth="2.5"
      />

      {/* Top Stem */}
      <path d="M 100 22 C 102 10, 114 4, 122 10 C 122 16, 110 20, 100 22 Z" fill="#EE7B70" stroke="#D86257" strokeWidth="2" />

      {/* Veins */}
      <path d="M 100 22 L 100 150" stroke="#C85248" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M 100 48 C 120 40, 138 46, 145 52" stroke="#C85248" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M 100 72 C 125 65, 142 72, 150 78" stroke="#C85248" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M 100 98 C 120 92, 138 100, 142 108" stroke="#C85248" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M 100 48 C 80 40, 62 46, 55 52" stroke="#C85248" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M 100 72 C 75 65, 58 72, 50 78" stroke="#C85248" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M 100 98 C 80 92, 62 100, 58 108" stroke="#C85248" strokeWidth="1.8" strokeLinecap="round" fill="none" />

      {/* Left Arm on hip */}
      <path d="M 50 86 C 32 90, 32 104, 46 102" stroke="#D86257" strokeWidth="2.8" strokeLinecap="round" fill="none" />

      {/* Eyebrows */}
      <path d="M 72 63 Q 80 65 88 62" stroke="#8A2E26" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <motion.path
        d="M 112 52 Q 122 44 130 52"
        stroke="#8A2E26"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Kawaii Eyes Prominently Looking Left and Right */}
      <ellipse cx="80" cy="72" rx="5.5" ry="6.5" fill="#321A18" />
      <motion.circle
        cx="80"
        cy="70"
        r="2.2"
        fill="#FFFFFF"
        animate={{ cx: [77, 83, 77] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <ellipse cx="120" cy="70" rx="5.5" ry="6.5" fill="#321A18" />
      <motion.circle
        cx="120"
        cy="68"
        r="2.2"
        fill="#FFFFFF"
        animate={{ cx: [117, 123, 117] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Rosy Cheeks */}
      <ellipse cx="70" cy="80" rx="6" ry="4" fill="#FF9E93" opacity="0.9" />
      <ellipse cx="130" cy="78" rx="6" ry="4" fill="#FF9E93" opacity="0.9" />

      {/* Poursed Mouth */}
      <path d="M 94 85 Q 100 82 106 87" stroke="#8A2E26" strokeWidth="2.5" strokeLinecap="round" fill="none" />

      {/* Right Arm resting on chin in deep thought */}
      <path d="M 148 88 C 140 106, 120 110, 104 96" stroke="#D86257" strokeWidth="2.8" strokeLinecap="round" fill="none" />
      <path d="M 104 96 L 102 84" stroke="#D86257" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M 104 96 C 108 98, 114 96, 116 92" stroke="#D86257" strokeWidth="2.8" strokeLinecap="round" fill="none" />
      <path d="M 104 96 C 108 102, 114 102, 116 97" stroke="#D86257" strokeWidth="2" strokeLinecap="round" fill="none" />
    </motion.g>

    {/* Sparkles */}
    <motion.path
      d="M 152 32 L 155 37 L 160 39 L 155 41 L 152 46 L 149 41 L 144 39 L 149 37 Z"
      fill="#FF7A59"
      animate={{ scale: [1, 1.25, 1], rotate: [0, 10, -10, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.path
      d="M 32 38 L 34 43 L 39 45 L 34 47 L 32 52 L 30 47 L 25 45 L 30 43 Z"
      fill="#F59E0B"
      animate={{ scale: [1, 1.2, 1] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
    />
  </svg>
);

// Mascot for Question 2: Task Paralysis / Overwhelm (Shocked eyes looking around at flying papers, arms raised upward in shock)
const MascotParalysis = () => (
  <svg width="180" height="155" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto my-2">
    <ellipse cx="100" cy="150" rx="55" ry="7" fill="#F3E5DC" opacity="0.8" />

    {/* Mascot body trembling/swaying slightly in shock */}
    <motion.g
      animate={{ rotate: [-2, 2, -2], y: [0, -2, 0] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
    >
      {/* Stick Legs */}
      <path d="M 85 138 C 80 146, 72 152, 65 150" stroke="#D86257" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M 115 138 C 120 146, 128 152, 135 150" stroke="#D86257" strokeWidth="2.5" strokeLinecap="round" fill="none" />

      {/* Main Leaf Body */}
      <path
        d="M 100 22 C 152 22, 170 70, 152 118 C 136 142, 100 152, 100 152 C 100 152, 64 142, 48 118 C 30 70, 48 22, 100 22 Z"
        fill="#EE7B70"
        stroke="#D86257"
        strokeWidth="2.5"
      />

      {/* Top Stem */}
      <path d="M 100 22 C 102 10, 114 4, 122 10 C 122 16, 110 20, 100 22 Z" fill="#EE7B70" stroke="#D86257" strokeWidth="2" />

      {/* Left arm raised UPWARDS in shock */}
      <motion.path
        d="M 50 82 C 34 72, 28 54, 22 42"
        stroke="#D86257"
        strokeWidth="2.8"
        strokeLinecap="round"
        fill="none"
        animate={{ y: [-2, 2, -2] }}
        transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <circle cx="21" cy="40" r="2.5" fill="#D86257" />

      {/* Right arm raised UPWARDS in shock */}
      <motion.path
        d="M 150 82 C 166 72, 172 54, 178 42"
        stroke="#D86257"
        strokeWidth="2.8"
        strokeLinecap="round"
        fill="none"
        animate={{ y: [2, -2, 2] }}
        transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <circle cx="179" cy="40" r="2.5" fill="#D86257" />

      {/* Veins */}
      <path d="M 100 22 L 100 150" stroke="#C85248" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M 100 48 C 120 40, 138 46, 145 52" stroke="#C85248" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M 100 72 C 125 65, 142 72, 150 78" stroke="#C85248" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M 100 98 C 120 92, 138 100, 142 108" stroke="#C85248" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M 100 48 C 80 40, 62 46, 55 52" stroke="#C85248" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M 100 72 C 75 65, 58 72, 50 78" stroke="#C85248" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M 100 98 C 80 92, 62 100, 58 108" stroke="#C85248" strokeWidth="1.8" strokeLinecap="round" fill="none" />

      {/* Shocked Eyes with Pupils darting around in panic */}
      <ellipse cx="78" cy="74" rx="6" ry="7" fill="#321A18" />
      <motion.circle
        cx="78"
        cy="73"
        r="2.5"
        fill="#FFFFFF"
        animate={{ x: [-2, 2, 0, -2], y: [-1, 2, -2, 0] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      />

      <ellipse cx="122" cy="74" rx="6" ry="7" fill="#321A18" />
      <motion.circle
        cx="122"
        cy="73"
        r="2.5"
        fill="#FFFFFF"
        animate={{ x: [-2, 2, 0, -2], y: [-1, 2, -2, 0] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Surprised / Shocked Open Mouth */}
      <motion.ellipse
        cx="100"
        cy="86"
        rx="5"
        ry="6.5"
        fill="#8A2E26"
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Rosy Cheeks */}
      <ellipse cx="70" cy="83" rx="6.5" ry="4" fill="#FF9E93" opacity="0.9" />
      <ellipse cx="130" cy="83" rx="6.5" ry="4" fill="#FF9E93" opacity="0.9" />

      {/* Sweat drop popping */}
      <motion.path
        d="M 128 58 Q 132 52 130 48 Q 128 52 128 58 Z"
        fill="#3B82F6"
        opacity="0.9"
        animate={{ y: [0, -3, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.g>

    {/* Flying task papers swirling dynamically */}
    <motion.g
      animate={{ y: [-4, 4, -4], rotate: [-10, 10, -10] }}
      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
    >
      <rect x="22" y="32" width="22" height="16" rx="4" fill="#FFF0EB" stroke="#FF7A59" strokeWidth="1.8" />
      <line x1="26" y1="38" x2="38" y2="38" stroke="#FF7A59" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="26" y1="43" x2="34" y2="43" stroke="#FF7A59" strokeWidth="1.5" strokeLinecap="round" />
    </motion.g>

    <motion.g
      animate={{ y: [4, -5, 4], rotate: [12, -8, 12] }}
      transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
    >
      <rect x="155" y="28" width="24" height="18" rx="4" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.8" />
      <line x1="160" y1="34" x2="173" y2="34" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="160" y1="40" x2="170" y2="40" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
    </motion.g>

    <motion.g
      animate={{ x: [-3, 3, -3], rotate: [-5, 15, -5] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
    >
      <rect x="18" y="95" width="20" height="15" rx="4" fill="#E0F2FE" stroke="#0284C7" strokeWidth="1.5" />
      <line x1="22" y1="100" x2="32" y2="100" stroke="#0284C7" strokeWidth="1.2" strokeLinecap="round" />
    </motion.g>

    <motion.g
      animate={{ y: [-3, 5, -3], rotate: [15, -10, 15] }}
      transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
    >
      <rect x="162" y="90" width="22" height="16" rx="4" fill="#F3E8FF" stroke="#9333EA" strokeWidth="1.5" />
      <line x1="166" y1="96" x2="178" y2="96" stroke="#9333EA" strokeWidth="1.2" strokeLinecap="round" />
    </motion.g>

    {/* Swirling motion dashes */}
    <path d="M 38 25 Q 60 15 85 22" stroke="#FF7A59" strokeWidth="1.5" strokeDasharray="3 3" fill="none" opacity="0.6" />
    <path d="M 120 20 Q 150 18 175 32" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="3 3" fill="none" opacity="0.6" />
  </svg>
);

// Mascot for Question 3: Focus Pace (Holding a cozy stick candle with prominent golden flame)
const MascotFocusPace = () => (
  <svg width="180" height="155" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto my-2">
    <ellipse cx="100" cy="150" rx="60" ry="7" fill="#F3E5DC" opacity="0.8" />

    {/* Gentle Serene Breathing Motion for Mascot */}
    <motion.g
      animate={{ y: [0, -2, 0] }}
      transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
    >
      {/* Stick Legs */}
      <path d="M 85 138 C 80 146, 70 152, 62 150" stroke="#D86257" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M 115 138 C 120 146, 130 152, 138 150" stroke="#D86257" strokeWidth="2.5" strokeLinecap="round" fill="none" />

      {/* Main Leaf Body */}
      <path
        d="M 100 22 C 152 22, 170 70, 152 118 C 136 142, 100 152, 100 152 C 100 152, 64 142, 48 118 C 30 70, 48 22, 100 22 Z"
        fill="#EE7B70"
        stroke="#D86257"
        strokeWidth="2.5"
      />

      {/* Top Stem */}
      <path d="M 100 22 C 102 10, 114 4, 122 10 C 122 16, 110 20, 100 22 Z" fill="#EE7B70" stroke="#D86257" strokeWidth="2" />

      {/* Veins - Fully Symmetric on BOTH left and right */}
      <path d="M 100 22 L 100 150" stroke="#C85248" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M 100 48 C 120 40, 138 46, 145 52" stroke="#C85248" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M 100 72 C 125 65, 142 72, 150 78" stroke="#C85248" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M 100 98 C 120 92, 138 100, 142 108" stroke="#C85248" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M 100 48 C 80 40, 62 46, 55 52" stroke="#C85248" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M 100 72 C 75 65, 58 72, 50 78" stroke="#C85248" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M 100 98 C 80 92, 62 100, 58 108" stroke="#C85248" strokeWidth="1.8" strokeLinecap="round" fill="none" />

      {/* Peaceful Gentle Eyes */}
      <path d="M 74 74 Q 80 80 86 74" stroke="#321A18" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M 114 74 Q 120 80 126 74" stroke="#321A18" strokeWidth="2.5" strokeLinecap="round" fill="none" />

      {/* Gentle Serene Smile */}
      <path d="M 94 84 Q 100 90 106 84" stroke="#8A2E26" strokeWidth="2.2" strokeLinecap="round" fill="none" />

      {/* Rosy Cheeks */}
      <ellipse cx="70" cy="81" rx="6" ry="4" fill="#FF9E93" opacity="0.9" />
      <ellipse cx="130" cy="81" rx="6" ry="4" fill="#FF9E93" opacity="0.9" />

      {/* Stick Arms gently holding candle holder */}
      <path d="M 52 88 C 68 98, 80 102, 88 100" stroke="#D86257" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M 148 88 C 132 98, 120 102, 112 100" stroke="#D86257" strokeWidth="2.5" strokeLinecap="round" fill="none" />

      {/* Cozy Candle Base & Holder Ring */}
      <path d="M 86 104 L 114 104 Q 100 110 86 104 Z" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.5" />
      <path d="M 114 102 Q 120 102 118 107 Q 114 108 114 104" stroke="#94A3B8" strokeWidth="1.5" fill="none" />

      {/* Prominent Stick Candle */}
      <rect x="94" y="78" width="12" height="26" rx="2" fill="#FFFDF5" stroke="#CBD5E1" strokeWidth="1.5" />
      <line x1="100" y1="78" x2="100" y2="70" stroke="#334155" strokeWidth="1.8" strokeLinecap="round" />
    </motion.g>

    {/* Warm Soft Glow Aura Backdrop Pulsing */}
    <motion.ellipse
      cx="100"
      cy="55"
      rx="20"
      ry="22"
      fill="#F59E0B"
      animate={{ opacity: [0.18, 0.35, 0.18], scale: [0.92, 1.1, 0.92] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
    />

    {/* Outer Prominent Golden Flame Flickering vividly */}
    <motion.path
      d="M 100 36 C 112 50, 110 66, 100 70 C 90 66, 88 50, 100 36 Z"
      fill="#F59E0B"
      animate={{ scale: [1, 1.12, 0.94, 1.08, 1], opacity: [0.9, 1, 0.85, 1] }}
      transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
    />

    {/* Inner Bright Golden Flame Core */}
    <motion.path
      d="M 100 45 C 106 55, 105 65, 100 68 C 95 65, 94 55, 100 45 Z"
      fill="#FDE047"
      animate={{ scale: [1, 1.15, 0.9, 1.1, 1] }}
      transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
    />
    <circle cx="100" cy="62" r="2.5" fill="#FFFFFF" />

    {/* Radiating Warmth Lines */}
    <motion.path
      d="M 78 50 L 72 46"
      stroke="#F59E0B"
      strokeWidth="1.5"
      strokeLinecap="round"
      animate={{ opacity: [0.4, 0.9, 0.4] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.path
      d="M 122 50 L 128 46"
      stroke="#F59E0B"
      strokeWidth="1.5"
      strokeLinecap="round"
      animate={{ opacity: [0.9, 0.4, 0.9] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
    />
    <path d="M 100 28 L 100 22" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
  </svg>
);

// Mascot for Question 4: Task Uncertainty / Granularity Balancing (Leaf balancing on a balance board / seesaw with arms wide open)
const MascotScales = () => (
  <svg width="180" height="155" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto my-2">
    <ellipse cx="100" cy="154" rx="60" ry="7" fill="#F3E5DC" opacity="0.8" />

    {/* Seesaw Base Pivot Triangle */}
    <path d="M 100 138 L 91 152 L 109 152 Z" fill="#D97706" stroke="#B45309" strokeWidth="1.5" strokeLinejoin="round" />
    <circle cx="100" cy="138" r="3" fill="#F59E0B" />

    {/* Tilting Assembly (Balance Board Plank & Leaf Mascot standing on top) */}
    <motion.g
      style={{ originX: '100px', originY: '138px' }}
      animate={{ rotate: [-7, 7, -7] }}
      transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
    >
      {/* Wooden Balance Plank */}
      <path d="M 22 138 L 178 138" stroke="#D97706" strokeWidth="5" strokeLinecap="round" />
      {/* Small weight indicators on ends of plank */}
      <rect x="28" y="126" width="12" height="12" rx="3" fill="#FF7A59" stroke="#D86257" strokeWidth="1" />
      <rect x="160" y="126" width="12" height="12" rx="3" fill="#F59E0B" stroke="#D97706" strokeWidth="1" />

      {/* Stick Legs standing on balance board */}
      <path d="M 85 126 C 82 132, 75 137, 70 138" stroke="#D86257" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M 115 126 C 118 132, 125 137, 130 138" stroke="#D86257" strokeWidth="2.5" strokeLinecap="round" fill="none" />

      {/* Main Leaf Body */}
      <path
        d="M 100 10 C 152 10, 170 58, 152 106 C 136 130, 100 138, 100 138 C 100 138, 64 130, 48 106 C 30 58, 48 10, 100 10 Z"
        fill="#EE7B70"
        stroke="#D86257"
        strokeWidth="2.5"
      />

      {/* Stem */}
      <path d="M 100 10 C 102 -2, 114 -8, 122 -2 C 122 4, 110 8, 100 10 Z" fill="#EE7B70" stroke="#D86257" strokeWidth="2" />

      {/* Veins */}
      <path d="M 100 10 L 100 138" stroke="#C85248" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M 100 36 C 120 28, 138 34, 145 40" stroke="#C85248" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M 100 60 C 125 53, 142 60, 150 66" stroke="#C85248" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M 100 86 C 120 80, 138 88, 142 96" stroke="#C85248" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M 100 36 C 80 28, 62 34, 55 40" stroke="#C85248" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M 100 60 C 75 53, 58 60, 50 66" stroke="#C85248" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M 100 86 C 80 80, 62 88, 58 96" stroke="#C85248" strokeWidth="1.8" strokeLinecap="round" fill="none" />

      {/* Arms stretched wide out to the sides balancing seamlessly */}
      <motion.g animate={{ rotate: [3, -3, 3] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}>
        <path d="M 48 68 C 30 62, 18 64, 8 72" stroke="#D86257" strokeWidth="2.8" strokeLinecap="round" fill="none" />
        <path d="M 152 68 C 170 62, 182 64, 192 72" stroke="#D86257" strokeWidth="2.8" strokeLinecap="round" fill="none" />
      </motion.g>

      {/* Focused Eyes tracking with natural blink */}
      <motion.ellipse
        cx="80"
        cy="62"
        rx="5"
        fill="#321A18"
        animate={{ ry: [6, 6, 0.5, 6, 6] }}
        transition={{ duration: 3.2, repeat: Infinity, times: [0, 0.45, 0.5, 0.55, 1] }}
      />
      <motion.circle
        cx="78.5"
        cy="60"
        fill="#FFFFFF"
        animate={{ cx: [76.5, 80.5, 76.5], r: [2.2, 2.2, 0.2, 2.2, 2.2], opacity: [1, 1, 0, 1, 1] }}
        transition={{ duration: 3.2, repeat: Infinity, times: [0, 0.45, 0.5, 0.55, 1] }}
      />

      <motion.ellipse
        cx="120"
        cy="62"
        rx="5"
        fill="#321A18"
        animate={{ ry: [6, 6, 0.5, 6, 6] }}
        transition={{ duration: 3.2, repeat: Infinity, times: [0, 0.45, 0.5, 0.55, 1] }}
      />
      <motion.circle
        cx="118.5"
        cy="60"
        fill="#FFFFFF"
        animate={{ cx: [116.5, 120.5, 116.5], r: [2.2, 2.2, 0.2, 2.2, 2.2], opacity: [1, 1, 0, 1, 1] }}
        transition={{ duration: 3.2, repeat: Infinity, times: [0, 0.45, 0.5, 0.55, 1] }}
      />

      {/* Sweet Smile */}
      <path d="M 93 72 Q 100 79 107 72" stroke="#8A2E26" strokeWidth="2.2" strokeLinecap="round" fill="none" />

      {/* Rosy Cheeks */}
      <ellipse cx="72" cy="70" rx="6" ry="4" fill="#FF9E93" opacity="0.9" />
      <ellipse cx="128" cy="70" rx="6" ry="4" fill="#FF9E93" opacity="0.9" />
    </motion.g>
  </svg>
);

// Mascot for Question 5: Special Considerations (Static arms at side, static heart on body, natural quick blinking eyes)
const MascotHearts = () => (
  <svg width="180" height="155" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto my-2">
    <ellipse cx="100" cy="150" rx="55" ry="7" fill="#F3E5DC" opacity="0.8" />

    {/* Stick Legs */}
    <path d="M 85 138 C 80 146, 70 152, 62 150" stroke="#D86257" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <path d="M 115 138 C 120 146, 130 152, 138 150" stroke="#D86257" strokeWidth="2.5" strokeLinecap="round" fill="none" />

    {/* Main Leaf Body */}
    <path
      d="M 100 22 C 152 22, 170 70, 152 118 C 136 142, 100 152, 100 152 C 100 152, 64 142, 48 118 C 30 70, 48 22, 100 22 Z"
      fill="#EE7B70"
      stroke="#D86257"
      strokeWidth="2.5"
    />

    {/* Stem */}
    <path d="M 100 22 C 102 10, 114 4, 122 10 C 122 16, 110 20, 100 22 Z" fill="#EE7B70" stroke="#D86257" strokeWidth="2" />

    {/* Veins */}
    <path d="M 100 22 L 100 150" stroke="#C85248" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M 100 48 C 120 40, 138 46, 145 52" stroke="#C85248" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    <path d="M 100 72 C 125 65, 142 72, 150 78" stroke="#C85248" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    <path d="M 100 98 C 120 92, 138 100, 142 108" stroke="#C85248" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    <path d="M 100 48 C 80 40, 62 46, 55 52" stroke="#C85248" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    <path d="M 100 72 C 75 65, 58 72, 50 78" stroke="#C85248" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    <path d="M 100 98 C 80 92, 62 100, 58 108" stroke="#C85248" strokeWidth="1.8" strokeLinecap="round" fill="none" />

    {/* Arms resting statically at sides holding position */}
    <path d="M 50 86 C 36 94, 38 108, 50 106" stroke="#D86257" strokeWidth="2.8" strokeLinecap="round" fill="none" />
    <path d="M 150 86 C 164 94, 162 108, 150 106" stroke="#D86257" strokeWidth="2.8" strokeLinecap="round" fill="none" />

    {/* Caring Kawaii Eyes with Natural Quick Eyelid Blink */}
    <motion.ellipse
      cx="80"
      cy="74"
      rx="5"
      fill="#321A18"
      animate={{ ry: [6, 6, 0.5, 6, 6] }}
      transition={{ duration: 3.2, repeat: Infinity, times: [0, 0.45, 0.5, 0.55, 1] }}
    />
    <motion.circle
      cx="78.5"
      cy="72"
      fill="#FFFFFF"
      animate={{ r: [2.2, 2.2, 0.2, 2.2, 2.2], opacity: [1, 1, 0, 1, 1] }}
      transition={{ duration: 3.2, repeat: Infinity, times: [0, 0.45, 0.5, 0.55, 1] }}
    />

    <motion.ellipse
      cx="120"
      cy="74"
      rx="5"
      fill="#321A18"
      animate={{ ry: [6, 6, 0.5, 6, 6] }}
      transition={{ duration: 3.2, repeat: Infinity, times: [0, 0.45, 0.5, 0.55, 1] }}
    />
    <motion.circle
      cx="118.5"
      cy="72"
      fill="#FFFFFF"
      animate={{ r: [2.2, 2.2, 0.2, 2.2, 2.2], opacity: [1, 1, 0, 1, 1] }}
      transition={{ duration: 3.2, repeat: Infinity, times: [0, 0.45, 0.5, 0.55, 1] }}
    />

    {/* Warm Serene Smile */}
    <path d="M 92 84 Q 100 92 108 84" stroke="#8A2E26" strokeWidth="2.5" strokeLinecap="round" fill="none" />

    {/* Rosy Cheeks */}
    <ellipse cx="72" cy="82" rx="6.5" ry="4" fill="#FF9E93" opacity="0.9" />
    <ellipse cx="128" cy="82" rx="6.5" ry="4" fill="#FF9E93" opacity="0.9" />

    {/* Static Heart Resting Cleanly on Body */}
    <path d="M 100 96 Q 105 88 111 96 Q 117 104 100 115 Q 83 104 89 96 Q 95 88 100 96 Z" fill="#FF5252" stroke="#FFFFFF" strokeWidth="1.5" />
  </svg>
);

// Mascot for Question 6: Voice / Speech (Mouth moving/singing, floating musical notes)
const MascotCameraVoice = () => (
  <svg width="180" height="155" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto my-2">
    <ellipse cx="100" cy="150" rx="55" ry="7" fill="#F3E5DC" opacity="0.8" />

    {/* Body swaying rhythmically while singing */}
    <motion.g
      animate={{ rotate: [-3, 3, -3], y: [0, -2, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    >
      {/* Stick Legs */}
      <path d="M 85 138 C 80 146, 70 152, 62 150" stroke="#D86257" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M 115 138 C 120 146, 130 152, 138 150" stroke="#D86257" strokeWidth="2.5" strokeLinecap="round" fill="none" />

      {/* Stick Arms raised gesturing expressive singing */}
      <path d="M 52 85 C 38 78, 30 68, 25 58" stroke="#D86257" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M 148 85 C 162 78, 170 68, 175 58" stroke="#D86257" strokeWidth="2.5" strokeLinecap="round" fill="none" />

      {/* Main Leaf Body */}
      <path
        d="M 100 22 C 152 22, 170 70, 152 118 C 136 142, 100 152, 100 152 C 100 152, 64 142, 48 118 C 30 70, 48 22, 100 22 Z"
        fill="#EE7B70"
        stroke="#D86257"
        strokeWidth="2.5"
      />

      {/* Stem */}
      <path d="M 100 22 C 102 10, 114 4, 122 10 C 122 16, 110 20, 100 22 Z" fill="#EE7B70" stroke="#D86257" strokeWidth="2" />

      {/* Veins */}
      <path d="M 100 22 L 100 150" stroke="#C85248" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M 100 48 C 120 40, 138 46, 145 52" stroke="#C85248" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M 100 72 C 125 65, 142 72, 150 78" stroke="#C85248" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M 100 98 C 120 92, 138 100, 142 108" stroke="#C85248" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M 100 48 C 80 40, 62 46, 55 52" stroke="#C85248" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M 100 72 C 75 65, 58 72, 50 78" stroke="#C85248" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M 100 98 C 80 92, 62 100, 58 108" stroke="#C85248" strokeWidth="1.8" strokeLinecap="round" fill="none" />

      {/* Eyes Happy Arcs */}
      <path d="M 76 72 Q 82 66 88 72" stroke="#321A18" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M 112 72 Q 118 66 124 72" stroke="#321A18" strokeWidth="2.5" strokeLinecap="round" fill="none" />

      {/* Animated Singing Mouth Opening and Closing */}
      <motion.ellipse
        cx="100"
        cy="85"
        rx="6"
        ry="7"
        fill="#8A2E26"
        animate={{ ry: [3, 7.5, 4, 8, 3], rx: [5, 6.5, 4.5, 6, 5] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Rosy Cheeks */}
      <ellipse cx="72" cy="81" rx="6" ry="4" fill="#FF9E93" opacity="0.9" />
      <ellipse cx="128" cy="81" rx="6" ry="4" fill="#FF9E93" opacity="0.9" />
    </motion.g>

    {/* Floating Musical Notes Floating Upward */}
    <motion.text
      x="142"
      y="55"
      fill="#F59E0B"
      fontSize="18"
      fontWeight="bold"
      fontFamily="sans-serif"
      animate={{ y: [55, 38, 55], opacity: [0.6, 1, 0.6], rotate: [-10, 10, -10] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    >
      ♪
    </motion.text>
    <motion.text
      x="160"
      y="38"
      fill="#FF7A59"
      fontSize="22"
      fontWeight="bold"
      fontFamily="sans-serif"
      animate={{ y: [38, 22, 38], opacity: [0.8, 1, 0.8], rotate: [5, -15, 5] }}
      transition={{ duration: 2.3, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
    >
      ♫
    </motion.text>
    <motion.text
      x="38"
      y="50"
      fill="#10B981"
      fontSize="16"
      fontWeight="bold"
      fontFamily="sans-serif"
      animate={{ y: [50, 35, 50], opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
    >
      ♩
    </motion.text>

    <motion.path
      d="M 125 78 Q 135 85 125 92"
      stroke="#F59E0B"
      strokeWidth="2.5"
      strokeLinecap="round"
      fill="none"
      animate={{ opacity: [0.3, 1, 0.3] }}
      transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.path
      d="M 133 72 Q 146 85 133 98"
      stroke="#FF7A59"
      strokeWidth="2.5"
      strokeLinecap="round"
      fill="none"
      animate={{ opacity: [1, 0.3, 1] }}
      transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
    />
  </svg>
);

// Mascot for Home Widget Preview (Leaf beside Animated Dashboard Widget with looping progress ring & bars)
const MascotWidget = () => (
  <svg width="200" height="160" viewBox="0 0 210 165" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto my-2 overflow-visible">
    <ellipse cx="105" cy="155" rx="80" ry="7" fill="#F3E5DC" opacity="0.8" />

    {/* Phone Widget Frame standing on the right */}
    <rect x="96" y="32" width="102" height="112" rx="18" fill="#FFFFFF" stroke="#FF7A59" strokeWidth="2.5" />

    {/* Dashboard Widget Header */}
    <rect x="108" y="42" width="40" height="6" rx="3" fill="#FFEFEA" />
    <circle cx="186" cy="45" r="4" fill="#F59E0B" />

    {/* Animated 85% Metric Progress Wheel Filling Up and Un-filling in a smooth loop */}
    <circle cx="128" cy="82" r="18" stroke="#F1F5F9" strokeWidth="4.5" fill="none" />
    <motion.circle
      cx="128"
      cy="82"
      r="18"
      stroke="#FF7A59"
      strokeWidth="4.5"
      fill="none"
      strokeDasharray="113"
      animate={{ strokeDashoffset: [113, 17, 113] }}
      transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
      strokeLinecap="round"
      transform="rotate(-90 128 82)"
    />
    <motion.text
      x="128"
      y="85.5"
      textAnchor="middle"
      fill="#0F172A"
      fontSize="10"
      fontWeight="900"
      fontFamily="sans-serif"
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
    >
      85%
    </motion.text>

    {/* Widget Task List Items with Animated Filling Progress Bars */}
    <rect x="154" y="68" width="34" height="6" rx="3" fill="#F1F5F9" />
    <motion.rect
      x="154" y="68" height="6" rx="3" fill="#FF7A59"
      animate={{ width: [0, 34, 34, 0] }}
      transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
    />

    <rect x="154" y="79" width="28" height="5" rx="2.5" fill="#F1F5F9" />
    <motion.rect
      x="154" y="79" height="5" rx="2.5" fill="#F59E0B"
      animate={{ width: [0, 28, 28, 0] }}
      transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
    />

    <rect x="154" y="89" width="32" height="5" rx="2.5" fill="#F1F5F9" />
    <motion.rect
      x="154" y="89" height="5" rx="2.5" fill="#3B82F6"
      animate={{ width: [0, 32, 32, 0] }}
      transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
    />

    {/* Bottom Task Card Widget Bar with Animated Progress Fill */}
    <rect x="108" y="112" width="78" height="20" rx="8" fill="#FFF0EB" stroke="#FF7A59" strokeWidth="1.2" />
    <motion.circle
      cx="118" cy="122" r="4" fill="#10B981"
      animate={{ scale: [1, 1.35, 1], opacity: [0.7, 1, 0.7] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
    />
    <rect x="127" y="119" width="48" height="5" rx="2.5" fill="#E2E8F0" />
    <motion.rect
      x="127" y="119" height="5" rx="2.5" fill="#334155"
      animate={{ width: [0, 48, 48, 0] }}
      transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
    />

    {/* Full Leaf Mascot standing proudly beside widget on left */}
    {/* Stick Legs */}
    <path d="M 40 134 C 36 142, 28 148, 22 146" stroke="#D86257" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <path d="M 64 134 C 68 142, 76 148, 82 146" stroke="#D86257" strokeWidth="2.5" strokeLinecap="round" fill="none" />

    {/* Main Leaf Body */}
    <path
      d="M 52 26 C 92 26, 106 64, 92 112 C 78 134, 52 142, 52 142 C 52 142, 26 134, 12 112 C -2 64, 12 26, 52 26 Z"
      fill="#EE7B70"
      stroke="#D86257"
      strokeWidth="2.5"
    />

    {/* Stem */}
    <path d="M 52 26 C 54 16, 64 10, 70 16 C 70 22, 60 24, 52 26 Z" fill="#EE7B70" stroke="#D86257" strokeWidth="2" />

    {/* Internal Leaf Veins */}
    <path d="M 52 26 L 52 142" stroke="#C85248" strokeWidth="2" strokeLinecap="round" />
    <path d="M 52 50 C 70 44, 84 50, 90 56" stroke="#C85248" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    <path d="M 52 74 C 72 68, 86 74, 92 80" stroke="#C85248" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    <path d="M 52 98 C 70 93, 84 100, 88 106" stroke="#C85248" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    <path d="M 52 50 C 34 44, 20 50, 14 56" stroke="#C85248" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    <path d="M 52 74 C 32 68, 18 74, 12 80" stroke="#C85248" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    <path d="M 52 98 C 34 93, 20 100, 16 106" stroke="#C85248" strokeWidth="1.6" strokeLinecap="round" fill="none" />

    {/* Stick Arms coming directly out from the outer side silhouette of the leaf body */}
    {/* Left Arm extending outwards to left side */}
    <path d="M 8 80 C -4 86, -6 98, 4 102" stroke="#D86257" strokeWidth="2.8" strokeLinecap="round" fill="none" />
    {/* Right Arm gesturing outwards toward the widget on right */}
    <path d="M 94 80 C 106 84, 108 96, 98 100" stroke="#D86257" strokeWidth="2.8" strokeLinecap="round" fill="none" />

    {/* Kawaii Eyes with Natural Eyelid Blink */}
    <motion.ellipse
      cx="36"
      cy="70"
      rx="4.5"
      fill="#321A18"
      animate={{ ry: [5.5, 5.5, 0.5, 5.5, 5.5] }}
      transition={{ duration: 3.2, repeat: Infinity, times: [0, 0.45, 0.5, 0.55, 1] }}
    />
    <motion.circle
      cx="34.8"
      cy="68"
      fill="#FFFFFF"
      animate={{ r: [2, 2, 0.2, 2, 2], opacity: [1, 1, 0, 1, 1] }}
      transition={{ duration: 3.2, repeat: Infinity, times: [0, 0.45, 0.5, 0.55, 1] }}
    />

    <motion.ellipse
      cx="68"
      cy="70"
      rx="4.5"
      fill="#321A18"
      animate={{ ry: [5.5, 5.5, 0.5, 5.5, 5.5] }}
      transition={{ duration: 3.2, repeat: Infinity, times: [0, 0.45, 0.5, 0.55, 1] }}
    />
    <motion.circle
      cx="66.8"
      cy="68"
      fill="#FFFFFF"
      animate={{ r: [2, 2, 0.2, 2, 2], opacity: [1, 1, 0, 1, 1] }}
      transition={{ duration: 3.2, repeat: Infinity, times: [0, 0.45, 0.5, 0.55, 1] }}
    />

    {/* Cheerful Mouth */}
    <path d="M 44 79 Q 52 86 60 79" stroke="#8A2E26" strokeWidth="2.2" strokeLinecap="round" fill="none" />

    {/* Rosy Pink Blush Cheeks */}
    <ellipse cx="28" cy="78" rx="5.5" ry="3.8" fill="#FF9E93" opacity="0.9" />
    <ellipse cx="76" cy="78" rx="5.5" ry="3.8" fill="#FF9E93" opacity="0.9" />
  </svg>
);

// Mascot for Question 8: Save Progress / Account (Celebrating & jumping with arms waving)
const MascotParty = () => (
  <svg width="180" height="155" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto my-2">
    <ellipse cx="100" cy="150" rx="60" ry="7" fill="#F3E5DC" opacity="0.8" />

    {/* Mascot Jumping & Celebrating Up and Down */}
    <motion.g
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
    >
      {/* Stick Legs jumping */}
      <path d="M 85 138 C 78 146, 68 150, 60 144" stroke="#D86257" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M 115 138 C 122 146, 132 150, 140 144" stroke="#D86257" strokeWidth="2.5" strokeLinecap="round" fill="none" />

      {/* Raised Arms waving back and forth in celebration */}
      <motion.path
        d="M 52 85 C 38 72, 28 58, 22 48"
        stroke="#D86257"
        strokeWidth="2.8"
        strokeLinecap="round"
        fill="none"
        animate={{ rotate: [-6, 6, -6] }}
        transition={{ duration: 0.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.path
        d="M 148 85 C 162 72, 172 58, 178 48"
        stroke="#D86257"
        strokeWidth="2.8"
        strokeLinecap="round"
        fill="none"
        animate={{ rotate: [6, -6, 6] }}
        transition={{ duration: 0.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Leaf Body */}
      <path
        d="M 100 22 C 152 22, 170 70, 152 118 C 136 142, 100 152, 100 152 C 100 152, 64 142, 48 118 C 30 70, 48 22, 100 22 Z"
        fill="#EE7B70"
        stroke="#D86257"
        strokeWidth="2.5"
      />

      {/* Striped Party Cone Hat on top */}
      <path d="M 92 28 L 108 2 L 120 26 Z" fill="#FF7A59" stroke="#E86848" strokeWidth="2" />
      <line x1="98" y1="18" x2="114" y2="12" stroke="#FFFFFF" strokeWidth="2" />
      <line x1="94" y1="24" x2="118" y2="18" stroke="#F59E0B" strokeWidth="2" />
      <circle cx="108" cy="2" r="4" fill="#F59E0B" />

      {/* Veins */}
      <path d="M 100 28 L 100 150" stroke="#C85248" strokeWidth="2.2" strokeLinecap="round" />

      {/* Eyes Happy Arcs */}
      <path d="M 76 72 Q 82 66 88 72" stroke="#321A18" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M 112 72 Q 118 66 124 72" stroke="#321A18" strokeWidth="2.5" strokeLinecap="round" fill="none" />

      {/* Big Happy Celebrating Smile */}
      <path d="M 90 82 Q 100 94 110 82" stroke="#8A2E26" strokeWidth="2.8" strokeLinecap="round" fill="none" />

      {/* Cheeks */}
      <ellipse cx="72" cy="80" rx="6" ry="4" fill="#FF9E93" opacity="0.9" />
      <ellipse cx="128" cy="80" rx="6" ry="4" fill="#FF9E93" opacity="0.9" />
    </motion.g>

    {/* Confetti Dots Floating around */}
    <motion.circle cx="30" cy="35" r="4" fill="#F59E0B" animate={{ y: [0, -8, 0], scale: [1, 1.2, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
    <motion.circle cx="170" cy="28" r="5" fill="#FF7A59" animate={{ y: [0, -6, 0], scale: [1, 1.2, 1] }} transition={{ duration: 1.4, repeat: Infinity, delay: 0.2 }} />
    <motion.circle cx="22" cy="80" r="3.5" fill="#10B981" animate={{ y: [0, -5, 0] }} transition={{ duration: 1.1, repeat: Infinity, delay: 0.4 }} />
    <motion.circle cx="178" cy="75" r="4" fill="#8B5CF6" animate={{ y: [0, -7, 0] }} transition={{ duration: 1.3, repeat: Infinity, delay: 0.1 }} />
    <motion.circle cx="45" cy="20" r="3" fill="#EC4899" animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
  </svg>
);

// ==========================================
// MAIN ONBOARDING SCREEN
// ==========================================

export const OnboardingFlowScreen: React.FC = () => {
  const { setActiveTab, addTasksFromVoice, setIsPro } = useWeave();

  // Onboarding Step State (0 to 8 matching Amy flow)
  // 0 = Welcome
  // 1 = Focus Area
  // 2 = Task Paralysis Cause
  // 3 = Activity Level & Focus Pace
  // 4 = Task Granularity Slider (Uncertainty screen)
  // 5 = Special Considerations (Multi-select)
  // 6 = Test Voice Brain Dump
  // 7 = Home Screen Widget Preview
  // 8 = Save Progress & Trial Unlock
  const [step, setStep] = useState<number>(0);

  // Questionnaire States
  const [focusArea, setFocusArea] = useState<string | null>(null);
  const [paralysisCause, setParalysisCause] = useState<string | null>(null);
  const [activityPace, setActivityPace] = useState<string | null>('moderate');

  // Uncertainty / Granularity Slider State (1 to 5)
  // 1 = Super Micro (1-2 min)
  // 2 = Bite-sized (3-5 min)
  // 3 = Balanced (5-10 min)
  // 4 = Broad Steps (15+ min)
  // 5 = High-Level (30+ min)
  const [granularityLevel, setGranularityLevel] = useState<number>(3);

  // Special Considerations Multi-Select Pills
  const [selectedPills, setSelectedPills] = useState<string[]>(['High Focus', 'Voice-First']);
  const [customNote, setCustomNote] = useState<string>('');

  // Voice Test State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [generatedTasks, setGeneratedTasks] = useState<Omit<Task, 'id' | 'createdAt' | 'completed'>[]>([]);

  // Widget Screen Active Tab ('home' vs 'lock')
  const [widgetTab, setWidgetTab] = useState<'home' | 'lock'>('home');

  // Timer Effect for Recording
  useEffect(() => {
    let interval: any = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Toggle multi-select pill
  const togglePill = (pill: string) => {
    setSelectedPills((prev) =>
      prev.includes(pill) ? prev.filter((p) => p !== pill) : [...prev, pill]
    );
  };

  // Handle Voice Recording Simulation & AI Deconstruction
  const handleStartRecording = () => {
    setIsRecording(true);
  };

  const handleStopRecording = async () => {
    setIsRecording(false);
    setIsProcessingAI(true);

    try {
      const response = await fetch('/api/deconstruct-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript:
            'I need to finish my design prototype for client presentation tomorrow, clean off my messy desk so I can focus, and pay my electric bill before 5pm.',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.tasks && Array.isArray(data.tasks) && data.tasks.length > 0) {
          setGeneratedTasks(data.tasks);
          setIsProcessingAI(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Fallback to mock onboarding AI response:', e);
    }

    // Default Fallback Mock Micro-Tasks
    setTimeout(() => {
      setGeneratedTasks([
        {
          title: 'Design Prototype Polish',
          category: 'Work',
          estimatedMinutes: 12,
          energyLevel: 'Medium',
          microSteps: [
            { id: '1a', title: 'Open Figma & inspect screen frame', completed: false, estimatedMinutes: 2 },
            { id: '1b', title: 'Fix primary button alignment & colors', completed: false, estimatedMinutes: 5 },
            { id: '1c', title: 'Export preview link for client', completed: false, estimatedMinutes: 5 },
          ],
        },
        {
          title: 'Quick Desk Declutter',
          category: 'Personal',
          estimatedMinutes: 5,
          energyLevel: 'Low',
          microSteps: [
            { id: '2a', title: 'Throw away empty coffee cups & wrappers', completed: false, estimatedMinutes: 2 },
            { id: '2b', title: 'Stack stray notebooks in a neat pile', completed: false, estimatedMinutes: 3 },
          ],
        },
        {
          title: 'Electric Bill Payment',
          category: 'Personal',
          estimatedMinutes: 3,
          energyLevel: 'Low',
          microSteps: [
            { id: '3a', title: 'Open banking app or utility portal', completed: false, estimatedMinutes: 1 },
            { id: '3b', title: 'Confirm amount due & submit quick payment', completed: false, estimatedMinutes: 2 },
          ],
        },
      ]);
      setIsProcessingAI(false);
    }, 1500);
  };

  // Finalize Onboarding & Start Free Trial
  const handleCompletePaywallAndStart = () => {
    if (generatedTasks.length > 0) {
      addTasksFromVoice(generatedTasks);
    }
    setIsPro(true);
    confetti({
      particleCount: 80,
      spread: 90,
      origin: { y: 0.6 },
      colors: ['#4F46E5', '#FF7A59', '#10B981', '#8B5CF6'],
    });
    setActiveTab('today');
  };

  // Granularity Preview Text Helper
  const getGranularityInfo = () => {
    switch (granularityLevel) {
      case 1:
        return {
          title: 'Super Micro-Steps',
          tag: '⚡ Ultra Low Friction',
          desc: 'Breaks 1 task into 4-6 sub-2-minute micro actions. Best for extreme ADHD paralysis.',
          example: 'e.g., "Open laptop" → "Type 1 sentence" → "Save draft"',
        };
      case 2:
        return {
          title: 'Bite-Sized Steps',
          tag: '🎯 High Momentum',
          desc: 'Breaks tasks into 3-5 minute actionable wins.',
          example: 'e.g., "Outline key points" → "Draft paragraph 1"',
        };
      case 3:
        return {
          title: 'Balanced Approach',
          tag: '⚖️ Standard Flow',
          desc: 'Balanced estimation for smooth steady progress without clutter.',
          example: 'e.g., "Draft email proposal" → "Review & send"',
        };
      case 4:
        return {
          title: 'Broad Steps',
          tag: '🚀 Quick Overview',
          desc: 'Keeps steps consolidated into 15+ minute focus blocks.',
          example: 'e.g., "Complete presentation slides"',
        };
      case 5:
        return {
          title: 'High-Level Tasks',
          tag: '📌 Minimalist',
          desc: 'Simple direct task logging without extra sub-step breakdown.',
          example: 'e.g., "Finish quarterly report"',
        };
      default:
        return {
          title: 'Balanced Approach',
          tag: '⚖️ Standard Flow',
          desc: 'Balanced estimation for smooth steady progress.',
          example: 'e.g., "Draft email proposal" → "Review & send"',
        };
    }
  };

  const currentGranularity = getGranularityInfo();

  return (
    <div className="relative min-h-screen pb-24 pt-3 px-4 max-w-md mx-auto select-none bg-[#FFFDF9] text-zinc-900 flex flex-col justify-between overflow-x-hidden font-sans">
      {/* ========================================== */}
      {/* TOP PROGRESS BAR & BACK ARROW (Steps 1 to 8) */}
      {/* ========================================== */}
      {step >= 1 && step <= 8 && (
        <div className="w-full mb-3 pt-1">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setStep((prev) => Math.max(0, prev - 1))}
              className="w-8 h-8 rounded-full bg-amber-100/60 flex items-center justify-center text-zinc-700 hover:bg-amber-200/80 transition-colors cursor-pointer"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-[11px] font-bold text-zinc-400">
              {step} / 8
            </span>
          </div>

          {/* Continuous Progress Line (Coral on vanilla track) */}
          <div className="w-full bg-amber-100/80 h-1.5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[#FF7A59] rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: `${(step / 8) * 100}%` }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            />
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ========================================== */}
        {/* STEP 0: AMY-STYLE WELCOME SCREEN           */}
        {/* ========================================== */}
        {step === 0 && (
          <motion.div
            key="step-0"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex-1 flex flex-col items-center justify-between text-center px-2 py-6 my-auto min-h-[80vh]"
          >
            <div className="w-full my-auto flex flex-col items-center">
              {/* Handcrafted Line Art Mascot */}
              <MascotWelcome />

              <div className="relative inline-block mt-3 mb-2 text-center">
                <h1 className="text-3xl font-black text-zinc-900 tracking-tight leading-tight text-center">
                  Welcome to Weave
                </h1>
              </div>

              <p className="text-xs text-zinc-500 font-medium leading-relaxed max-w-xs mb-2 text-center">
                The most frictionless ADHD task tracking app in the world.
              </p>
              <p className="text-xs font-bold text-zinc-700 mb-8 text-center">
                Built so you stick with it.
              </p>
            </div>

            {/* Bottom Actions */}
            <div className="w-full space-y-3">
              <button
                onClick={() => setStep(1)}
                className="w-full py-4 bg-[#FF7A59] text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-[#FF7A59]/25 hover:bg-[#E86848] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Get Started</span>
              </button>

              <p className="text-xs text-zinc-400 font-medium">
                Already have an account?{' '}
                <button
                  onClick={() => setStep(8)}
                  className="text-zinc-800 font-bold underline hover:text-[#FF7A59] cursor-pointer"
                >
                  Sign in
                </button>
              </p>
            </div>
          </motion.div>
        )}

        {/* ========================================== */}
        {/* STEP 1: PRIMARY FOCUS AREA                */}
        {/* ========================================== */}
        {step === 1 && (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col justify-between py-2"
          >
            <div>
              <MascotPrimaryFocus />

              <h2 className="text-2xl font-black text-zinc-900 tracking-tight text-center mb-1">
                What's your primary focus?
              </h2>
              <p className="text-xs text-zinc-500 font-medium text-center mb-6">
                This helps us calculate accurate micro-task goals
              </p>

              <div className="space-y-3">
                {[
                  { id: 'work', title: 'Work & Professional Projects', icon: Zap },
                  { id: 'life', title: 'Household Chores & Life Admin', icon: Flame },
                  { id: 'creative', title: 'Creative Ideas & Side Projects', icon: Lightbulb },
                  { id: 'wellness', title: 'Wellness & Daily Habits', icon: Smile },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = focusArea === item.id;

                  return (
                    <motion.div
                      key={`focus-${item.id}`}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setFocusArea(item.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-white border-[#FF7A59] shadow-md shadow-[#FF7A59]/10 ring-2 ring-[#FF7A59]/20'
                          : 'bg-white border-zinc-200/80 hover:border-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            isSelected ? 'bg-[#FF7A59] text-white' : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          <Icon size={18} />
                        </div>
                        <span className="text-xs font-bold text-zinc-800">{item.title}</span>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isSelected ? 'border-[#FF7A59] bg-[#FF7A59] text-white' : 'border-zinc-300'
                        }`}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <button
              disabled={!focusArea}
              onClick={() => setStep(2)}
              className={`w-full py-4 mt-6 rounded-2xl font-extrabold text-sm text-white transition-all cursor-pointer ${
                focusArea
                  ? 'bg-[#FF7A59] shadow-lg shadow-[#FF7A59]/25 hover:bg-[#E86848]'
                  : 'bg-zinc-300 cursor-not-allowed'
              }`}
            >
              Continue
            </button>
          </motion.div>
        )}

        {/* ========================================== */}
        {/* STEP 2: TASK PARALYSIS CAUSE               */}
        {/* ========================================== */}
        {step === 2 && (
          <motion.div
            key="step-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col justify-between py-2"
          >
            <div>
              <MascotParalysis />

              <h2 className="text-2xl font-black text-zinc-900 tracking-tight text-center mb-1">
                What causes task paralysis?
              </h2>
              <p className="text-xs text-zinc-500 font-medium text-center mb-6">
                Weave tailors micro-breakdowns to counter your specific block
              </p>

              <div className="space-y-3">
                {[
                  { id: 'details', title: 'Overwhelmed by too many details' },
                  { id: 'ideas', title: 'Brain racing with 10 ideas at once' },
                  { id: 'large', title: 'Dread starting large 5+ hour tasks' },
                  { id: 'distract', title: 'Frequent distraction & tab hopping' },
                ].map((item) => {
                  const isSelected = paralysisCause === item.id;

                  return (
                    <motion.div
                      key={`paralysis-${item.id}`}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setParalysisCause(item.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-white border-[#FF7A59] shadow-md shadow-[#FF7A59]/10 ring-2 ring-[#FF7A59]/20'
                          : 'bg-white border-zinc-200/80 hover:border-zinc-300'
                      }`}
                    >
                      <span className="text-xs font-bold text-zinc-800">{item.title}</span>

                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isSelected ? 'border-[#FF7A59] bg-[#FF7A59] text-white' : 'border-zinc-300'
                        }`}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <button
              disabled={!paralysisCause}
              onClick={() => setStep(3)}
              className={`w-full py-4 mt-6 rounded-2xl font-extrabold text-sm text-white transition-all cursor-pointer ${
                paralysisCause
                  ? 'bg-[#FF7A59] shadow-lg shadow-[#FF7A59]/25 hover:bg-[#E86848]'
                  : 'bg-zinc-300 cursor-not-allowed'
              }`}
            >
              Continue
            </button>
          </motion.div>
        )}

        {/* ========================================== */}
        {/* STEP 3: ACTIVITY LEVEL & FOCUS PACE        */}
        {/* ========================================== */}
        {step === 3 && (
          <motion.div
            key="step-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col justify-between py-2"
          >
            <div>
              <MascotFocusPace />

              <h2 className="text-2xl font-black text-zinc-900 tracking-tight text-center mb-1">
                What's your focus pace?
              </h2>
              <p className="text-xs text-zinc-500 font-medium text-center mb-6">
                Be honest! This affects your daily focus goals
              </p>

              <div className="space-y-3">
                {[
                  { id: 'light', title: 'Light Bursts', desc: '1-2 micro-tasks/day, gentle pace' },
                  { id: 'moderate', title: 'Moderate Flow', desc: '3-5 micro-tasks/day, balanced momentum' },
                  { id: 'intense', title: 'Deep Focus', desc: '6-10 micro-tasks/day, high velocity' },
                  { id: 'dynamic', title: 'Dynamic Energy', desc: 'Adapts automatically to burnout level' },
                ].map((item) => {
                  const isSelected = activityPace === item.id;

                  return (
                    <motion.div
                      key={`pace-${item.id}`}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActivityPace(item.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-white border-[#FF7A59] shadow-md shadow-[#FF7A59]/10 ring-2 ring-[#FF7A59]/20'
                          : 'bg-white border-zinc-200/80 hover:border-zinc-300'
                      }`}
                    >
                      <div>
                        <h4 className="text-xs font-bold text-zinc-900 mb-0.5">{item.title}</h4>
                        <p className="text-[11px] text-zinc-500 font-medium">{item.desc}</p>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          isSelected ? 'border-[#FF7A59] bg-[#FF7A59] text-white' : 'border-zinc-300'
                        }`}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => setStep(4)}
              className="w-full py-4 mt-6 rounded-2xl font-extrabold text-sm text-white bg-[#FF7A59] shadow-lg shadow-[#FF7A59]/25 hover:bg-[#E86848] transition-all cursor-pointer"
            >
              Continue
            </button>
          </motion.div>
        )}

        {/* ========================================== */}
        {/* STEP 4: TASK UNCERTAINTY / GRANULARITY SLIDER */}
        {/* ========================================== */}
        {step === 4 && (
          <motion.div
            key="step-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col justify-between py-2"
          >
            <div>
              <MascotScales />

              <h2 className="text-xl font-black text-zinc-900 tracking-tight text-center mb-1">
                How should Weave handle task uncertainty?
              </h2>
              <p className="text-xs text-zinc-500 font-medium text-center mb-5">
                When raw brain dumps vary, choose how Weave estimates micro-steps based on your focus goals
              </p>

              {/* Dynamic Info Card matching Amy Uncertainty Card */}
              <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold text-zinc-900">
                    {currentGranularity.title}
                  </span>
                  <span className="text-[10px] font-bold text-[#FF7A59] bg-[#FFF0EB] px-2 py-0.5 rounded-full">
                    {currentGranularity.tag}
                  </span>
                </div>
                <p className="text-xs text-zinc-600 font-medium mb-3">
                  {currentGranularity.desc}
                </p>
                <div className="p-2.5 rounded-xl bg-[#FFFDF9] border border-amber-100 text-[11px] font-mono text-zinc-700">
                  {currentGranularity.example}
                </div>
              </div>

              {/* Custom Amy-style Slider with snap points */}
              <div className="px-2 mb-2">
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={granularityLevel}
                  onChange={(e) => setGranularityLevel(Number(e.target.value))}
                  className="w-full accent-[#FF7A59] h-2 bg-amber-100 rounded-lg cursor-pointer"
                />
                {/* Labels below slider */}
                <div className="flex justify-between text-[10px] font-bold text-zinc-400 mt-3">
                  <span className={granularityLevel === 1 ? 'text-[#FF7A59]' : ''}>Super Micro</span>
                  <span className={granularityLevel === 2 ? 'text-[#FF7A59]' : ''}>Bite-Sized</span>
                  <span className={granularityLevel === 3 ? 'text-[#FF7A59]' : ''}>Balanced</span>
                  <span className={granularityLevel === 4 ? 'text-[#FF7A59]' : ''}>Broad</span>
                  <span className={granularityLevel === 5 ? 'text-[#FF7A59]' : ''}>High-Level</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep(5)}
              className="w-full py-4 mt-6 rounded-2xl font-extrabold text-sm text-white bg-[#FF7A59] shadow-lg shadow-[#FF7A59]/25 hover:bg-[#E86848] transition-all cursor-pointer"
            >
              Continue
            </button>
          </motion.div>
        )}

        {/* ========================================== */}
        {/* STEP 5: SPECIAL CONSIDERATIONS (MULTI-SELECT) */}
        {/* ========================================== */}
        {step === 5 && (
          <motion.div
            key="step-5"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col justify-between py-2"
          >
            <div>
              <MascotHearts />

              <h2 className="text-2xl font-black text-zinc-900 tracking-tight text-center mb-1">
                Any special considerations?
              </h2>
              <p className="text-xs text-zinc-500 font-medium text-center mb-5">
                Select all that apply (optional)
              </p>

              {/* Multi-Select Pills */}
              <div className="flex flex-wrap gap-2.5 mb-5">
                {[
                  '⚡ High Focus',
                  '🎙️ Voice-First',
                  '🧘 Low Friction',
                  '🌙 Night Owl',
                  '🌅 Morning Person',
                  '🎯 ADHD Guardrails',
                  '💼 Work Sprint',
                ].map((pill) => {
                  const isSelected = selectedPills.includes(pill);
                  return (
                    <button
                      key={pill}
                      onClick={() => togglePill(pill)}
                      className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#FF7A59] text-white border-[#FF7A59] shadow-xs'
                          : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300'
                      }`}
                    >
                      <span>{pill}</span>
                      {isSelected && <Check size={12} strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>

              {/* Anything else input */}
              <div className="mb-4">
                <label className="text-xs font-bold text-zinc-700 block mb-1.5">
                  Anything else? (optional)
                </label>
                <input
                  type="text"
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="e.g. 'Launch next month', 'Recovering from burnout'"
                  className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#FF7A59]"
                />
              </div>

              {/* Info note matching Amy */}
              <div className="flex items-start gap-2 p-3 bg-[#FFF0EB] border border-[#FFD8CD] rounded-xl text-[11px] text-zinc-700 font-medium">
                <Info size={14} className="text-[#FF7A59] shrink-0 mt-0.5" />
                <span>
                  These help personalize your micro-step AI prompts. You can change them anytime in settings.
                </span>
              </div>
            </div>

            <button
              onClick={() => setStep(6)}
              className="w-full py-4 mt-6 rounded-2xl font-extrabold text-sm text-white bg-[#FF7A59] shadow-lg shadow-[#FF7A59]/25 hover:bg-[#E86848] transition-all cursor-pointer"
            >
              Continue
            </button>
          </motion.div>
        )}

        {/* ========================================== */}
        {/* STEP 6: TEST VOICE BRAIN DUMP (MAGIC MOMENT)*/}
        {/* ========================================== */}
        {step === 6 && (
          <motion.div
            key="step-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col justify-between py-2"
          >
            <div>
              <MascotCameraVoice />

              <h2 className="text-2xl font-black text-zinc-900 tracking-tight text-center mb-1">
                You don't have to type everything 💼
              </h2>
              <p className="text-xs text-zinc-500 font-medium text-center mb-5">
                Try Weave's magic voice dump right now to experience instant clarity.
              </p>

              {/* Interactive Mic Box */}
              <div className="bg-white p-5 rounded-3xl border border-zinc-200 shadow-sm text-center mb-4">
                {!isRecording && !isProcessingAI && generatedTasks.length === 0 && (
                  <div className="flex flex-col items-center">
                    <p className="text-xs text-zinc-600 font-medium mb-4">
                      Tap mic & speak a quick mental clutter phrase:
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleStartRecording}
                      className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#FF7A59] to-[#FF9B82] text-white flex items-center justify-center shadow-lg shadow-[#FF7A59]/30 cursor-pointer"
                    >
                      <Mic size={32} />
                    </motion.button>
                  </div>
                )}

                {isRecording && (
                  <div className="flex flex-col items-center py-2">
                    <div className="flex items-center gap-1 mb-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                      <span className="text-xs font-bold text-rose-500">
                        Listening... 0:0{recordingSeconds}
                      </span>
                    </div>

                    <button
                      onClick={handleStopRecording}
                      className="px-6 py-3 bg-zinc-900 text-white font-extrabold text-xs rounded-2xl shadow-md hover:bg-zinc-800 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Square size={14} fill="white" />
                      <span>Stop & Weave</span>
                    </button>
                  </div>
                )}

                {isProcessingAI && (
                  <div className="py-6 flex flex-col items-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      className="w-8 h-8 border-3 border-[#FF7A59] border-t-transparent rounded-full mb-3"
                    />
                    <p className="text-xs font-bold text-zinc-800">
                      Organizing your thoughts into micro-tasks...
                    </p>
                  </div>
                )}

                {generatedTasks.length > 0 && (
                  <div className="text-left space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                      <span className="text-xs font-black text-[#FF7A59] flex items-center gap-1">
                        <CheckCircle2 size={14} /> Micro-Tasks Generated!
                      </span>
                      <span className="text-[10px] font-bold text-zinc-400">3 tasks</span>
                    </div>

                    {generatedTasks.map((task, idx) => (
                      <div
                        key={`task-gen-${idx}`}
                        className="p-3 bg-[#FFFDF9] rounded-xl border border-amber-100/80"
                      >
                        <h4 className="text-xs font-bold text-zinc-900 mb-1">{task.title}</h4>
                        <div className="space-y-1">
                          {task.microSteps.map((step, sIdx) => (
                            <div
                              key={`step-gen-${idx}-${sIdx}`}
                              className="text-[11px] font-medium text-zinc-600 flex items-center gap-1.5"
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-[#FF7A59]" />
                              <span>{step.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setStep(7)}
              className="w-full py-4 mt-4 rounded-2xl font-extrabold text-sm text-white bg-[#FF7A59] shadow-lg shadow-[#FF7A59]/25 hover:bg-[#E86848] transition-all cursor-pointer"
            >
              Continue
            </button>
          </motion.div>
        )}

        {/* ========================================== */}
        {/* STEP 7: WIDGET PREVIEW (HOME VS LOCK SCREEN) */}
        {/* ========================================== */}
        {step === 7 && (
          <motion.div
            key="step-7"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col justify-between py-2"
          >
            <div>
              <MascotWidget />

              <h2 className="text-xl font-black text-zinc-900 tracking-tight text-center mb-1">
                Don't forget to add the Weave widget
              </h2>
              <p className="text-xs text-zinc-500 font-medium text-center mb-4">
                People who add this widget are 75% more likely to build the habit 👀
              </p>

              {/* Tab Switcher: [Home Screen] | [Lock Screen] */}
              <div className="flex bg-amber-100/60 p-1 rounded-2xl mb-4 max-w-xs mx-auto">
                <button
                  onClick={() => setWidgetTab('home')}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    widgetTab === 'home'
                      ? 'bg-white text-zinc-900 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  Home Screen
                </button>
                <button
                  onClick={() => setWidgetTab('lock')}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    widgetTab === 'lock'
                      ? 'bg-white text-zinc-900 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  Lock Screen
                </button>
              </div>

              {/* iOS Phone Frame Preview */}
              <div className="bg-white p-4 rounded-3xl border border-zinc-200 shadow-sm mb-4 max-w-xs mx-auto text-center">
                {widgetTab === 'home' ? (
                  <div className="p-3 bg-[#FFFDF9] rounded-2xl border border-amber-100 text-left">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-extrabold text-[#FF7A59] uppercase tracking-wider">
                        Weave Daily Flow
                      </span>
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                        🔥 5 Day Streak
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-zinc-200/80 mb-2 shadow-2xs flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-bold text-zinc-900">Finish Design Prototype</p>
                        <p className="text-[9px] text-zinc-400">3 micro-steps left</p>
                      </div>
                      <div className="w-6 h-6 rounded-full bg-[#FF7A59] text-white flex items-center justify-center font-bold text-[10px]">
                        →
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <div className="flex-1 bg-white p-2 rounded-xl text-center border border-zinc-200/80">
                        <p className="text-[9px] font-bold text-zinc-400">Completed</p>
                        <p className="text-xs font-black text-zinc-900">12 Tasks</p>
                      </div>
                      <div className="flex-1 bg-white p-2 rounded-xl text-center border border-zinc-200/80">
                        <p className="text-[9px] font-bold text-zinc-400">Voice Dumps</p>
                        <p className="text-xs font-black text-[#FF7A59]">Unlimited</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-zinc-900 text-white rounded-2xl border border-zinc-800 text-center">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">
                      9:41 AM • Thursday
                    </p>
                    <div className="inline-flex items-center gap-2 bg-zinc-800/90 border border-zinc-700/80 px-3 py-2 rounded-2xl text-xs font-bold text-white mb-2">
                      <Mic size={14} className="text-[#FF7A59]" />
                      <span>Tap to Voice Dump</span>
                    </div>
                    <p className="text-[9px] text-zinc-400">1-tap micro-step capture from Lock Screen</p>
                  </div>
                )}
              </div>

              {/* Steps Instructions */}
              <div className="space-y-2 text-left px-2">
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-700">
                  <span className="w-5 h-5 rounded-full bg-[#FF7A59] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                    1
                  </span>
                  <span>Tap & Hold anywhere on your Home Screen</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-700">
                  <span className="w-5 h-5 rounded-full bg-[#FF7A59] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                    2
                  </span>
                  <span>Tap "+" button on top left</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-700">
                  <span className="w-5 h-5 rounded-full bg-[#FF7A59] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                    3
                  </span>
                  <span>Scroll down & tap Weave. Then add a Widget.</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep(8)}
              className="w-full py-4 mt-4 rounded-2xl font-extrabold text-sm text-white bg-[#FF7A59] shadow-lg shadow-[#FF7A59]/25 hover:bg-[#E86848] transition-all cursor-pointer"
            >
              Continue
            </button>
          </motion.div>
        )}

        {/* ========================================== */}
        {/* STEP 8: SAVE PROGRESS / UNLOCK TRIAL       */}
        {/* ========================================== */}
        {step === 8 && (
          <motion.div
            key="step-8"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex-1 flex flex-col justify-between py-2"
          >
            <div>
              <MascotParty />

              <h2 className="text-2xl font-black text-zinc-900 tracking-tight text-center mb-1">
                Save Your Progress
              </h2>
              <p className="text-xs text-zinc-500 font-medium text-center mb-6 max-w-xs mx-auto">
                Create an account to sync your data across devices and never lose your progress.
              </p>

              {/* Social Login Buttons matching Amy */}
              <div className="space-y-3 mb-6">
                <button
                  onClick={handleCompletePaywallAndStart}
                  className="w-full py-3.5 bg-zinc-900 text-white font-bold text-xs rounded-2xl shadow-sm hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="text-base"></span>
                  <span>Continue with Apple</span>
                </button>

                <button
                  onClick={handleCompletePaywallAndStart}
                  className="w-full py-3.5 bg-white border border-zinc-200 text-zinc-800 font-bold text-xs rounded-2xl shadow-2xs hover:bg-zinc-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="text-base font-black text-blue-500">G</span>
                  <span>Continue with Google</span>
                </button>

                <div className="text-center my-2">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                    or
                  </span>
                </div>

                <button
                  onClick={handleCompletePaywallAndStart}
                  className="w-full py-3.5 bg-[#FFF0EB] text-[#FF7A59] font-extrabold text-xs rounded-2xl hover:bg-[#FFE0D6] transition-all cursor-pointer"
                >
                  Use email instead
                </button>
              </div>

              {/* Free Trial Tag */}
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl text-center">
                <p className="text-xs font-black text-amber-800 flex items-center justify-center gap-1 mb-0.5">
                  <Crown size={14} className="text-amber-600" /> 7-Day Free Trial Included
                </p>
                <p className="text-[10px] text-amber-700 font-medium">
                  Unlimited voice brain dumps, AI micro-steps, & widget sync.
                </p>
              </div>
            </div>

            <button
              onClick={handleCompletePaywallAndStart}
              className="w-full py-4 mt-6 rounded-2xl font-black text-sm text-white bg-[#FF7A59] shadow-xl shadow-[#FF7A59]/30 hover:bg-[#E86848] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles size={18} />
              <span>Start My Free Flow</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
