import React, { useMemo, useState } from 'react';
import {
  DndContext, DragOverlay, useSensor, useSensors, useDroppable,
  PointerSensor, KeyboardSensor, pointerWithin, rectIntersection,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { motion, AnimatePresence } from 'framer-motion';
import './index.css';
import PlayerCard from './components/PlayerCard';
import Pitch, { PlayerToken } from './components/Pitch';
import { formations } from './data/formations';
import playersData from './data/players.json';
import { generateSirAlexReport } from './engine/godfather';
import { buildBestXI, describeSquad } from './engine/lineup';

const RETURN_ANIM = { duration: 220, easing: 'cubic-bezier(0.2, 0, 0, 1)' };

// Prefer the slot under the pointer; fall back to overlap so small slots stay easy to hit
const collision = (args) => {
  const hits = pointerWithin(args);
  return hits.length ? hits : rectIntersection(args);
};

// Every role an outfield player can be given, grouped by where he plays.
const ROLE_OPTIONS = {
  GK: [{ value: 'sweeper_keeper', label: 'Sweeper keeper' }],
  CB: [
    { value: 'stay_back', label: 'Hold the line' },
    { value: 'step_up', label: 'Step up & squeeze' },
  ],
  fullback: [
    { value: 'overlap', label: 'Overlap (attack)' },
    { value: 'invert', label: 'Invert (midfield)' },
    { value: 'stay_back', label: 'Stay back' },
  ],
  wide: [
    { value: 'hug_line', label: 'Hug the touchline' },
    { value: 'cut_inside', label: 'Cut inside' },
    { value: 'run_in_behind', label: 'Run in behind' },
  ],
  striker: [
    { value: 'run_in_behind', label: 'Run in behind' },
    { value: 'drop_deep', label: 'Drop deep & link' },
    { value: 'target_man', label: 'Target man' },
  ],
  central: [
    { value: 'stay_back', label: 'Hold position' },
    { value: 'support', label: 'Support play' },
    { value: 'press_high', label: 'Press high' },
  ],
};

function rolesFor(position) {
  if (position === 'GK') return ROLE_OPTIONS.GK;
  if (position === 'CB') return ROLE_OPTIONS.CB;
  if (['LB', 'RB', 'LWB', 'RWB'].includes(position)) return ROLE_OPTIONS.fullback;
  if (['LW', 'RW', 'LM', 'RM'].includes(position)) return ROLE_OPTIONS.wide;
  if (['ST', 'CF'].includes(position)) return ROLE_OPTIONS.striker;
  return ROLE_OPTIONS.central;
}

const roleLabel = (options, value) => options.find((o) => o.value === value)?.label;

function Bench({ players, pickedPlayer, onPick }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'bench' });
  return (
    <aside ref={setNodeRef} className={`sidebar bench-panel ${isOver ? 'drop-target' : ''}`}>
      <div className="panel-head">
        <h2>Bench</h2>
        <span className="panel-count">{players.length} available</span>
      </div>
      <div className="player-list">
        {players.map((p) => (
          <PlayerCard
            key={p.id}
            player={p}
            picked={pickedPlayer?.id === p.id}
            onPick={onPick}
          />
        ))}
      </div>
      {!players.length && (
        <p className="empty-note">Every player is on the pitch. Drop a starter here to rotate.</p>
      )}
      <p className="hint">
        Drag a card onto a position — or click a player, then click where he should play.
      </p>
    </aside>
  );
}

function SquadChips({ summary }) {
  return (
    <div className="chips">
      <span className={`chip ${summary.count === summary.size ? 'is-ok' : ''}`}>
        <b>{summary.count}</b>/{summary.size} selected
      </span>
      <span className="chip"><b>{summary.avg || '–'}</b> avg rating</span>
      <span className="chip chip-good"><b>{summary.perfect}</b> natural</span>
      <span className="chip chip-warn"><b>{summary.good}</b> adapted</span>
      <span className={`chip ${summary.out ? 'chip-bad' : ''}`}><b>{summary.out}</b> out of position</span>
    </div>
  );
}

