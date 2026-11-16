import React, { useState } from 'react';
import {
  DndContext, DragOverlay, useSensor, useSensors, useDroppable,
  PointerSensor, pointerWithin, rectIntersection,
} from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { motion, AnimatePresence } from 'framer-motion';
import './index.css';
import PlayerCard, { CardFace } from './components/PlayerCard';
import Pitch, { PlayerToken } from './components/Pitch';
import { formations } from './data/formations';
import playersData from './data/players.json';
import { generateSirAlexReport } from './engine/godfather';

const RETURN_ANIM = { duration: 220, easing: 'cubic-bezier(0.2, 0, 0, 1)' };

// Prefer the slot under the pointer; fall back to overlap so small slots stay easy to hit
const collision = (args) => {
  const hits = pointerWithin(args);
  return hits.length ? hits : rectIntersection(args);
};

function Bench({ players }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'bench' });
  return (
    <aside ref={setNodeRef} className={`sidebar left-panel ${isOver ? 'drop-target' : ''}`}>
      <h2>Squad<small>{players.length}</small></h2>
      <div className="player-list">
        {players.map((p) => <PlayerCard key={p.id} player={p} />)}
      </div>
      {!players.length && <p className="empty-note">Everyone is on the pitch.</p>}
    </aside>
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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const handleDragStart = ({ active }) => {
    const { player, fromSlot } = active.data.current;
    setActive({ player, fromSlot });
  };

  const handleDragEnd = ({ active, over }) => {
    const { player, fromSlot } = active.data.current;
    setActive(null);
    // Landed somewhere valid: no fly-back, the spring pop in the slot is the animation.
    // Missed everything: glide back to where it came from.
    setDropAnim(over ? null : RETURN_ANIM);
    if (!over || over.id === fromSlot) return;

    setReport(null);
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
    setReport(null);
  };

  const handleInstructionChange = (e) => {
    setInstructions((prev) => ({ ...prev, [selectedSlot]: e.target.value }));
    setReport(null);
  };

  const handleAnalyze = () => setReport(generateSirAlexReport(squad, tactics, currentFormation, instructions));

  const benchPlayers = playersData.filter((p) => !Object.values(squad).some((s) => s.id === p.id));

  const getInstructionOptions = () => {
    if (!selectedSlot || !squad[selectedSlot]) return [];
    const pos = squad[selectedSlot].position;
    if (pos === 'LB' || pos === 'RB') {
      return [
        { value: 'overlap', label: 'Overlap (Attack)' },
        { value: 'invert', label: 'Invert (Midfield)' },
        { value: 'stay_back', label: 'Stay Back' },
      ];
    }
    if (['ST', 'LW', 'RW', 'CAM'].includes(pos)) {
      return [
        { value: 'run_in_behind', label: 'Run In Behind' },
        { value: 'drop_deep', label: 'Drop Deep' },
        { value: 'press_high', label: 'Press High' },
      ];
    }
    return [{ value: 'support', label: 'Support Play' }];
  };

  const label = (v, lo, hi, a, b, c) => (v > 70 ? a : v < 30 ? b : c);

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
        <Bench players={benchPlayers} />

        <main className="main-pitch-area">
          <div className="pitch-header">
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <h2>Tactical board</h2>
              <select
                value={currentFormation}
                onChange={(e) => {
                  setCurrentFormation(e.target.value);
                  setSquad({});
                  setInstructions({});
                  setSelectedSlot(null);
                  setReport(null);
                }}
                className="formation-select"
              >
                <option value="4-3-3">4-3-3</option>
                <option value="4-2-3-1">4-2-3-1</option>
              </select>
            </div>
            <button className="analyze-btn" onClick={handleAnalyze}>Consult Sir Alex</button>
          </div>

          <div className="instruction-panel">
            <span>Tactical focus</span>
            <select onChange={(e) => setSelectedSlot(e.target.value)} value={selectedSlot || ''}>
              <option value="" disabled>Select a position...</option>
              {Object.keys(squad).map((slotId) => (
                <option key={slotId} value={slotId}>{slotId} - {squad[slotId].name}</option>
              ))}
            </select>
            {selectedSlot && squad[selectedSlot] && (
              <select className="instruction-select" value={instructions[selectedSlot] || 'default'} onChange={handleInstructionChange}>
                <option value="default">Default role</option>
                {getInstructionOptions().map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            )}
          </div>

          <div className="pitch-stage">
            <Pitch
              formation={formations[currentFormation]}
              squad={squad}
              instructions={instructions}
              activePlayer={active?.player}
            />
          </div>

          <div className="tactics-panel">
            <div className="slider-group">
              <label>Tempo ({label(tactics.tempo, 30, 70, 'Fast', 'Slow', 'Balanced')})</label>
              <input type="range" name="tempo" min="0" max="100" value={tactics.tempo} onChange={handleTacticChange} />
            </div>
            <div className="slider-group">
              <label>Defensive line ({label(tactics.line, 30, 70, 'High', 'Deep', 'Standard')})</label>
              <input type="range" name="line" min="0" max="100" value={tactics.line} onChange={handleTacticChange} />
            </div>
            <div className="slider-group">
              <label>Pressing ({label(tactics.press, 30, 70, 'Constant', 'Drop back', 'Balanced')})</label>
              <input type="range" name="press" min="0" max="100" value={tactics.press} onChange={handleTacticChange} />
            </div>
          </div>
        </main>

        <aside className="sidebar right-panel sir-alex-panel">
          <div className="sir-alex-header">
            <div className="sir-alex-avatar">SA</div>
            <div>
              <h2>Sir Alex</h2>
              <span className="subtitle">The Godfather</span>
            </div>
          </div>

          <div className="report-content">
            {!report ? (
              <p className="waiting-text">Set up your team, adjust your tactics, and consult me. I'll tell you if this setup survives a real match.</p>
            ) : (
              <AnimatePresence>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <div className={`verdict-banner verdict-${report.verdict.toLowerCase()}`}>{report.verdict}</div>
                  <p className="summary-text">{report.summary}</p>
                  {report.problems.length > 0 && (
                    <div className="problems-list">
                      <h4>Why it will fail</h4>
                      {report.problems.map((prob) => (
                        <div key={prob.id} className="problem-card">
                          <p className="problem-text">"{prob.explanation}"</p>
                          <div className="fixes">
                            <strong>Sir Alex's advice</strong>
                            <ul>{prob.fixes.map((fix, i) => <li key={i}>{fix}</li>)}</ul>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </aside>
      </div>

      <DragOverlay dropAnimation={dropAnim}>
        {active ? (
          <div className="overlay-lift">
            {active.fromSlot ? <PlayerToken player={active.player} /> : <CardFace player={active.player} />}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
