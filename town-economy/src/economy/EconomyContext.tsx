import React, { createContext, useContext } from "react";
import { useEconomy } from "./useEconomy";

type EconomyContextValue = ReturnType<typeof useEconomy>;

const EconomyContext = createContext<EconomyContextValue | null>(null);

export function EconomyProvider({ children }: { children: React.ReactNode }) {
  const economy = useEconomy();
  return <EconomyContext.Provider value={economy}>{children}</EconomyContext.Provider>;
}

export function useEconomyContext(): EconomyContextValue {
  const ctx = useContext(EconomyContext);
  if (!ctx) throw new Error("useEconomyContext must be used within an EconomyProvider");
  return ctx;
}
