import React, { useState, useEffect, useRef } from 'react';
import './App.css';

export default function App() {
  const [showModal, setShowModal] = useState(false);
  const [time, setTime] = useState(0); // ms
  const [forcedNumbers, setForcedNumbers] = useState([]);
  const inputRefs = useRef({});
  const [forcedIndex, setForcedIndex] = useState(0);
  const [useForced, setUseForced] = useState(true);
  const [showHint, setShowHint] = useState(false);
  const [hintText, setHintText] = useState('');
  const hintTimer = useRef(null);
  const [isRunning, setIsRunning] = useState(false);
  const [laps, setLaps] = useState([]);
  const intervalRef = useRef(null);

  const STORAGE_KEYS = {
    numbers: 'mychrono_forcedNumbers_v1',
    mode: 'mychrono_useForced_v1'
  };

  const updateForcedNumbers = (arr) => {
    const normalized = arr.map(x => (x === '' ? '' : String(x || '0').padStart(2, '0')));
    setForcedNumbers(normalized);
    try {
      localStorage.setItem(STORAGE_KEYS.numbers, JSON.stringify(normalized));
    } catch (e) {
      // ignore
    }
  };

  // Load persisted forced numbers and mode from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.numbers);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          const normalized = arr.map(x => (x === '' ? '' : String(x || '0').padStart(2, '0')));
          setForcedNumbers(normalized);
          setForcedIndex(0);
        }
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
            <div className="laps-list">
              {laps.map((l, i) => (
                <div key={i} className="lap-item">
                  <span className="lap-number">#{laps.length - i}</span>
                  <span className="lap-time">{formatTime(l)}</span>
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
                {forcedNumbers.map((n, i) => (
                  <div key={i} className="forced-number-item">
                    <input
                      className="number-input"
                      type="number"
                      min="0"
                      max="99"
                      ref={(el) => { inputRefs.current[i] = el }}
                      value={n}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, '');
                        const next = forcedNumbers.slice();
                        next[i] = v;
                        updateForcedNumbers(next);
                      }}
                      onBlur={(e) => {
                        let v = parseInt(e.target.value, 10);
                        if (Number.isNaN(v)) v = 0;
                        if (v < 0) v = 0;
                        if (v > 99) v = 99;
                        const s = String(v).padStart(2, '0');
                        const next = forcedNumbers.slice();
                        next[i] = s;
                        updateForcedNumbers(next);
                      }}
                      placeholder="00"
                    />
                    <button
                      className="delete-number-btn"
                      onClick={() => {
                        const next = forcedNumbers.filter((_, idx) => idx !== i);
                        setForcedIndex(fi => Math.min(fi, next.length));
                        const newRefs = {};
                        let j = 0;
                        for (let k = 0; k < forcedNumbers.length; k++) {
                          if (k === i) continue;
                          newRefs[j++] = inputRefs.current[k];
                        }
                        inputRefs.current = newRefs;
                        updateForcedNumbers(next);
                      }}
                      aria-label={`Usuń ${n}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <button
                className="add-number-btn"
                onClick={() => {
                  const newIndex = forcedNumbers.length;
                  const next = [...forcedNumbers, ''];
                  updateForcedNumbers(next);
                  setTimeout(() => {
                    const el = inputRefs.current[newIndex];
                    if (el && typeof el.focus === 'function') {
                      el.focus();
                      if (typeof el.scrollIntoView === 'function') {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
                      }
                    }
                  }, 0);
                }}
                aria-label="Dodaj liczbę"
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
                  updateForcedNumbers([...forcedNumbers, dd, mm, rr]);
                }}
                aria-label="Dzisiejsza data"
              >
                Dzisiejsza data
              </button>

              {forcedNumbers.length > 0 && (
                <button
                  className="clear-all-btn"
                  onClick={() => {
                    updateForcedNumbers([]);
                    inputRefs.current = {};
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
