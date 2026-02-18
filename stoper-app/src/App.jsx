import React, { useState, useEffect, useRef } from 'react';
import './App.css';

export default function App() {
  const [showModal, setShowModal] = useState(false);
  const [time, setTime] = useState(0); // ms
  const [forcedSets, setForcedSets] = useState([]);
  const [forcedSetsText, setForcedSetsText] = useState([]);
  const [forcedIndex, setForcedIndex] = useState(0);
  const [useForced, setUseForced] = useState(true);
  const [forceNumber, setForceNumber] = useState('');
  const [forceNumberPhase, setForceNumberPhase] = useState(true);
  const [useMotoUI, setUseMotoUI] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintText, setHintText] = useState('');
  const hintTimer = useRef(null);
  const [isRunning, setIsRunning] = useState(false);
  const [laps, setLaps] = useState([]);
  const intervalRef = useRef(null);
  const lapsListRef = useRef(null);
  const motoLapsListRef = useRef(null);
  const forceNumberTimeoutRef = useRef(null);
  const forcedSetInputRefs = useRef({});

  const STORAGE_KEYS = {
    numbers: 'mychrono_forcedNumbers_v1',
    mode: 'mychrono_useForced_v1',
    motoUI: 'mychrono_useMotoUI_v1',
    forceNumber: 'mychrono_forceNumber_v1'
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

  // Gdy zmieni się forceNumber, ustaw fazę forceNumber, jeśli jest ustawiony.
  // Wyczyszczenie forceNumber wyłącza tę fazę.
  useEffect(() => {
    if (!forceNumber) {
      setForceNumberPhase(false);
      if (forceNumberTimeoutRef.current) {
        clearTimeout(forceNumberTimeoutRef.current);
        forceNumberTimeoutRef.current = null;
      }
    } else {
      setForceNumberPhase(true);
    }
  }, [forceNumber]);

  // Load persisted forced numbers and preferences from localStorage
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

      const ui = localStorage.getItem(STORAGE_KEYS.motoUI);
      if (ui !== null) setUseMotoUI(ui === '1');

      const storedForceNumber = localStorage.getItem(STORAGE_KEYS.forceNumber);
      if (storedForceNumber !== null) setForceNumber(storedForceNumber);

      setPrefsLoaded(true);
    } catch (e) {
      // ignore
    }
  }, []);

  // Persist mode when it changes
  useEffect(() => {
    if (!prefsLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEYS.mode, useForced ? '1' : '0');
    } catch (e) {}
  }, [useForced, prefsLoaded]);

  // Persist background preference when it changes
  // Persist Motorola UI preference when it changes
  useEffect(() => {
    if (!prefsLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEYS.motoUI, useMotoUI ? '1' : '0');
    } catch (e) {}
  }, [useMotoUI, prefsLoaded]);

  // Persist forceNumber when it changes
  useEffect(() => {
    if (!prefsLoaded) return;
    try {
      if (!forceNumber) {
        localStorage.removeItem(STORAGE_KEYS.forceNumber);
      } else {
        localStorage.setItem(STORAGE_KEYS.forceNumber, forceNumber);
      }
    } catch (e) {}
  }, [forceNumber, prefsLoaded]);

  // Sprzątanie timera forceNumber przy odmontowaniu komponentu
  useEffect(() => {
    return () => {
      if (forceNumberTimeoutRef.current) {
        clearTimeout(forceNumberTimeoutRef.current);
        forceNumberTimeoutRef.current = null;
      }
    };
  }, []);

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
      // Zawsze pokazuj początek listy, gdzie są najnowsze okrążenia (tryb klasyczny)
      lapsListRef.current.scrollTop = 0;
    }
  }, [laps.length]);

  useEffect(() => {
    if (useMotoUI && motoLapsListRef.current) {
      // W trybie Motorola UI przewijaj poziomą listę do prawej, żeby było widać najnowsze okrążenie
      motoLapsListRef.current.scrollLeft = motoLapsListRef.current.scrollWidth;
    }
  }, [laps.length, useMotoUI]);

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const centis = Math.floor((ms % 1000) / 10);
    return `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}.${String(centis).padStart(2,'0')}`;
  };

  const formatDisplayTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    const centisReal = Math.floor((ms % 1000) / 10);
    const centiTicks = Math.floor(ms / 10);

    // Przyspieszony tylko wizualnie obrót setnych, logika czasu zostaje bez zmian
    const speedFactor = 3;
    const centisVisual = isRunning
      ? (centiTicks * speedFactor) % 100
      : centisReal;

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centisVisual).padStart(2, '0')}`;
  };

  const applyForcedCentiseconds = (baseMs) => {
    const totalSeconds = Math.floor(baseMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const naturalCentis = Math.floor((baseMs % 1000) / 10);

    // Najpierw forceNumber: sekunda + setne = forceNumber (jeśli ustawione i jesteśmy w tej fazie)
    if (useForced && forceNumber && forceNumberPhase) {
      const target = parseInt(forceNumber, 10);
      if (!Number.isNaN(target)) {
        let centis = target - seconds;
        if (centis < 0) centis = 0;
        if (centis > 99) centis = 99;
        const recordMs = minutes * 60000 + seconds * 1000 + centis * 10;
        return recordMs;
      }
    }

    if (useForced && forcedNumbers.length > 0 && forcedIndex < forcedNumbers.length) {
      const raw = parseInt(forcedNumbers[forcedIndex], 10);
      const centis = Number.isNaN(raw)
        ? naturalCentis
        : Math.max(0, Math.min(99, raw));

      const recordMs = minutes * 60000 + seconds * 1000 + centis * 10;
      setForcedIndex(forcedIndex + 1);
      return recordMs;
    }

    return baseMs;
  };

  const scheduleForceNumberTimeout = () => {
    // Timeout 30s ma działać zawsze, gdy używamy forceNumber,
    // niezależnie od tego, czy istnieją zestawy.
    if (!useForced || !forceNumber) return;

    if (forceNumberTimeoutRef.current) {
      clearTimeout(forceNumberTimeoutRef.current);
    }

    forceNumberTimeoutRef.current = setTimeout(() => {
      setForceNumberPhase(false);
      forceNumberTimeoutRef.current = null;
    }, 30000);
  };

  const toggle = () => {
    // przy zatrzymaniu wymuszamy setne sekundy
    if (isRunning) {
      setTime(prev => applyForcedCentiseconds(prev));
      if (forceNumberPhase) {
        scheduleForceNumberTimeout();
      }
      setIsRunning(false);
    } else {
      setIsRunning(true);
    }
  };
  const reset = () => {
    setIsRunning(false);
    setTime(0);
    setLaps([]);
    // Jeśli używaliśmy forceNumber, po resecie kończymy jego fazę;
    // jeżeli są zestawy, przechodzimy do nich, jeżeli nie ma – stoper działa normalnie.
    if (forceNumber) {
      setForceNumberPhase(false);
    }
    if (forceNumberTimeoutRef.current) {
      clearTimeout(forceNumberTimeoutRef.current);
      forceNumberTimeoutRef.current = null;
    }
    // NIE zerujemy forcedIndex, żeby po wykorzystaniu całego zestawu
    // kolejny start korzystał z następnego zestawu (jeśli istnieje)
  };
  const lap = () => {
    if (!isRunning) return;
    const recordMs = applyForcedCentiseconds(time);
    setLaps(prev => [...prev, recordMs]);
  };

  return (
    <div className="app app-moto-bg">
      <header className="app-header">
        <button
          className="app-title"
          onClick={() => {
            const newVal = !useForced;
            setUseForced(newVal);
            setHintText(newVal ? 'FORCED' : 'REAL');
            setShowHint(true);
            if (hintTimer.current) clearTimeout(hintTimer.current);
            hintTimer.current = setTimeout(() => setShowHint(false), 250);
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
        <div className="time-display">{formatDisplayTime(time)}</div>

        {useMotoUI && (
          <div className="laps-container laps-container-moto-ui">
            <div className="laps-list-moto-ui" ref={motoLapsListRef}>
              {laps.length > 0 &&
                [...laps]
                  .map((l, i) => ({ value: l, originalIndex: i }))
                  .map(({ value }, i) => (
                    <div key={i + 1} className="lap-pill-moto-ui">
                      <span className="lap-pill-number">#{i + 1}</span>
                      <span className="lap-pill-time">{formatTime(value)}</span>
                    </div>
                  ))}
            </div>
          </div>
        )}

        <button
          className={`start-stop-btn ${
            useMotoUI
              ? isRunning
                ? 'start-stop-btn-moto-ui-stop'
                : 'start-stop-btn-moto-ui'
              : ''
          }`}
          onClick={toggle}
        >
          {isRunning ? 'Zatrzymaj' : 'Rozpocznij'}
        </button>

        {(isRunning || time > 0) && (
          <div className={`control-buttons ${useMotoUI ? 'control-buttons-moto-ui' : ''}`}>
            <button
              className={`control-btn reset-btn ${useMotoUI ? 'control-btn-moto-ui' : ''}`}
              onClick={reset}
            >
              Resetuj
            </button>
            <button
              className={`control-btn lap-btn ${useMotoUI ? 'control-btn-moto-ui' : ''}`}
              onClick={lap}
              disabled={!isRunning}
            >
              Okrążenie
            </button>
          </div>
        )}

        {!useMotoUI && laps.length > 0 && (
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
              <div className="modal-settings-row">
                <label className="checkbox-label">
                  <input
                   type="checkbox"
                     checked={useMotoUI}
                    onChange={(e) => setUseMotoUI(e.target.checked)}
                  />
                  <span>Motorola UI</span>
                </label>
              </div>

              <div className="modal-settings-row">
                <label className="checkbox-label">
                  <span>Force number (sekunda + setne)</span>
                  <input
                    className="number-input"
                    type="number"
                    min="0"
                    max="99"
                    value={forceNumber}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      if (raw === '') {
                        setForceNumber('');
                      } else {
                        let num = parseInt(raw, 10);
                        if (Number.isNaN(num)) num = 0;
                        if (num < 0) num = 0;
                        if (num > 99) num = 99;
                        setForceNumber(String(num));
                      }
                    }}
                    placeholder="np. 25"
                  />
                </label>
              </div>
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
                      inputMode="numeric"
                      value={forcedSetsText[setIndex] ?? ''}
                      onChange={(e) => {
                        const nextText = forcedSetsText.slice();
                        nextText[setIndex] = e.target.value;
                        setForcedSetsText(nextText);
                      }}
                      onBlur={(e) => {
                        const text = e.target.value || '';
                        const values = [];
                        // Bierzemy tylko cyfry, a z każdego tokenu robimy pary (max 2 cyfry na liczbę)
                        const tokens = text
                          .split(/[\s,]+/)
                          .filter(Boolean)
                          .map(v => v.replace(/\D/g, ''))
                          .filter(v => v !== '');

                        tokens.forEach(token => {
                          for (let i = 0; i < token.length; i += 2) {
                            const chunk = token.slice(i, i + 2);
                            if (!chunk) continue;
                            let num = parseInt(chunk, 10);
                            if (Number.isNaN(num)) num = 0;
                            if (num < 0) num = 0;
                            if (num > 99) num = 99;
                            values.push(String(num).padStart(2, '0'));
                          }
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

              {(forcedNumbers.length > 0 || forceNumber) && (
                <button
                  className="clear-all-btn"
                  onClick={() => {
                    updateForcedSets([]);
                    setForcedIndex(0);
                    setForceNumber('');
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
