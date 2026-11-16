import React, { useEffect, useState } from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { getPositionFit } from '../engine/positionFit';

const ARROWS = {
  overlap: 'M 0,-15 Q 20,-40 10,-70',
  invert: 'M 0,0 Q 30,10 40,0',
  run_in_behind: 'M 0,-15 L 0,-60',
  drop_deep: 'M 0,15 Q 0,40 15,50',
  hug_line: 'M 0,-6 Q 26,-10 40,-16',
  cut_inside: 'M 0,-6 Q 22,-22 8,-44',
  press_high: 'M 0,0 L 0,-34',
  step_up: 'M 0,0 L 0,-26',
  stay_back: 'M 0,0 L 0,24',
  target_man: 'M 0,12 L 0,-12',
  sweeper_keeper: 'M -16,0 L 16,0',
};

const DASHED = ['run_in_behind', 'cut_inside', 'invert'];

export function PlayerToken({ player, fit }) {
  return (
    <div
      className={`token ${fit ? `fit-${fit}` : ''}`}
      title={`${player.name} · ${player.position} · ${player.rating}`}
    >
      <span className="token-rating">{player.rating}</span>
      <span className="token-name">{player.name.split(' ').pop()}</span>
    </div>
  );
}

function PitchSlot({ slot, player, instruction, activePlayer, activeFromSlot, pickedPlayer, onSlotClick }) {
  const { isOver, setNodeRef: dropRef } = useDroppable({ id: slot.id, data: { position: slot.position } });
  const { attributes, listeners, setNodeRef: dragRef, isDragging } = useDraggable({
    id: `slot:${slot.id}`,
    data: { player, fromSlot: slot.id },
    disabled: !player,
  });

  const fit = getPositionFit(player, slot.position);
  // While dragging over this slot, preview how well the dragged player fits here
  const preview = isOver && activePlayer ? getPositionFit(activePlayer, slot.position) : null;
  // While a bench player is picked, show where he fits before you click
  const hint = pickedPlayer && !player ? getPositionFit(pickedPlayer, slot.position) : null;
  const path = player && ARROWS[instruction];
  const markerId = `arrowhead-${slot.id}`;
  const mirror = parseFloat(slot.left) > 50; // flip curves on the right flank

  return (
    <div className="pitch-slot" style={{ top: slot.top, left: slot.left }}>
      {path && (
        <div className="arrow-container">
          <svg className="tactical-arrow" viewBox="-50 -100 100 150" style={mirror ? { transform: 'scaleX(-1)' } : undefined}>
            <defs>
              <marker id={markerId} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="var(--brass)" />
              </marker>
            </defs>
            <path
              d={path}
              fill="none"
              stroke="var(--brass)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={DASHED.includes(instruction) ? '5,5' : undefined}
              markerEnd={`url(#${markerId})`}
            />
          </svg>
        </div>
      )}

      <div
        ref={dropRef}
        onClick={() => onSlotClick && onSlotClick(slot.id)}
        className={`slot-inner ${player ? 'filled' : ''} ${preview ? `preview-${preview}` : ''} ${
          hint ? `pick-${hint}` : ''
        }`}
      >
        {player ? (
          <motion.div
            key={player.id}
            ref={dragRef}
            {...listeners}
            {...attributes}
            className={`token-wrap ${isDragging ? 'ghost' : ''}`}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 520, damping: 24 }}
          >
            <PlayerToken player={player} fit={fit} />
          </motion.div>
        ) : (
          <span className="slot-pos">{slot.position}</span>
        )}
        {player && instruction && instruction !== 'default' && (
          <span className="role-pip" title="Role instruction set" />
        )}
        {activeFromSlot === slot.id && <span className="slot-source-ring" aria-hidden="true" />}
      </div>
    </div>
  );
}

const STEPS = 18;

