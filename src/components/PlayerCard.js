import React from 'react';
import { useDraggable } from '@dnd-kit/core';

// Presentational only. The DragOverlay uses this too, so it never registers a second draggable with the same id.
export function CardFace({ player, className = '' }) {
  const tier = player.rating >= 90 ? 'tier-top' : player.rating >= 85 ? 'tier-elite' : 'tier-std';
  return (
    <div className={`player-card ${tier} ${className}`}>
      <div className="card-rating">
        <b>{player.rating}</b>
        <span>{player.position}</span>
      </div>
      <div className="card-body">
        <div className="player-name">{player.name}</div>
        <div className="card-club">{player.club}</div>
      </div>
    </div>
  );
}

export default function PlayerCard({ player }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: player.id,
    data: { player, fromSlot: null },
  });

  // No transform here: the DragOverlay moves the visible copy, this one just dims in place.
  return (
    <div ref={setNodeRef} className="drag-wrap" {...listeners} {...attributes}>
      <CardFace player={player} className={isDragging ? 'is-dragging' : ''} />
    </div>
  );
}
