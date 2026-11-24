import { createContext, useContext, useState, ReactNode } from 'react';
import { Engine, GenerateResponse, InspectResponse, SchemaJob, Tenant } from '../types';

interface AppState {
  engine: Engine;
  setEngine: (e: Engine) => void;

  jobId: string | null;
  setJobId: (id: string) => void;

  job: SchemaJob | null;
  setJob: (job: SchemaJob | null) => void;

  inspectData: InspectResponse | null;
  setInspectData: (data: InspectResponse | null) => void;

  generateData: GenerateResponse | null;
  setGenerateData: (data: GenerateResponse | null) => void;

  activeTenant: Tenant | null;
  setActiveTenant: (tenant: Tenant | null) => void;

  requiresAuth: boolean;
  setRequiresAuth: (v: boolean) => void;

  hashAlgorithm: string;
  setHashAlgorithm: (v: string) => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [engine, setEngine] = useState<Engine>('postgres');
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<SchemaJob | null>(null);
  const [inspectData, setInspectData] = useState<InspectResponse | null>(null);
  const [generateData, setGenerateData] = useState<GenerateResponse | null>(null);
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null);
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [hashAlgorithm, setHashAlgorithm] = useState('bcrypt');

  return (
    <AppContext.Provider value={{
      engine, setEngine,
      jobId, setJobId,
      job, setJob,
      inspectData, setInspectData,
      generateData, setGenerateData,
      activeTenant, setActiveTenant,
      requiresAuth, setRequiresAuth,
      hashAlgorithm, setHashAlgorithm,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
