import { getPositionFit } from './positionFit';
import { formations } from '../data/formations';

const WIDE = ['LW', 'RW', 'LM', 'RM', 'LWB', 'RWB'];
const CENTRAL_MID = ['CDM', 'CM', 'CAM'];
const CENTRE_BACK = ['CB'];
const FULLBACK = ['LB', 'RB', 'LWB', 'RWB'];
const ATTACKER = ['ST', 'CF', 'LW', 'RW'];

const entries = (squad) => Object.keys(squad).map((slotId) => ({ slotId, player: squad[slotId] }));
const withPosition = (squad, list) => entries(squad).filter(({ player }) => list.includes(player.position));
const average = (list, key) =>
  list.length ? list.reduce((sum, { player }) => sum + player.attributes[key], 0) / list.length : 0;

const text = (value, ...args) => (typeof value === 'function' ? value(...args) : value);

function misfits(squad, formation) {
  const slotPositions = Object.fromEntries(
    formations[formation].slots.map((slot) => [slot.id, slot.position])
  );
  return entries(squad)
    .map((entry) => ({
      ...entry,
      slotPosition: slotPositions[entry.slotId] || entry.slotId.replace(/\d/g, '')
    }))
    .filter((entry) => getPositionFit(entry.player, entry.slotPosition) === 'terrible');
}

