'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type GlobalScanResult = {
  success: boolean;
  memberName?: string;
  sessionsRemaining?: number;
  reason?: string;
  timestamp: number; // Date.now() — used to detect new scans
};

type ScanContextValue = {
  lastScan: GlobalScanResult | null;
  setScan: (result: GlobalScanResult) => void;
  clearScan: () => void;
};

const ScanContext = createContext<ScanContextValue>({
  lastScan: null,
  setScan: () => {},
  clearScan: () => {},
});

export function ScanProvider({ children }: { children: ReactNode }) {
  const [lastScan, setLastScan] = useState<GlobalScanResult | null>(null);
  const setScan = useCallback((result: GlobalScanResult) => setLastScan(result), []);
  const clearScan = useCallback(() => setLastScan(null), []);

  return (
    <ScanContext.Provider value={{ lastScan, setScan, clearScan }}>
      {children}
    </ScanContext.Provider>
  );
}

export function useScanContext() {
  return useContext(ScanContext);
}
