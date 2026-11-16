import React from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { getPositionFit } from '../engine/positionFit';

const ARROWS = {
  overlap: 'M 0,-15 Q 20,-40 10,-70',
  invert: 'M 0,0 Q 30,10 40,0',
  run_in_behind: 'M 0,-15 L 0,-60',
  drop_deep: 'M 0,15 Q 0,40 15,50',
};

export function PlayerToken({ player, fit }) {
  return (
    <div className={`token ${fit ? `fit-${fit}` : ''}`}>
      <span className="token-rating">{player.rating}</span>
      <span className="token-name">{player.name.split(' ').pop()}</span>
    </div>
  );
}

function PitchSlot({ slot, player, instruction, activePlayer }) {
  const { isOver, setNodeRef: dropRef } = useDroppable({ id: slot.id, data: { position: slot.position } });
  const { attributes, listeners, setNodeRef: dragRef, isDragging } = useDraggable({
    id: `slot:${slot.id}`,
    data: { player, fromSlot: slot.id },
    disabled: !player,
  });

  const fit = getPositionFit(player, slot.position);
  // While dragging over this slot, preview how well the dragged player fits here
  const preview = isOver && activePlayer ? getPositionFit(activePlayer, slot.position) : null;
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
              strokeDasharray={instruction === 'run_in_behind' ? '5,5' : undefined}
              markerEnd={`url(#${markerId})`}
            />
          </svg>
        </div>
      )}

      <div ref={dropRef} className={`slot-inner ${player ? 'filled' : ''} ${preview ? `preview-${preview}` : ''}`}>
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
      </div>
    </div>
  );
}

export default function Pitch({ formation, squad, instructions, activePlayer }) {
  if (!formation) return null;

  return (
    <div className="pitch-container">
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
        />
      ))}
    </div>
  );
}
