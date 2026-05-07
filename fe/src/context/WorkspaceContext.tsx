import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { workspacesApi } from '../api/workspaces';
import type { Workspace } from '../api/types';
import { useAuth } from './AuthContext';

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  isLoading: boolean;
  setActiveWorkspace: (workspace: Workspace) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null);

  const { data: workspaces = [], isLoading } = useQuery({
    queryKey: ['workspaces', user?.userId],
    queryFn: workspacesApi.getWorkspaces,
    enabled: !!user,
  });

  useEffect(() => {
    if (workspaces.length > 0 && !activeWorkspace) {
      const savedId = localStorage.getItem('syncra_workspace_id');
      const saved = workspaces.find(w => w.id === savedId);
      setActiveWorkspaceState(saved || workspaces[0]);
    }
  }, [workspaces, activeWorkspace]);

  const setActiveWorkspace = (workspace: Workspace) => {
    setActiveWorkspaceState(workspace);
    localStorage.setItem('syncra_workspace_id', workspace.id);
  };

  return (
    <WorkspaceContext.Provider value={{ workspaces, activeWorkspace, isLoading, setActiveWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
