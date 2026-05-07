import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Check, Layout } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import styles from './WorkspaceSelector.module.css';

export default function WorkspaceSelector() {
  const { workspaces, activeWorkspace, setActiveWorkspace, isLoading } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading) {
    return <div className={styles.skeleton} />;
  }

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button
        className={styles.trigger}
        data-testid="workspace-selector"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select workspace"
      >
        <div className={styles.activeIcon}>
          <Layout size={14} />
        </div>
        <span className={styles.activeName}>
          {activeWorkspace?.name || 'Select Workspace'}
        </span>
        <ChevronDown size={14} className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} />
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>Workspaces</div>
          <div className={styles.workspaceList}>
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                data-testid="workspace-option"
                className={`${styles.workspaceItem} ${
                  activeWorkspace?.id === workspace.id ? styles.activeItem : ''
                }`}
                onClick={() => {
                  setActiveWorkspace(workspace);
                  setIsOpen(false);
                }}
              >
                <span className={styles.workspaceName}>{workspace.name}</span>
                {activeWorkspace?.id === workspace.id && (
                  <Check size={14} className={styles.checkIcon} />
                )}
              </button>
            ))}
          </div>
          <div className={styles.divider} />
          <button className={styles.addBtn}>
            <Plus size={14} />
            <span>Create New</span>
          </button>
        </div>
      )}
    </div>
  );
}
