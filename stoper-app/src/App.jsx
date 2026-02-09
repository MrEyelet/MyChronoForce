import React, { useState, useEffect, useRef } from 'react';
import './App.css';

export default function App() {
  const [time, setTime] = useState(0); // ms
  const [isRunning, setIsRunning] = useState(false);
  const [laps, setLaps] = useState([]);
  const intervalRef = useRef(null);

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
  const reset = () => { setIsRunning(false); setTime(0); setLaps([]); };
  const lap = () => { if (isRunning) setLaps(prev => [...prev, time]); };

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Stoper</h1>
        <div className="menu-icon">
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
    </div>
  );
}
