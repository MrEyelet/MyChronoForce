import React, { useState, useEffect, useRef } from 'react';
import './App.css';

export default function App() {
  const [showModal, setShowModal] = useState(false);
  const [time, setTime] = useState(0); // ms
  const [forcedSets, setForcedSets] = useState([]);
  const [forcedSetsText, setForcedSetsText] = useState([]);
  const [forcedIndex, setForcedIndex] = useState(0);
  const [useForced, setUseForced] = useState(true);
  const [showHint, setShowHint] = useState(false);
  const [hintText, setHintText] = useState('');
  const hintTimer = useRef(null);
  const [isRunning, setIsRunning] = useState(false);
  const [laps, setLaps] = useState([]);
  const intervalRef = useRef(null);
  const lapsListRef = useRef(null);
  const forcedSetInputRefs = useRef({});

  const STORAGE_KEYS = {
    numbers: 'mychrono_forcedNumbers_v1',
    mode: 'mychrono_useForced_v1'
  };

  const updateForcedSets = (sets) => {
    const normalized = sets.map(set =>
      Array.isArray(set)
        ? set.map(x => (x === '' ? '' : String(x || '0').padStart(2, '0')))
        : []
    );
    setForcedSets(normalized);
    setForcedSetsText(normalized.map(set => set.join(' ')));
    try {
      localStorage.setItem(STORAGE_KEYS.numbers, JSON.stringify(normalized));
    } catch (e) {
      // ignore
    }
  };

  const forcedNumbers = forcedSets.flat();

  // Load persisted forced numbers and mode from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.numbers);
      if (raw) {
        const parsed = JSON.parse(raw);
        let sets = [];
        if (Array.isArray(parsed) && parsed.length > 0 && Array.isArray(parsed[0])) {
          sets = parsed;
        } else if (Array.isArray(parsed)) {
          // stary format: jedna płaska lista liczb
          sets = [parsed];
        }
        const normalized = sets.map(set =>
          Array.isArray(set)
            ? set.map(x => (x === '' ? '' : String(x || '0').padStart(2, '0')))
            : []
        );
        setForcedSets(normalized);
        setForcedSetsText(normalized.map(set => set.join(' ')));
        setForcedIndex(0);
      }
      const mode = localStorage.getItem(STORAGE_KEYS.mode);
      if (mode !== null) setUseForced(mode === '1');
    } catch (e) {
      // ignore
    }
  }, []);

  // Persist mode when it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.mode, useForced ? '1' : '0');
    } catch (e) {}
  }, [useForced]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => setTime(t => t + 10), 10);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning]);

  useEffect(() => {
    if (lapsListRef.current) {
      // Zawsze pokazuj początek listy, gdzie są najnowsze okrążenia
      lapsListRef.current.scrollTop = 0;
    }
  }, [laps.length]);

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const centis = Math.floor((ms % 1000) / 10);
    return `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}.${String(centis).padStart(2,'0')}`;
  };

  const toggle = () => setIsRunning(r => !r);
  const reset = () => { setIsRunning(false); setTime(0); setLaps([]); setForcedIndex(0); };
  const lap = () => {
    if (!isRunning) return;
    let recordMs = time;
    if (useForced && forcedNumbers.length > 0 && forcedIndex < forcedNumbers.length) {
      const totalSeconds = Math.floor(time / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const raw = parseInt(forcedNumbers[forcedIndex], 10);
      const centis = Number.isNaN(raw) ? Math.floor((time % 1000) / 10) : Math.max(0, Math.min(99, raw));
      recordMs = minutes * 60000 + seconds * 1000 + centis * 10;
      const nextIndex = forcedIndex + 1;
      setForcedIndex(nextIndex);
    }
    setLaps(prev => [...prev, recordMs]);
  };

  return (
    <div className="app">
      <header className="app-header">
        <button
          className="app-title"
          onClick={() => {
            const newVal = !useForced;
            setUseForced(newVal);
            setHintText(newVal ? 'FORCED' : 'REAL');
            setShowHint(true);
            if (hintTimer.current) clearTimeout(hintTimer.current);
            hintTimer.current = setTimeout(() => setShowHint(false), 3000);
          }}
          aria-label="Przełącz używanie forsowanych numerów"
        >
          Stoper
        </button>
        {showHint && (
          <div className="hint-bubble">{hintText}</div>
        )}
        <div className="menu-icon" onClick={() => setShowModal(true)}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </header>

      <div className="stopwatch-container">
        <div className="time-display">{formatTime(time)}</div>

        <button className="start-stop-btn" onClick={toggle}>
          {isRunning ? 'ZATRZYMAJ' : 'ROZPOCZNIJ'}
        </button>

        {(isRunning || time > 0) && (
          <div className="control-buttons">
            <button className="control-btn reset-btn" onClick={reset}>RESETUJ</button>
            <button className="control-btn lap-btn" onClick={lap} disabled={!isRunning}>OKRĄŻENIE</button>
          </div>
        )}

        {laps.length > 0 && (
          <div className="laps-container">
            <div className="laps-title">Okrążenia:</div>
            <div className="laps-list" ref={lapsListRef}>
              {[...laps]
                .map((l, i) => ({ value: l, originalIndex: i }))
                .reverse()
                .map(({ value }, i) => (
                  <div key={laps.length - i} className="lap-item">
                    <span className="lap-number">#{laps.length - i}</span>
                    <span className="lap-time">{formatTime(value)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Rutyny</h2>
              <button className="modal-close" onClick={() => setShowModal(false)} aria-label="Zamknij">×</button>
            </div>
            <div className="modal-body">
              <div className="forced-numbers-list">
                {forcedSets.map((set, setIndex) => (
                  <div key={setIndex} className="forced-number-item">
                    <div className="forced-set-header">
                      <span className="forced-set-label">Zestaw {setIndex + 1}</span>
                      <button
                        className="delete-number-btn"
                        onClick={() => {
                          const nextSets = forcedSets.filter((_, idx) => idx !== setIndex);
                          updateForcedSets(nextSets);
                          setForcedIndex(fi => Math.min(fi, nextSets.flat().length));
                        }}
                        aria-label={`Usuń zestaw ${setIndex + 1}`}
                      >
                        ×
                      </button>
                    </div>
                    <input
                      className="number-input"
                      type="text"
                      ref={(el) => {
                        forcedSetInputRefs.current[setIndex] = el;
                      }}
                      value={forcedSetsText[setIndex] ?? ''}
                      onChange={(e) => {
                        const nextText = forcedSetsText.slice();
                        nextText[setIndex] = e.target.value;
                        setForcedSetsText(nextText);
                      }}
                      onBlur={(e) => {
                        const text = e.target.value || '';
                        const values = text
                          .split(/[\s,]+/)
                          .filter(Boolean)
                          .map(v => v.replace(/\D/g, ''))
                          .filter(v => v !== '')
                          .map(v => {
                            let num = parseInt(v, 10);
                            if (Number.isNaN(num)) num = 0;
                            if (num < 0) num = 0;
                            if (num > 99) num = 99;
                            return String(num).padStart(2, '0');
                          });
                        const nextSets = forcedSets.slice();
                        nextSets[setIndex] = values;
                        updateForcedSets(nextSets);
                        setForcedIndex(fi => Math.min(fi, nextSets.flat().length));
                      }}
                      placeholder="np. 34 45 56"
                    />
                  </div>
                ))}
              </div>

              <button
                className="add-number-btn"
                onClick={() => {
                  const newIndex = forcedSets.length;
                  updateForcedSets([...forcedSets, []]);
                  setTimeout(() => {
                    const el = forcedSetInputRefs.current[newIndex];
                    if (el && typeof el.focus === 'function') {
                      el.focus();
                      if (typeof el.scrollIntoView === 'function') {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
                      }
                    }
                  }, 0);
                }}
                aria-label="Dodaj zestaw"
              >
                <span className="plus-icon">+</span>
              </button>

              <button
                className="add-number-btn"
                onClick={() => {
                  const today = new Date();
                  const dd = String(today.getDate()).padStart(2, '0');
                  const mm = String(today.getMonth() + 1).padStart(2, '0');
                  const rr = String(today.getFullYear() % 100).padStart(2, '0');
                  updateForcedSets([...forcedSets, [dd, mm, rr]]);
                }}
                aria-label="Dzisiejsza data"
              >
                Dzisiejsza data
              </button>

              {forcedNumbers.length > 0 && (
                <button
                  className="clear-all-btn"
                  onClick={() => {
                    updateForcedSets([]);
                    setForcedIndex(0);
                  }}
                >
                  Wyczyść wszystkie
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
