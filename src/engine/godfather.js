import { getPositionFit } from './positionFit';

const rules = [
  {
    id: "missing_goalkeeper",
    condition: (squad) => !squad['GK'],
    severity: "critical",
    explanation: "You haven't picked a Goalkeeper. This isn't a training ground, it's a match. Any team will put five past you.",
    fixes: ["Put a goalkeeper on the pitch immediately."]
  },
  {
    id: "high_line_slow_defense",
    condition: (squad, tactics) => {
      if (tactics.line < 70) return false; 
      const cb1 = squad['CB1'];
      const cb2 = squad['CB2'];
      if (!cb1 || !cb2) return false;
      return cb1.attributes.pace < 78 || cb2.attributes.pace < 78;
    },
    severity: "critical",
    explanation: "You are playing a high defensive line, but your center-backs lack the pace to recover. A fast striker will sit on your shoulder and destroy you on the counter-attack.",
    fixes: ["Drop your defensive line to Standard or Deep.", "Sub on faster center-backs."]
  },
  {
    id: "low_line_high_press",
    condition: (squad, tactics) => {
      return tactics.press > 70 && tactics.line < 30;
    },
    severity: "critical",
    explanation: "This is a tactical contradiction. You are asking your team to press intensely, but also sit in a deep low block. This stretches your team vertically and leaves massive space in the middle of the pitch.",
    fixes: ["If you want to press, push the defensive line up.", "If you want to defend deep, drop the pressing intensity."]
  },
  {
    id: "exposed_flank",
    condition: (squad, tactics, instructions) => {
      // Check if fullbacks are overlapping
      const lbOverlapping = instructions['LB'] === 'overlap';
      const rbOverlapping = instructions['RB'] === 'overlap';
      
      // Check if CDMs are staying back to cover
      const cdmCovering = instructions['CDM'] === 'stay_back' || squad['CDM']?.position === 'CDM';

      return lbOverlapping && rbOverlapping && !cdmCovering;
    },
    severity: "critical",
    explanation: "Both of your fullbacks are instructed to overlap, but you have no defensive midfielder dropping in to cover. On the counter-attack, your center-backs will be completely isolated on the flanks.",
    fixes: ["Set one fullback to 'Stay Back'.", "Instruct your CDM to 'Drop Deep' and cover."]
  },
  {
    id: "no_runners",
    condition: (squad, tactics, instructions) => {
      if (tactics.tempo < 60) return false;
      // If fast tempo, but no forwards are making runs
      const hasRunners = Object.values(instructions).includes('run_in_behind');
      return !hasRunners;
    },
    severity: "warning",
    explanation: "You are playing a fast tempo, but nobody is instructed to run in behind. Your midfielders will look up, see no options, and just pass sideways.",
    fixes: ["Instruct your Striker or Wingers to 'Run In Behind'."]
  },
  {
    id: "fast_tempo_no_creator",
    condition: (squad, tactics) => {
      if (tactics.tempo < 70) return false;
      const mids = [squad['CM1'], squad['CM2'], squad['CDM'], squad['CAM']].filter(Boolean);
      if (mids.length === 0) return false;
      const avgPassing = mids.reduce((sum, p) => sum + p.attributes.passing, 0) / mids.length;
      return avgPassing < 80;
    },
    severity: "warning",
    explanation: "You are demanding a high tempo, but your midfield lacks the passing vision to execute it. You will just give the ball away quickly instead of progressing it.",
    fixes: ["Lower the tempo to allow your midfielders time on the ball.", "Bring on a playmaker with 85+ passing."]
  },
  {
    id: "high_press_low_physical",
    condition: (squad, tactics) => {
      if (tactics.press < 70) return false;
      const mids = [squad['CM1'], squad['CM2'], squad['CDM'], squad['CAM']].filter(Boolean);
      if (mids.length === 0) return false;
      const avgPhysical = mids.reduce((sum, p) => sum + p.attributes.physical, 0) / mids.length;
      return avgPhysical < 75;
    },
    severity: "warning",
    explanation: "Your instructions demand relentless pressing, but your midfield physically can't sustain it. They will be exhausted by the 60th minute, leaving huge gaps.",
    fixes: ["Lower the pressing intensity.", "Sub in midfielders with higher physical stats."]
  },
  {
    id: "out_of_position_experiment",
    condition: (squad) => {
      return Object.keys(squad).some(slotId => {
        const player = squad[slotId];
        const slot = slotId.replace(/\d/g, ''); 
        return getPositionFit(player, slot) === "terrible";
      });
    },
    severity: "warning",
    explanation: "You are experimenting with players drastically out of position. While it might offer a surprise element, it destroys your team's structural integrity. They won't know where to move when you lose the ball.",
    fixes: ["Move the player back to their natural position.", "If experimenting, ensure they at least have the physicals for the role."]
  }
];

export function generateSirAlexReport(squad, tactics, formation, instructions = {}) {
  const playersOnPitch = Object.keys(squad).length;

  if (playersOnPitch < 11) {
    return {
      verdict: "Incomplete",
      summary: "You can't analyze half a team. Get eleven men on that pitch, then we'll talk tactics.",
      problems: []
    };
  }

  // Pass instructions to the rule conditions
  const triggeredRules = rules.filter(rule => rule.condition(squad, tactics, instructions));
  const criticals = triggeredRules.filter(r => r.severity === "critical");
  const warnings = triggeredRules.filter(r => r.severity === "warning");

  let verdict = "Elite";
  if (criticals.length > 0) verdict = "Flawed";
  else if (warnings.length > 0) verdict = "Risky";

  let summary = "This is a balanced, intelligent setup. The structure is sound, the tactics are coherent, and the players fit the system.";
  if (verdict === "Flawed") {
    summary = "This is tactical suicide. If we played a match right now, you would be torn apart. You have fatal contradictions in your setup.";
  } else if (verdict === "Risky") {
    summary = "It's a decent foundation, but there are exploitable holes here. A smart opponent will target these weaknesses.";
  }

  return { verdict, summary, problems: triggeredRules };
}