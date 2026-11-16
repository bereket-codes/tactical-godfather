import { getPositionFit } from './positionFit';

// Fit quality dominates player quality, so 11 specialists always beat 11 superstars out of position.
const FIT_RANK = { perfect: 0, good: 1, terrible: 2 };

export function buildBestXI(slots, players) {
  const pairs = [];
  slots.forEach((slot) => {
    players.forEach((player) => {
      const fit = getPositionFit(player, slot.position);
      pairs.push({ slotId: slot.id, player, score: FIT_RANK[fit] * 100 - player.rating });
    });
  });
  pairs.sort((a, b) => a.score - b.score);

  const squad = {};
  const used = new Set();
  pairs.forEach(({ slotId, player }) => {
    if (squad[slotId] || used.has(player.id)) return;
    squad[slotId] = player;
    used.add(player.id);
  });
  return squad;
}

export function describeSquad(slots, squad) {
  const chosen = slots
    .map((slot) => ({ slot, player: squad[slot.id] }))
    .filter((entry) => entry.player);
  const fits = chosen.map(({ slot, player }) => getPositionFit(player, slot.position));
  const total = chosen.reduce((sum, { player }) => sum + player.rating, 0);

  return {
    count: chosen.length,
    size: slots.length,
    avg: chosen.length ? Math.round(total / chosen.length) : 0,
    perfect: fits.filter((f) => f === 'perfect').length,
    good: fits.filter((f) => f === 'good').length,
    out: fits.filter((f) => f === 'terrible').length,
  };
}