const rules = [
  {
    id: 'missing_goalkeeper',
    severity: 'critical',
    title: 'Nobody in goal',
    condition: (squad) => !withPosition(squad, ['GK']).length,
    explanation:
      "There is no goalkeeper in that net. Whatever else we fix today, the first shot on target is a goal and the second one is a humiliation.",
    beats: [
      'They win the ball thirty yards from your goal.',
      'One square pass into the box and a shot goes in.',
      'There is nobody there. The net is empty.'
    ],
    fixes: [
      'Put a goalkeeper on the pitch before anything else.',
      'Alisson or ter Stegen are sitting on that bench waiting for you.'
    ],
    threat: { from: { top: 38, left: 52 }, to: { top: 93, left: 50 } }
  },
  {
    id: 'high_line_slow_defense',
    severity: 'critical',
    title: "A high line with defenders who can't run",
    condition: (squad, tactics) => {
      if (tactics.line < 70) return false;
      return withPosition(squad, CENTRE_BACK).some(({ player }) => player.attributes.pace < 78);
    },
    explanation:
      "You want to squeeze the game up the pitch, but your centre-backs turn like a ferry. Every ball over the top is a footrace they lose before it starts.",
    beats: [
      'They win the ball in midfield and their first pass is forward.',
      'One diagonal over your line and their striker is through on goal.',
      'Your centre-back is five yards behind the play, chasing a lost cause.'
    ],
    fixes: [
      'Drop the defensive line to Standard or Deep.',
      'Bring on a centre-back with 80+ pace.',
      'If you must stay high, keep a midfielder sitting in front of them.'
    ],
    threat: { from: { top: 42, left: 58 }, to: { top: 86, left: 50 } }
  },
  {
    id: 'low_line_high_press',
    severity: 'critical',
    title: 'Pressing from a low block',
    condition: (squad, tactics) => tactics.press > 70 && tactics.line < 30,
    explanation:
      "You've told them to press like demons and to sit on the edge of their own box at the same time. There are thirty yards of empty grass between your lines, and that is exactly where matches are lost.",
    beats: [
      'Your striker presses on his own and is bypassed with one pass.',
      'Their midfielder receives between your lines, facing your defence.',
      'Two passes later your back four is running towards its own goal.'
    ],
    fixes: [
      'Push the defensive line up until it matches the pressing.',
      'Or drop the pressing intensity and defend the box as a unit.'
    ],
    threat: { from: { top: 34, left: 50 }, to: { top: 80, left: 46 } }
  },
  {
    id: 'exposed_flank',
    severity: 'critical',
    title: 'Both fullbacks gone, nobody covering',
    condition: (squad, tactics, instructions) => {
      const overlapping = withPosition(squad, FULLBACK).filter(
        ({ slotId }) => instructions[slotId] === 'overlap'
      );
      if (overlapping.length < 2) return false;
      return !entries(squad).some(
        ({ slotId, player }) =>
          [...CENTRAL_MID, ...CENTRE_BACK].includes(player.position) &&
          instructions[slotId] === 'stay_back'
      );
    },
    explanation:
      "Both of your fullbacks are bombing forward and not one midfielder is holding. The first time they win the ball, your two centre-backs are defending the entire width of the pitch on their own.",
    beats: [
      "Both fullbacks are ahead of the ball when it's lost.",
      'One pass out to their winger and the flank is empty grass.',
      'Two against two at the back post, and nobody picks up the runner.'
    ],
    fixes: [
      'Set one fullback to Stay back.',
      'Tell a holding midfielder to Hold position and screen the gap.',
      'Or make your wide midfielder track back on the strong side.'
    ],
    threat: { from: { top: 45, left: 68 }, to: { top: 88, left: 82 } }
  },
  {
    id: 'isolated_striker',
    severity: 'critical',
    title: 'A striker on an island',
    condition: (squad, tactics) => {
      const strikers = withPosition(squad, ['ST', 'CF']);
      const tens = withPosition(squad, ['CAM']);
      return strikers.length === 1 && tens.length === 0 && tactics.tempo < 50;
    },
    explanation:
      'One centre-forward, no number ten anywhere near him, and a slow build-up. He will spend the afternoon wrestling two centre-backs for balls he has no chance of winning, and the ball will come straight back at you every time.',
    beats: [
      'The ball goes long towards your striker, alone against two defenders.',
      'It comes straight back over your midfield.',
      'They are attacking your back four before your team has turned around.'
    ],
    fixes: [
      'Push a midfielder up into the number ten space.',
      'Raise the tempo so support arrives with him.',
      'Or add a second striker to share the fight.'
    ],
    threat: { from: { top: 22, left: 50 }, to: { top: 85, left: 56 } }
  },
  {
    id: 'no_runners',
    severity: 'warning',
    title: 'Fast tempo, nobody running',
    condition: (squad, tactics, instructions) => {
      if (tactics.tempo < 60) return false;
      if (!withPosition(squad, ATTACKER).length) return false;
      return !Object.values(instructions).includes('run_in_behind');
    },
    explanation:
      'You want the ball moving quickly, but nobody is attacking the space behind them. Your midfielders look up, see a wall of shirts and pass sideways. Fast football with no runners is just rushed passing.',
    beats: [
      'Your midfielder lifts his head at the halfway line.',
      'Every forward is showing for the ball; nobody is going in behind.',
      'The pass goes square, they step up ten yards and squeeze you back.'
    ],
    fixes: [
      'Instruct your striker to Run in behind.',
      'Or send a winger in behind and keep the striker as the target.',
      'If you want to keep the ball, slow the tempo instead.'
    ],
    threat: { from: { top: 30, left: 50 }, to: { top: 78, left: 44 } }
  },
  {
    id: 'fast_tempo_no_creator',
    severity: 'warning',
    title: 'High tempo, no passer',
    condition: (squad, tactics) => {
      if (tactics.tempo < 70) return false;
      const mids = withPosition(squad, CENTRAL_MID);
      if (!mids.length) return false;
      return average(mids, 'passing') < 80;
    },
    explanation:
      "You're demanding quick, front-foot football from a midfield that can't pass under pressure. Tempo without technique is just giving the ball away faster.",
    beats: [
      'Your midfielder takes a touch too many under pressure.',
      'The hurried pass goes behind the runner and out of play.',
      'They counter into the space your midfield has just vacated.'
    ],
    fixes: [
      'Drop the tempo to Balanced.',
      'Bring on a playmaker with 85+ passing.',
      'Or build out through the fullbacks instead of the middle.'
    ],
    threat: { from: { top: 42, left: 44 }, to: { top: 82, left: 54 } }
  },
  {
    id: 'high_press_low_physical',
    severity: 'warning',
    title: "Pressing legs that won't last",
    condition: (squad, tactics) => {
      if (tactics.press < 70) return false;
      const mids = withPosition(squad, CENTRAL_MID);
      if (!mids.length) return false;
      return average(mids, 'physical') < 75;
    },
    explanation:
      'You want them to press for ninety minutes with a midfield that will be blowing by the hour mark. The press looks brilliant for fifty minutes, then it becomes a red carpet.',
    beats: [
      'First half they win the ball high twice and it looks superb.',
      'By the sixtieth minute every press is a yard late.',
      'One pass through the middle and your midfield is jogging back.'
    ],
    fixes: [
      'Lower the pressing intensity.',
      'Sub in midfielders with 80+ physical.',
      'Or press in a mid-block and save their legs for the last twenty.'
    ],
    threat: { from: { top: 38, left: 32 }, to: { top: 84, left: 48 } }
  },
  {
    id: 'out_of_position_experiment',
    severity: 'warning',
    title: 'Experiments out of position',
    condition: (squad, tactics, instructions, formation) => misfits(squad, formation).length > 0,
    explanation: (squad, tactics, instructions, formation) => {
      const names = misfits(squad, formation).map(
        ({ player, slotPosition }) => `${player.name.split(' ').pop()} at ${slotPosition}`
      );
      return `You've got players in roles they have never played: ${names.join(', ')}. It looks clever on a whiteboard; on a pitch it means a man who doesn't know where to stand when you lose the ball.`;
    },
    beats: [
      'The ball turns over and he is standing in the wrong zone.',
      'His marker runs off him while he works out who to pick up.',
      'The whole back line shifts across and the far post is wide open.'
    ],
    fixes: [
      'Move him back to his natural position.',
      'If you need him there, pair him with someone who covers his side.',
      'Keep the experiment to one player, never two on the same flank.'
    ],
    threat: { from: { top: 48, left: 58 }, to: { top: 86, left: 60 } }
  },
  {
    id: 'no_width',
    severity: 'warning',
    title: 'No width at all',
    condition: (squad) => withPosition(squad, WIDE).length === 0,
    explanation:
      "There isn't a single wide player on that pitch. Their back four can stand within the width of the penalty box and dare you to play through nine men. You won't.",
    beats: [
      'Your midfield looks up and sees a compact block with no outlet wide.',
      'The pass goes backwards, then sideways, then backwards again.',
      'Their line steps ten yards higher and you are building from your own six-yard box.'
    ],
    fixes: [
      'Put a winger or wide midfielder on one flank.',
      'Give a fullback the Overlap instruction to provide the width.',
      'Or stretch them with long switches to the opposite winger.'
    ],
    threat: { from: { top: 36, left: 50 }, to: { top: 80, left: 48 } }
  },
  {
    id: 'midfield_overrun',
    severity: 'warning',
    title: 'Two against three in midfield',
    condition: (squad, tactics) =>
      withPosition(squad, CENTRAL_MID).length < 3 && tactics.press < 40,
    explanation:
      "Two bodies in central midfield and a passive press means any side playing three there has a spare man all afternoon. They'll pass around you, not through you, and you'll spend the match chasing shadows.",
    beats: [
      'Their deepest midfielder drops and collects the ball, unopposed.',
      'The spare man receives between your two, already half-turned.',
      'Your midfield is dragged out of shape and the switch finds a free fullback.'
    ],
    fixes: [
      'Add a third body in central midfield.',
      'Raise the pressing so the spare man is never comfortable.',
      'Or keep the wingers narrow and defend the centre first.'
    ],
    threat: { from: { top: 44, left: 34 }, to: { top: 82, left: 60 } }
  },
  {
    id: 'narrow_attack',
    severity: 'warning',
    title: 'Your attack has no width',
    condition: (squad, tactics, instructions) => {
      const wide = withPosition(squad, WIDE);
      if (wide.length < 2) return false;
      const allInside = wide.every(({ slotId }) => instructions[slotId] === 'cut_inside');
      const overlapping = withPosition(squad, FULLBACK).some(({ slotId }) => instructions[slotId] === 'overlap');
      return allInside && !overlapping;
    },
    explanation:
      'Both of your wide players are told to come inside and neither fullback is going outside them. Their back four can defend the width of the penalty box and nobody is left to stretch it.',
    beats: [
      'Your winger drifts inside and their fullback follows him, leaving nothing behind.',
      'The ball goes to the free fullback, who looks up and sees nine bodies in one third of the pitch.',
      'You recycle it backwards. They have defended the entire attack without breaking sweat.'
    ],
    fixes: [
      'Send one fullback on the Overlap, or set one winger to Hug the touchline.',
      'If both wingers must come inside, you need attacking fullbacks behind them.',
      'Stretch them first, then attack the middle with the space you have created.'
    ],
    threat: { from: { top: 26, left: 32 }, to: { top: 78, left: 46 } }
  },
  {
    id: 'starved_striker',
    severity: 'warning',
    title: 'Nobody who can find the striker',
    condition: (squad) => {
      if (!withPosition(squad, ['ST', 'CF']).length) return false;
      const mids = withPosition(squad, CENTRAL_MID);
      if (!mids.length) return false;
      return mids.every(({ player }) => player.attributes.passing < 82);
    },
    explanation:
      'Your forwards will make the runs, but there is not one midfielder who can pick the pass. He will make the same run forty times this afternoon and get the ball twice.',
    beats: [
      'Your forward spins in behind and the pass arrives a yard behind him.',
      'He drops deep to get a touch, and now there is nobody in the box at all.',
      'You end up crossing from thirty yards because there is no other option.'
    ],
    fixes: [
      'Bring on a passer with 85+ passing in central midfield.',
      'Play through the wide players and cross early instead.',
      'Or set a striker to Drop deep and link, rather than run in behind.'
    ],
    threat: { from: { top: 40, left: 44 }, to: { top: 62, left: 54 } }
  }
];

