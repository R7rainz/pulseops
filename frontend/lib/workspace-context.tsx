"use client";

import { createContext, useContext } from "react";
import type { WorkspaceRole } from "./types";

const WorkspaceRoleContext = createContext<WorkspaceRole | null>(null);

export function WorkspaceRoleProvider({
  role,
  children,
}: {
  role: WorkspaceRole | null;
  children: React.ReactNode;
}) {
  return (
    <WorkspaceRoleContext value={role}>
      {children}
    </WorkspaceRoleContext>
  );
}

export function useWorkspaceRole(): WorkspaceRole | null {
  return useContext(WorkspaceRoleContext);
}
