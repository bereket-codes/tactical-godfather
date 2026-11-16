// Defines which positions are acceptable for a given slot
const positionRules = {
  GK: ["GK"],
  CB: ["CB", "CDM"], // CDMs can drop to CB
  LB: ["LB", "LM", "LWB"],
  RB: ["RB", "RM", "RWB"],
  CDM: ["CDM", "CM", "CB"],
  CM: ["CM", "CDM", "CAM"],
  CAM: ["CAM", "CM", "CF", "ST"],
  LM: ["LM", "LW", "CM"],
  RM: ["RM", "RW", "CM"],
  LW: ["LW", "LM", "ST"],
  RW: ["RW", "RM", "ST"],
  ST: ["ST", "CF", "LW", "RW", "CAM"],
};

export function getPositionFit(player, slotPosition) {
  if (!player) return "none";

  // 1. Perfect Fit (Green)
  if (player.position === slotPosition) {
    return "perfect";
  }

  // 2. Good Fit (Yellow) - Based on our rules
  const validSecondaryPositions = positionRules[slotPosition] || [];
  if (validSecondaryPositions.includes(player.position)) {
    return "good";
  }

  // 3. Terrible Fit (Red)
  return "terrible";
}