const FLAWED_LINES = [
  'This is tactical suicide. We would be torn apart inside twenty minutes and you would have no idea where to look.',
  "I've watched shapes like this lose football matches for forty years. There are holes here a decent side could drive a bus through.",
  "You've handed the opposition a map. Every problem on this list is a goal waiting to happen."
];

const RISKY_LINES = [
  "It's a decent foundation, but there are exploitable holes. A smart opponent will target every one of them.",
  'This could work on a good day. On a bad day, these are the details that cost you the match.',
  "Nothing here is fatal, but I don't like what I'm seeing. Fix two of these and you've got a team."
];

const ELITE_LINES = [
  'This is a balanced, intelligent setup. The structure is sound and the players fit the system.',
  "I've very little to complain about. The shape is coherent, the roles make sense and nobody is hiding.",
  'This team knows its job. Keep this and the opposition has to beat you, not wait for you.'
];

const pick = (list, seed) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return list[hash % list.length];
};

export function generateSirAlexReport(squad, tactics, formation, instructions = {}) {
  const playersOnPitch = Object.keys(squad).length;
  const totalSlots = formations[formation]?.slots.length || 11;

  if (playersOnPitch < totalSlots) {
    return {
      verdict: 'Incomplete',
      summary: `You can't analyze half a team. Get eleven men on that pitch — you've got ${playersOnPitch} of ${totalSlots} — then we'll talk tactics.`,
      problems: []
    };
  }

  const triggered = rules
    .filter((rule) => rule.condition(squad, tactics, instructions, formation))
    .map((rule) => ({
      ...rule,
      explanation: text(rule.explanation, squad, tactics, instructions, formation)
    }))
    .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'critical' ? -1 : 1));

  const criticals = triggered.filter((rule) => rule.severity === 'critical');
  const warnings = triggered.filter((rule) => rule.severity === 'warning');

  let verdict = 'Elite';
  if (criticals.length) verdict = 'Flawed';
  else if (warnings.length) verdict = 'Risky';

  const seed = triggered.map((rule) => rule.id).join('|') || 'elite';
  const opening =
    verdict === 'Flawed'
      ? pick(FLAWED_LINES, seed)
      : verdict === 'Risky'
        ? pick(RISKY_LINES, seed)
        : pick(ELITE_LINES, seed);

  const tally =
    verdict === 'Flawed'
      ? `I count ${criticals.length} fatal flaw${criticals.length > 1 ? 's' : ''}${warnings.length ? ` and ${warnings.length} more that will hurt you` : ''}.`
      : verdict === 'Risky'
        ? `${warnings.length} weakness${warnings.length > 1 ? 'es' : ''} to sort out before kick-off.`
        : 'No weaknesses worth the name.';

  const signOff =
    verdict === 'Elite'
      ? 'Now go and prove me wrong about nothing.'
      : verdict === 'Risky'
        ? 'Fix these before kick-off, not at half-time when you are two down.'
        : "Don't come back to me at full-time. I've told you exactly where this goes wrong.";

  return {
    verdict,
    signOff,
    summary: `${opening} ${tally}`,
    problems: triggered
  };
}
