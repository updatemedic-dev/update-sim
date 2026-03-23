import { useEffect, useRef, useCallback } from 'react';
import { useJarvisStore } from '../../stores/jarvisStore';
import { useVitalSignsStore } from '../../stores/vitalSignsStore';
import { useDefibStore } from '../../stores/defibStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useScenarioStore } from '../../stores/scenarioStore';
import { useMedicationStore } from '../../stores/medicationStore';
import { analyzeSimulation, getGreeting, getRhythmDescription } from '../../engine/jarvis/JarvisEngine';
import type { SimulationContext } from '../../engine/jarvis/JarvisEngine';

function TypewriterText({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const charIdx = useRef(0);

  useEffect(() => {
    charIdx.current = 0;
    if (!ref.current) return;
    ref.current.textContent = '';
    const timer = setInterval(() => {
      if (!ref.current) return;
      if (charIdx.current < text.length) {
        ref.current.textContent = text.slice(0, charIdx.current + 1);
        charIdx.current++;
      } else {
        clearInterval(timer);
      }
    }, 18);
    return () => clearInterval(timer);
  }, [text]);

  return <span ref={ref} />;
}

export default function JarvisPanel() {
  const {
    isOpen, isMinimized, state, messages,
    toggle, minimize, maximize, setState, addMessage,
    setLastAnalysisTime, lastAnalysisTime,
  } = useJarvisStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasGreeted = useRef(false);

  const language = useSettingsStore((s) => s.language);
  const es = language === 'es';

  const getContext = useCallback((): SimulationContext => {
    const vs = useVitalSignsStore.getState();
    const df = useDefibStore.getState();
    const sc = useScenarioStore.getState();
    const meds = useMedicationStore.getState();
    return {
      rhythm: vs.rhythm,
      vitals: vs.vitals,
      shockCount: df.shockCount,
      pacerOn: df.pacerOn,
      pacerCapture: df.pacerCapture,
      syncMode: df.syncMode,
      energy: df.energy,
      isCharged: df.isCharged,
      scenarioName: sc.activeScenario?.name ?? null,
      scenarioStep: sc.currentStepIndex + 1,
      scenarioTotal: sc.activeScenario?.steps.length ?? 0,
      medicationsAdministered: meds.administered.map((m) => m.medicationId),
      cprActive: vs.vitals.cprActive,
      language,
    };
  }, [language]);

  // Greet on first open
  useEffect(() => {
    if (isOpen && !hasGreeted.current) {
      hasGreeted.current = true;
      setState('speaking');
      const greeting = getGreeting(language);
      addMessage(greeting, 'jarvis');
      setTimeout(() => setState('idle'), 2000);
    }
  }, [isOpen, language, setState, addMessage]);

  // Periodic analysis every 8 seconds
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastAnalysisTime < 7000) return;
      setLastAnalysisTime(now);

      const ctx = getContext();
      const analysis = analyzeSimulation(ctx);

      // Only add messages if there are alerts or new suggestions
      if (analysis.alerts.length > 0) {
        setState('alert');
        analysis.alerts.forEach((alert) => addMessage(alert, 'alert'));
        setTimeout(() => setState('idle'), 3000);
      }

      if (analysis.suggestions.length > 0) {
        setState('thinking');
        setTimeout(() => {
          analysis.suggestions.forEach((s) => addMessage(s, 'suggestion'));
          setState('idle');
        }, 1000);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isOpen, lastAnalysisTime, getContext, setState, addMessage, setLastAnalysisTime]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Analyze on demand
  const runAnalysis = useCallback(() => {
    setState('thinking');
    const ctx = getContext();
    const analysis = analyzeSimulation(ctx);
    const rhythmDesc = getRhythmDescription(ctx.rhythm, language);

    setTimeout(() => {
      addMessage(rhythmDesc, 'jarvis');

      if (ctx.scenarioName) {
        addMessage(
          es
            ? `Escenario activo: ${ctx.scenarioName} — Paso ${ctx.scenarioStep}/${ctx.scenarioTotal}`
            : `Active scenario: ${ctx.scenarioName} — Step ${ctx.scenarioStep}/${ctx.scenarioTotal}`,
          'system'
        );
      }

      addMessage(
        es
          ? `FC: ${ctx.vitals.hr} | PA: ${ctx.vitals.systolic}/${ctx.vitals.diastolic} | SpO2: ${ctx.vitals.spo2}% | EtCO2: ${ctx.vitals.etco2}`
          : `HR: ${ctx.vitals.hr} | BP: ${ctx.vitals.systolic}/${ctx.vitals.diastolic} | SpO2: ${ctx.vitals.spo2}% | EtCO2: ${ctx.vitals.etco2}`,
        'system'
      );

      analysis.alerts.forEach((a) => addMessage(a, 'alert'));
      analysis.suggestions.forEach((s) => addMessage(s, 'suggestion'));

      if (analysis.alerts.length === 0 && analysis.suggestions.length === 0) {
        addMessage(
          es ? 'Sin alertas. Todos los parámetros dentro de rangos aceptables.' : 'No alerts. All parameters within acceptable ranges.',
          'jarvis'
        );
      }

      setState('idle');
      setLastAnalysisTime(Date.now());
    }, 800);
  }, [getContext, language, es, setState, addMessage, setLastAnalysisTime]);

  if (!isOpen) return null;

  const stateColors: Record<string, string> = {
    idle: '#00d4ff',
    listening: '#00ff88',
    thinking: '#ffaa00',
    speaking: '#00d4ff',
    alert: '#ff4444',
  };
  const color = stateColors[state] || '#00d4ff';

  if (isMinimized) {
    return (
      <div
        className="jarvis-panel-minimized"
        onClick={maximize}
        style={{ borderColor: `${color}44` }}
      >
        <div className="jarvis-mini-indicator" style={{ backgroundColor: color }} />
        <span className="jarvis-mini-text">J.A.R.V.I.S.</span>
        <span className="jarvis-mini-status" style={{ color }}>
          {state === 'alert' ? '⚠' : '●'}
        </span>
      </div>
    );
  }

  return (
    <div className="jarvis-panel" style={{ '--jarvis-color': color } as React.CSSProperties}>
      {/* Header */}
      <div className="jarvis-header">
        <div className="jarvis-header-left">
          <div className="jarvis-header-indicator" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
          <span className="jarvis-title">J.A.R.V.I.S.</span>
          <span className="jarvis-subtitle">{es ? 'Asistente Médico IA' : 'AI Medical Assistant'}</span>
        </div>
        <div className="jarvis-header-actions">
          <button onClick={minimize} className="jarvis-btn-icon" title={es ? 'Minimizar' : 'Minimize'}>─</button>
          <button onClick={toggle} className="jarvis-btn-icon" title={es ? 'Cerrar' : 'Close'}>✕</button>
        </div>
      </div>

      {/* Status bar */}
      <div className="jarvis-status-bar" style={{ borderColor: `${color}33` }}>
        <div className="jarvis-status-dot" style={{ backgroundColor: color }}>
          <div className="jarvis-status-dot-ping" style={{ backgroundColor: color }} />
        </div>
        <span className="jarvis-status-text" style={{ color }}>
          {state === 'idle' && (es ? 'MONITOREO ACTIVO' : 'ACTIVE MONITORING')}
          {state === 'thinking' && (es ? 'ANALIZANDO...' : 'ANALYZING...')}
          {state === 'speaking' && (es ? 'COMUNICANDO' : 'COMMUNICATING')}
          {state === 'alert' && (es ? 'ALERTA DETECTADA' : 'ALERT DETECTED')}
          {state === 'listening' && (es ? 'ESCUCHANDO' : 'LISTENING')}
        </span>
      </div>

      {/* Messages */}
      <div className="jarvis-messages">
        {messages.length === 0 && (
          <div className="jarvis-empty">
            <div className="jarvis-empty-icon">◇</div>
            <p>{es ? 'Presiona Analizar para obtener una evaluación del estado actual.' : 'Press Analyze for an assessment of the current state.'}</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`jarvis-msg jarvis-msg-${msg.type}`}>
            <div className="jarvis-msg-prefix">
              {msg.type === 'jarvis' && '›'}
              {msg.type === 'system' && '◆'}
              {msg.type === 'alert' && '⚠'}
              {msg.type === 'suggestion' && '◈'}
            </div>
            <div className="jarvis-msg-content">
              <TypewriterText text={msg.text} />
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Actions */}
      <div className="jarvis-actions">
        <button
          onClick={runAnalysis}
          disabled={state === 'thinking'}
          className="jarvis-action-btn jarvis-action-primary"
          style={{
            borderColor: `${color}66`,
            background: `linear-gradient(135deg, ${color}11, ${color}05)`,
          }}
        >
          <span className="jarvis-action-icon">◇</span>
          {es ? 'Analizar' : 'Analyze'}
        </button>
        <button
          onClick={() => {
            useJarvisStore.getState().clearMessages();
            hasGreeted.current = false;
          }}
          className="jarvis-action-btn jarvis-action-secondary"
        >
          {es ? 'Limpiar' : 'Clear'}
        </button>
      </div>

      {/* HUD decorations */}
      <div className="jarvis-hud-corner jarvis-hud-tl" />
      <div className="jarvis-hud-corner jarvis-hud-tr" />
      <div className="jarvis-hud-corner jarvis-hud-bl" />
      <div className="jarvis-hud-corner jarvis-hud-br" />
    </div>
  );
}
