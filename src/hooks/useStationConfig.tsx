import { useState, useEffect, createContext, useContext } from "react";

interface StationConfig {
  stationName: string;
  stationLogo: string | null;
  platformUrl: string;
  streamingHost: string;
  streamingPort: number;
  streamingMountpoint: string;
  streamingUsername: string;
  streamingPassword: string;
  isConfigured: boolean;
}

interface StationConfigContextType {
  config: StationConfig | null;
  loading: boolean;
  isFirstRun: boolean;
  saveConfig: (config: Partial<StationConfig>) => void;
  completeSetup: () => void;
}

const defaultConfig: StationConfig = {
  stationName: "",
  stationLogo: null,
  platformUrl: "",
  streamingHost: "",
  streamingPort: 8000,
  streamingMountpoint: "/live",
  streamingUsername: "",
  streamingPassword: "",
  isConfigured: false,
};

const StationConfigContext = createContext<StationConfigContextType | undefined>(undefined);

const STORAGE_KEY = "station_config";

export const StationConfigProvider = ({ children }: { children: React.ReactNode }) => {
  const [config, setConfig] = useState<StationConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load config from localStorage on mount
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setConfig(parsed);
      } catch {
        setConfig(defaultConfig);
      }
    } else {
      setConfig(defaultConfig);
    }
    setLoading(false);
  }, []);

  const saveConfig = (updates: Partial<StationConfig>) => {
    const newConfig = { ...config, ...updates } as StationConfig;
    setConfig(newConfig);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
  };

  const completeSetup = () => {
    saveConfig({ isConfigured: true });
  };

  const isFirstRun = !loading && (!config || !config.isConfigured);

  return (
    <StationConfigContext.Provider value={{ config, loading, isFirstRun, saveConfig, completeSetup }}>
      {children}
    </StationConfigContext.Provider>
  );
};

export const useStationConfig = () => {
  const context = useContext(StationConfigContext);
  if (context === undefined) {
    throw new Error("useStationConfig must be used within a StationConfigProvider");
  }
  return context;
};
