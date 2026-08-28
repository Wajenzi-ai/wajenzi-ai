import { createContext, useContext } from "react";

export type WorkspaceContextValue = {
  organizationId?: number;
  projectId?: number;
  organizationName: string;
  projectName: string;
};

export const WorkspaceContext = createContext<WorkspaceContextValue>({ organizationName: "your active organization", projectName: "your active project" });

export function useWorkspaceContext() {
  return useContext(WorkspaceContext);
}
