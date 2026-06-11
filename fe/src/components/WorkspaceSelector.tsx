import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import styles from './WorkspaceSelector.module.css';

function ColorDot({ color }: { color?: string }) {
  return (
    <div
      className={styles.colorDot}
      style={{ background: color || 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}
    />
  );
}

export default function ProfileSelector() {
  const { profiles, activeProfile, setActiveProfile, isLoading } = useWorkspace();
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
        aria-label="Select profile"
      >
        <ColorDot color={activeProfile?.color} />
        <span className={styles.activeName}>
          {activeProfile?.name || 'Select Profile'}
        </span>
        <ChevronDown size={14} className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} />
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>Profiles</div>
          <div className={styles.workspaceList}>
            {profiles.map((profile) => (
              <button
                key={profile.id}
                data-testid="workspace-option"
                className={`${styles.workspaceItem} ${
                  activeProfile?.id === profile.id ? styles.activeItem : ''
                }`}
                onClick={() => {
                  setActiveProfile(profile);
                  setIsOpen(false);
                }}
              >
                <ColorDot color={profile.color} />
                <span className={styles.workspaceName}>{profile.name}</span>
                {activeProfile?.id === profile.id && (
                  <Check size={14} className={styles.checkIcon} />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