function FormationIntel({ formation }) {
  return (
    <details className="intel">
      <summary>System intel</summary>
      <div className="intel-card">
        <h3>{formation.name}</h3>
        <div className="intel-block">
          <h4>Strengths</h4>
          <ul>{formation.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
        </div>
        <div className="intel-block intel-weak">
          <h4>Weaknesses</h4>
          <ul>{formation.weaknesses.map((w) => <li key={w}>{w}</li>)}</ul>
        </div>
      </div>
    </details>
  );
}

function SetupChecklist({ summary, tactics }) {
  const items = [
    { done: summary.count === summary.size, label: `Fill all ${summary.size} positions` },
    { done: summary.out === 0, label: 'Every player in a role he knows' },
    { done: !(tactics.press > 70 && tactics.line < 30), label: 'No contradictory instructions' },
  ];
  return (
    <div className="setup">
      <p className="waiting-text">
        Build your XI, set the roles, then ask me. I&apos;ve seen every way a good team can lose a match.
      </p>
      <ul className="setup-list">
        {items.map((item) => (
          <li key={item.label} className={item.done ? 'is-done' : ''}>
            <span className="tick" aria-hidden="true">{item.done ? '✓' : '·'}</span>
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProblemCard({ prob, playing, onPlay }) {
  return (
    <article className={`problem-card ${playing ? 'is-playing' : ''}`}>
      <header className="problem-head">
        <span className={`sev sev-${prob.severity}`}>{prob.severity}</span>
        <h5>{prob.title}</h5>
      </header>
      <p className="problem-text">&ldquo;{prob.explanation}&rdquo;</p>
      <div className="fixes">
        <strong>Sir Alex&apos;s advice</strong>
        <ul>{prob.fixes.map((fix, i) => <li key={i}>{fix}</li>)}</ul>
      </div>
      <button type="button" className="play-btn" onClick={onPlay}>
        <span aria-hidden="true">▶</span>
        {playing ? 'Replay how it happens' : 'Show me how this goal happens'}
      </button>
    </article>
  );
}

export default function App() {
  const [currentFormation, setCurrentFormation] = useState('4-3-3');
  const [squad, setSquad] = useState({});
  const [report, setReport] = useState(null);
  const [active, setActive] = useState(null); // { player, fromSlot }
  const [dropAnim, setDropAnim] = useState(RETURN_ANIM);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [instructions, setInstructions] = useState({});
  const [tactics, setTactics] = useState({ tempo: 50, line: 50, press: 50 });
  const [pickedPlayer, setPickedPlayer] = useState(null);
  const [threat, setThreat] = useState(null);

  const formation = formations[currentFormation];
  const slots = formation.slots;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const summary = useMemo(() => describeSquad(slots, squad), [slots, squad]);

  const invalidate = () => {
    setReport(null);
    setThreat(null);
  };

  const handleDragStart = ({ active: dragged }) => {
    const { player, fromSlot } = dragged.data.current;
    setActive({ player, fromSlot });
    setPickedPlayer(null);
    setThreat(null);
  };

  const handleDragEnd = ({ active: dragged, over }) => {
    const { player, fromSlot } = dragged.data.current;
    setActive(null);
    // Landed somewhere valid: no fly-back, the spring pop in the slot is the animation.
    // Missed everything: glide back to where it came from.
    setDropAnim(over ? null : RETURN_ANIM);
    if (!over || over.id === fromSlot) return;

    setReport(null);
    setThreat(null);
    setSquad((prev) => {
      const next = { ...prev };
      const toBench = over.id === 'bench';
      const displaced = toBench ? null : next[over.id];
      Object.keys(next).forEach((k) => { if (next[k].id === player.id) delete next[k]; });
      if (!toBench) {
        next[over.id] = player;
        if (fromSlot && displaced) next[fromSlot] = displaced; // swap
      }
      return next;
    });
    setInstructions((prev) => {
      const n = { ...prev };
      delete n[over.id];
      if (fromSlot) delete n[fromSlot];
      return n;
    });
  };

  const handleDragCancel = () => { setActive(null); setDropAnim(RETURN_ANIM); };

  const handleTacticChange = (e) => {
    const { name, value } = e.target;
    setTactics((prev) => ({ ...prev, [name]: parseInt(value, 10) }));
    invalidate();
  };

  const handleInstructionChange = (e) => {
    const value = e.target.value;
    setInstructions((prev) => {
      const next = { ...prev };
      if (value === 'default') delete next[selectedSlot];
      else next[selectedSlot] = value;
      return next;
    });
    invalidate();
  };

  const handleAnalyze = () => {
    setThreat(null);
    setReport(generateSirAlexReport(squad, tactics, currentFormation, instructions));
  };

  const handleAutoFill = () => {
    setSquad(buildBestXI(slots, playersData));
    setInstructions({});
    setSelectedSlot(null);
    setPickedPlayer(null);
    invalidate();
  };

  const handleClear = () => {
    setSquad({});
    setInstructions({});
    setSelectedSlot(null);
    setPickedPlayer(null);
    invalidate();
  };

  const handleFormationChange = (next) => {
    if (next === currentFormation) return;
    const nextSlots = formations[next].slots;
    const keep = (source) => nextSlots.reduce((acc, slot) => {
      if (source[slot.id]) acc[slot.id] = source[slot.id];
      return acc;
    }, {});
    setSquad(keep);
    setInstructions(keep);
    setCurrentFormation(next);
    setSelectedSlot(null);
    setPickedPlayer(null);
    invalidate();
  };

  const placePlayer = (player, slotId) => {
    setSquad((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => { if (next[k].id === player.id) delete next[k]; });
      next[slotId] = player;
      return next;
    });
    setInstructions((prev) => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
    setSelectedSlot(slotId);
    setReport(null);
    setThreat(null);
  };

  const handleSlotClick = (slotId) => {
    if (pickedPlayer) {
      placePlayer(pickedPlayer, slotId);
      setPickedPlayer(null);
      return;
    }
    setSelectedSlot(slotId);
  };

  const handlePick = (player) => {
    setPickedPlayer((prev) => (prev?.id === player.id ? null : player));
    setSelectedSlot(null);
  };

  const handlePlayThreat = (prob) => {
    if (!prob.threat) return;
    if (threat && threat.id === prob.id) {
      setThreat({ ...threat, nonce: Date.now() });
      return;
    }
    setThreat({
      id: prob.id,
      title: prob.title,
      beats: prob.beats,
      from: prob.threat.from,
      to: prob.threat.to,
      nonce: Date.now(),
    });
  };

  const benchPlayers = useMemo(
    () => playersData
      .filter((p) => !Object.values(squad).some((s) => s.id === p.id))
      .sort((a, b) => b.rating - a.rating),
    [squad]
  );

  const roleOptions = selectedSlot && squad[selectedSlot] ? rolesFor(squad[selectedSlot].position) : [];
  const filledSlots = slots.filter((slot) => squad[slot.id]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      modifiers={[restrictToWindowEdges]}
    >
      <div className="app-layout">
        <Bench players={benchPlayers} pickedPlayer={pickedPlayer} onPick={handlePick} />

        <main className="main-pitch-area">
          <header className="board-header">
            <div className="brand">
              <span className="brand-mark">SA</span>
              <div>
                <h1>Tactical board</h1>
                <p>The Godfather&apos;s war room</p>
              </div>
            </div>

            <div className="header-tools">
              <div className="formation-switch" role="group" aria-label="Formation">
                {Object.keys(formations).map((name) => (
                  <button
                    key={name}
                    type="button"
                    className={name === currentFormation ? 'is-active' : ''}
                    aria-pressed={name === currentFormation}
                    onClick={() => handleFormationChange(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <FormationIntel formation={formation} />
            </div>

            <div className="header-actions">
              <button type="button" className="ghost-btn" onClick={handleAutoFill}>Best XI</button>
              <button type="button" className="ghost-btn" onClick={handleClear}>Clear</button>
              <button type="button" className="analyze-btn" onClick={handleAnalyze}>Consult Sir Alex</button>
            </div>
          </header>

          <div className="board-bar">
            <SquadChips summary={summary} />

            <div className="instruction-panel">
              {pickedPlayer ? (
                <span className="placing-note">
                  Placing <b>{pickedPlayer.name}</b> — click a position
                  <button type="button" className="mini-btn" onClick={() => setPickedPlayer(null)}>
                    cancel
                  </button>
                </span>
              ) : (
                <>
                  <select
                    aria-label="Select a position to coach"
                    onChange={(e) => setSelectedSlot(e.target.value || null)}
                    value={selectedSlot || ''}
                  >
                    <option value="" disabled>Coach a position…</option>
                    {filledSlots.map((slot) => (
                      <option key={slot.id} value={slot.id}>{slot.id} · {squad[slot.id].name}</option>
                    ))}
                  </select>
                  {selectedSlot && squad[selectedSlot] && (
                    <select
                      className="instruction-select"
                      aria-label="Role instruction"
                      value={instructions[selectedSlot] || 'default'}
                      onChange={handleInstructionChange}
                    >
                      <option value="default">Default role</option>
                      {roleOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  )}
                  {selectedSlot && squad[selectedSlot] && (
                    <span className="role-note">
                      {instructions[selectedSlot]
                        ? `${squad[selectedSlot].name.split(' ').pop()}: ${roleLabel(roleOptions, instructions[selectedSlot])}`
                        : 'No special instruction'}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="pitch-stage">
            <Pitch
              formation={formation}
              squad={squad}
              instructions={instructions}
              activePlayer={active?.player}
              activeFromSlot={active?.fromSlot}
              pickedPlayer={pickedPlayer}
              onSlotClick={handleSlotClick}
              threat={threat}
              onCloseThreat={() => setThreat(null)}
            />
          </div>

          <div className="board-footer">
            <div className="tactics-panel">
              <div className="slider-group">
                <label htmlFor="tempo">Tempo <b>{label(tactics.tempo, 30, 70, 'Fast', 'Slow', 'Balanced')}</b></label>
                <input id="tempo" type="range" name="tempo" min="0" max="100" value={tactics.tempo} onChange={handleTacticChange} />
              </div>
              <div className="slider-group">
                <label htmlFor="line">Defensive line <b>{label(tactics.line, 30, 70, 'High', 'Deep', 'Standard')}</b></label>
                <input id="line" type="range" name="line" min="0" max="100" value={tactics.line} onChange={handleTacticChange} />
              </div>
              <div className="slider-group">
                <label htmlFor="press">Pressing <b>{label(tactics.press, 30, 70, 'Constant', 'Drop back', 'Balanced')}</b></label>
                <input id="press" type="range" name="press" min="0" max="100" value={tactics.press} onChange={handleTacticChange} />
              </div>
            </div>

            <div className="legend">
              <span><i className="dot dot-perfect" /> Natural</span>
              <span><i className="dot dot-good" /> Adapted</span>
              <span><i className="dot dot-terrible" /> Out of position</span>
            </div>
          </div>
        </main>

        <aside className="sidebar report-panel">
          <div className="sir-alex-header">
            <div className="sir-alex-avatar">SA</div>
            <div>
              <h2>Sir Alex</h2>
              <span className="subtitle">The Godfather</span>
            </div>
          </div>

          <div className="report-content">
            <AnimatePresence mode="wait">
              {!report ? (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <SetupChecklist summary={summary} tactics={tactics} />
                </motion.div>
              ) : (
                <motion.div
                  key={report.verdict}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <div className={`verdict-banner verdict-${report.verdict.toLowerCase()}`}>
                    <span>{report.verdict}</span>
                    <small>{summary.count}/{summary.size} · avg {summary.avg}</small>
                  </div>
                  <p className="summary-text">{report.summary}</p>

                  {report.problems.length > 0 ? (
                    <div className="problems-list">
                      <h4>{report.problems.length} way{report.problems.length > 1 ? 's' : ''} this team loses</h4>
                      {report.problems.map((prob) => (
                        <ProblemCard
                          key={prob.id}
                          prob={prob}
                          playing={threat?.id === prob.id}
                          onPlay={() => handlePlayThreat(prob)}
                        />
                      ))}
                      <p className="report-hint">Pick one and I&apos;ll show you the goal on the board.</p>
                    </div>
                  ) : (
                    <p className="all-clear">No weaknesses found. Now go and win it in the last minute.</p>
                  )}

                  {report.signOff && <p className="sign-off">— Sir Alex</p>}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </aside>
      </div>

      <DragOverlay dropAnimation={dropAnim} adjustScale={false}>
        {active ? (
          active.fromSlot ? (
            <div className="overlay-token">
              <PlayerToken player={active.player} />
            </div>
          ) : (
            <div className="overlay-chip">
              <span className="overlay-rating">{active.player.rating}</span>
              <span className="overlay-info">
                <b>{active.player.name}</b>
                <em>{active.player.position} · {active.player.club}</em>
              </span>
              <span className="overlay-hint">drop on a slot</span>
            </div>
          )
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

const label = (v, lo, hi, a, b, c) => (v > hi ? a : v < lo ? b : c);
