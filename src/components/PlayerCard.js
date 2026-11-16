import React from 'react';
import { useDraggable } from '@dnd-kit/core';

const STAT_LABELS = { pace: 'PAC', shooting: 'SHO', passing: 'PAS', dribbling: 'DRI', defending: 'DEF', physical: 'PHY' };

function topStats(player) {
  return Object.entries(player.attributes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key, value]) => ({ key, label: STAT_LABELS[key], value }));
}

// Presentational only. The DragOverlay uses this too, so it never registers a second draggable with the same id.
export function CardFace({ player, className = '' }) {
  const tier = player.rating >= 90 ? 'tier-top' : player.rating >= 87 ? 'tier-elite' : 'tier-std';
  return (
    <div className={`player-card ${tier} ${className}`}>
      <div className="card-rating">
        <b>{player.rating}</b>
        <span>{player.position}</span>
      </div>
      <div className="card-body">
        <div className="player-name">{player.name}</div>
        <div className="card-club">{player.club}</div>
        <div className="card-stats">
          {topStats(player).map((stat) => (
            <span key={stat.key} className="stat-chip">
              <em>{stat.label}</em>
              <b>{stat.value}</b>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PlayerCard({ player, picked = false, onPick }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: player.id,
    data: { player, fromSlot: null },
  });

  // No transform here: the DragOverlay moves the visible copy, this one just dims in place.
  return (
    <div
      ref={setNodeRef}
      className="drag-wrap"
      {...listeners}
      {...attributes}
      onClick={() => onPick && onPick(player)}
    >
      <CardFace
        player={player}
        className={`${isDragging ? 'is-dragging' : ''} ${picked ? 'is-picked' : ''}`}
      />
    </div>
  );
}
