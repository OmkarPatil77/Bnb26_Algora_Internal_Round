import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Diagnosis, Intervention, Probe, ProbeAnswerResponse, Question } from "@/types";

type SessionContextValue = {
  demoMode: boolean;
  setDemoMode: (value: boolean) => void;
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  activeQuestion: Question | null;
  setActiveQuestion: (q: Question | null) => void;
  answer: string;
  setAnswer: (value: string) => void;
  reasoning: string;
  setReasoning: (value: string) => void;
  diagnosis: Diagnosis | null;
  setDiagnosis: (d: Diagnosis | null) => void;
  probe: Probe | null;
  setProbe: (p: Probe | null) => void;
  probeResult: ProbeAnswerResponse | null;
  setProbeResult: (pr: ProbeAnswerResponse | null) => void;
  intervention: Intervention | null;
  setIntervention: (i: Intervention | null) => void;
  reassessStep: number;
  setReassessStep: (value: number) => void;
  resolved: boolean;
  setResolved: (value: boolean) => void;
  resetSession: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [demoMode, setDemoMode] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [probe, setProbe] = useState<Probe | null>(null);
  const [probeResult, setProbeResult] = useState<ProbeAnswerResponse | null>(null);
  const [intervention, setIntervention] = useState<Intervention | null>(null);
  const [reassessStep, setReassessStep] = useState(0);
  const [resolved, setResolved] = useState(false);

  const resetSession = () => {
    setActiveQuestion(null);
    setAnswer("");
    setReasoning("");
    setDiagnosis(null);
    setProbe(null);
    setProbeResult(null);
    setIntervention(null);
    setReassessStep(0);
    setResolved(false);
  };

  const value = useMemo(
    () => ({
      demoMode,
      setDemoMode,
      darkMode,
      setDarkMode,
      activeQuestion,
      setActiveQuestion,
      answer,
      setAnswer,
      reasoning,
      setReasoning,
      diagnosis,
      setDiagnosis,
      probe,
      setProbe,
      probeResult,
      setProbeResult,
      intervention,
      setIntervention,
      reassessStep,
      setReassessStep,
      resolved,
      setResolved,
      resetSession,
    }),
    [
      demoMode,
      darkMode,
      activeQuestion,
      answer,
      reasoning,
      diagnosis,
      probe,
      probeResult,
      intervention,
      reassessStep,
      resolved,
    ],
  );

  return (
    <SessionContext.Provider value={value}>
      <div className={darkMode ? "dark min-h-screen" : "min-h-screen"}>{children}</div>
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("SessionProvider is missing");
  return context;
}