function ThreatOverlay({ threat, onClose }) {
  const [run, setRun] = useState(0);
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    setBeat(0);
    let index = 0;
    const timer = setInterval(() => {
      index += 1;
      if (index >= threat.beats.length) {
        clearInterval(timer);
        return;
      }
      setBeat(index);
    }, 2000);
    return () => clearInterval(timer);
  }, [run, threat.nonce, threat.beats.length]);

  // The pitch SVG viewBox is 75 x 100, so slot percentages map straight across.
  const from = { x: threat.from.left * 0.75, y: threat.from.top };
  const to = { x: threat.to.left * 0.75, y: threat.to.top };
  const sideways = Math.abs(from.x - to.x) < 6;
  const bend = sideways ? 10 : to.x >= 37.5 ? -14 : 14;
  const cx = (from.x + to.x) / 2 + bend;
  const cy = (from.y + to.y) / 2;
  const pathD = `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;

  const offsets = [];
  for (let i = 0; i <= STEPS; i += 1) {
    const t = i / STEPS;
    offsets.push({
      x: (1 - t) ** 2 * from.x + 2 * (1 - t) * t * cx + t * t * to.x - from.x,
      y: (1 - t) ** 2 * from.y + 2 * (1 - t) * t * cy + t * t * to.y - from.y,
    });
  }

  return (
    <div className="threat-overlay">
      <svg className="threat-svg" viewBox="0 0 75 100" aria-hidden="true">
        <g key={run}>
          <motion.path
            d={pathD}
            fill="none"
            stroke="rgba(229, 84, 92, 0.9)"
            strokeWidth="0.7"
            strokeDasharray="2.2 1.5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2.1, ease: 'easeInOut' }}
          />
          <circle cx={from.x} cy={from.y} r="1.3" fill="rgba(244, 241, 232, 0.5)" />
          <motion.circle
            cx={from.x}
            cy={from.y}
            r="1.9"
            fill="var(--chalk)"
            stroke="var(--bad)"
            strokeWidth="0.45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, x: offsets.map((p) => p.x), y: offsets.map((p) => p.y) }}
            transition={{
              opacity: { duration: 0.2 },
              x: { duration: 2.1, ease: 'easeInOut' },
              y: { duration: 2.1, ease: 'easeInOut' },
            }}
          />
          <motion.circle
            cx={to.x}
            cy={to.y}
            fill="none"
            stroke="var(--bad)"
            strokeWidth="0.6"
            initial={{ r: 1.5, opacity: 0 }}
            animate={{ r: [1.5, 8], opacity: [0.85, 0] }}
            transition={{ duration: 1.4, delay: 2, repeat: Infinity, repeatDelay: 0.4 }}
          />
          <motion.circle
            cx={to.x}
            cy={to.y}
            r="1"
            fill="var(--bad)"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.4] }}
            transition={{ duration: 1.4, delay: 2 }}
          />
        </g>
      </svg>

      <div className="threat-caption">
        <div className="threat-head">
          <span className="threat-label">How you lose it</span>
          <strong>{threat.title}</strong>
          <button type="button" className="threat-replay" onClick={() => setRun((r) => r + 1)} aria-label="Replay">
            ↻
          </button>
          <button type="button" className="threat-close" onClick={onClose} aria-label="Close breakdown">
            ✕
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.p
            key={`${threat.nonce}-${beat}-${run}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
          >
            <b>{beat + 1}/{threat.beats.length}</b> {threat.beats[beat]}
          </motion.p>
        </AnimatePresence>

        <div className="threat-progress" aria-hidden="true">
          {threat.beats.map((_, i) => (
            <span key={i} className={i <= beat ? 'is-on' : ''} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Pitch({
  formation,
  squad,
  instructions,
  activePlayer,
  activeFromSlot,
  pickedPlayer,
  onSlotClick,
  threat,
  onCloseThreat,
}) {
  if (!formation) return null;

  return (
    <div className={`pitch-container ${threat ? 'threat-active' : ''}`}>
      <svg className="pitch-lines" viewBox="0 0 75 100" aria-hidden="true">
        <g fill="none" stroke="currentColor" strokeWidth="0.35">
          <rect x="3" y="3" width="69" height="94" />
          <line x1="3" y1="50" x2="72" y2="50" />
          <circle cx="37.5" cy="50" r="9" />
          <rect x="17" y="3" width="41" height="15" />
          <rect x="17" y="82" width="41" height="15" />
          <rect x="28" y="3" width="19" height="5" />
          <rect x="28" y="92" width="19" height="5" />
          <path d="M 30.6 18 A 8.5 8.5 0 0 0 44.4 18 M 30.6 82 A 8.5 8.5 0 0 1 44.4 82" />
        </g>
        <g fill="currentColor">
          <circle cx="37.5" cy="50" r="0.6" />
          <circle cx="37.5" cy="13" r="0.5" />
          <circle cx="37.5" cy="87" r="0.5" />
        </g>
      </svg>

      {formation.slots.map((slot) => (
        <PitchSlot
          key={slot.id}
          slot={slot}
          player={squad[slot.id]}
          instruction={instructions ? instructions[slot.id] : null}
          activePlayer={activePlayer}
          activeFromSlot={activeFromSlot}
          pickedPlayer={pickedPlayer}
          onSlotClick={onSlotClick}
        />
      ))}

      <AnimatePresence>
        {threat && (
          <motion.div
            key={threat.nonce}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <ThreatOverlay threat={threat} onClose={onCloseThreat} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
