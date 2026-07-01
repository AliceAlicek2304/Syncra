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
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(null);
  const [activeProfileId, setActiveProfileIdState] = useState<string | null>(null);

  const { data: workspaces = [], isLoading: workspacesLoading } = useQuery({
    queryKey: ['workspaces', user?.userId],
    queryFn: workspacesApi.getWorkspaces,
    enabled: !!user,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0] || null;

  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['profiles', user?.userId, activeWorkspace?.id],
    queryFn: () => workspacesApi.getProfiles(activeWorkspace!.id),
    enabled: !!user && !!activeWorkspace?.id,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const activeProfile = profiles.find(p => p.id === activeProfileId) || profiles[0] || null;

  const setActiveWorkspace = (workspace: Workspace) => {
    setActiveWorkspaceIdState(workspace.id);
    setActiveProfileIdState(null);
    localStorage.setItem('syncra_workspace_id', workspace.id);
    localStorage.removeItem('syncra_profile_id');
  };

  const setActiveProfile = (profile: Profile) => {
    setActiveProfileIdState(profile.id);
    localStorage.setItem('syncra_profile_id', profile.id);
  };

  useEffect(() => {
    if (!user) {
      setActiveWorkspaceIdState(null);
      setActiveProfileIdState(null);
      return;
    }

    setActiveWorkspaceIdState(localStorage.getItem('syncra_workspace_id'));
    setActiveProfileIdState(localStorage.getItem('syncra_profile_id'));
  }, [user?.userId]);

  useEffect(() => {
    if (workspacesLoading) return;

    if (!user || workspaces.length === 0) {
      localStorage.removeItem('syncra_workspace_id');
      localStorage.removeItem('syncra_profile_id');
      setActiveWorkspaceIdState(null);
      setActiveProfileIdState(null);
      return;
    }

    const currentId = localStorage.getItem('syncra_workspace_id');
    const exists = workspaces.some(w => w.id === currentId);
    const nextWorkspaceId = exists && currentId ? currentId : workspaces[0].id;

    if (activeWorkspaceId !== nextWorkspaceId) {
      localStorage.setItem('syncra_workspace_id', nextWorkspaceId);
      setActiveWorkspaceIdState(nextWorkspaceId);
      setActiveProfileIdState(null);
      localStorage.removeItem('syncra_profile_id');
    }
  }, [activeWorkspaceId, user, workspaces, workspacesLoading]);

  useEffect(() => {
    if (profilesLoading) return;

    if (!user || profiles.length === 0) {
      localStorage.removeItem('syncra_profile_id');
      setActiveProfileIdState(null);
      return;
    }

    const currentId = localStorage.getItem('syncra_profile_id');
    const exists = profiles.some(p => p.id === currentId);
    const nextProfileId = exists && currentId ? currentId : profiles[0].id;

    if (activeProfileId !== nextProfileId) {
      localStorage.setItem('syncra_profile_id', nextProfileId);
      setActiveProfileIdState(nextProfileId);
    }
  }, [activeProfileId, user, profiles, profilesLoading]);

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
