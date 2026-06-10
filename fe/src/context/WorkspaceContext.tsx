import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { workspacesApi } from '../api/workspaces';
import type { Workspace, Profile } from '../api/types';
import { useAuth } from './AuthContext';

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  profiles: Profile[];
  activeProfile: Profile | null;
  isLoading: boolean;
  setActiveWorkspace: (workspace: Workspace) => void;
  setActiveProfile: (profile: Profile) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(localStorage.getItem('syncra_workspace_id'));
  const [activeProfileId, setActiveProfileIdState] = useState<string | null>(localStorage.getItem('syncra_profile_id'));

  const { data: workspaces = [], isLoading: workspacesLoading } = useQuery({
    queryKey: ['workspaces', user?.userId],
    queryFn: workspacesApi.getWorkspaces,
    enabled: !!user,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['profiles', activeWorkspaceId],
    queryFn: workspacesApi.getProfiles,
    enabled: !!user && !!activeWorkspaceId,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0] || null;
  const activeProfile = profiles.find(p => p.id === activeProfileId) || profiles[0] || null;

  const setActiveWorkspace = (workspace: Workspace) => {
    setActiveWorkspaceIdState(workspace.id);
    localStorage.setItem('syncra_workspace_id', workspace.id);
  };

  const setActiveProfile = (profile: Profile) => {
    setActiveProfileIdState(profile.id);
    localStorage.setItem('syncra_profile_id', profile.id);
  };

  useEffect(() => {
    if (!workspacesLoading && workspaces.length > 0) {
      const currentId = localStorage.getItem('syncra_workspace_id');
      const exists = workspaces.some(w => w.id === currentId);
      if (!currentId || !exists) {
        localStorage.setItem('syncra_workspace_id', workspaces[0].id);
        setActiveWorkspaceIdState(workspaces[0].id);
      }
    }
  }, [workspaces, workspacesLoading]);

  useEffect(() => {
    if (!profilesLoading && profiles.length > 0) {
      const currentId = localStorage.getItem('syncra_profile_id');
      const exists = profiles.some(p => p.id === currentId);
      if (!currentId || !exists) {
        localStorage.setItem('syncra_profile_id', profiles[0].id);
        setActiveProfileIdState(profiles[0].id);
      }
    }
  }, [profiles, profilesLoading]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        profiles,
        activeProfile,
        isLoading: workspacesLoading || profilesLoading,
        setActiveWorkspace,
        setActiveProfile,
      }}
    >
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
