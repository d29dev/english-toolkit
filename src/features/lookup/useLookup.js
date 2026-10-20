import { useContext } from "react";
import { LookupContext } from "./lookupContext";

export function useLookup() {
  const context = useContext(LookupContext);

  if (!context) {
    throw new Error("useLookup must be used inside LookupProvider");
  }

  return context;
}
