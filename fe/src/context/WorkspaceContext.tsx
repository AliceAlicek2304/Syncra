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
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(localStorage.getItem('syncra_workspace_id'));

  const { data: workspaces = [], isLoading } = useQuery({
    queryKey: ['workspaces', user?.userId],
    queryFn: workspacesApi.getWorkspaces,
    enabled: !!user,
  });

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0] || null;

  const setActiveWorkspace = (workspace: Workspace) => {
    setActiveWorkspaceIdState(workspace.id);
    localStorage.setItem('syncra_workspace_id', workspace.id);
  };

  useEffect(() => {
    if (!isLoading && workspaces.length > 0) {
      const currentId = localStorage.getItem('syncra_workspace_id');
      const exists = workspaces.some(w => w.id === currentId);
      if (!currentId || !exists) {
        localStorage.setItem('syncra_workspace_id', workspaces[0].id);
        setActiveWorkspaceIdState(workspaces[0].id);
      }
    }
  }, [workspaces, isLoading]);

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
