import { useContext } from "react";
import { AssistantContext } from "./assistantContext";

export function useAssistant() {
  const context = useContext(AssistantContext);

  if (!context) {
    throw new Error("useAssistant must be used inside AssistantProvider");
  }

  return context;
}
