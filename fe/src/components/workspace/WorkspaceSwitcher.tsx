import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Plus, Layers } from 'lucide-react'
import { useWorkspace } from '../../context/WorkspaceContext'
import DropdownPortal from '../DropdownPortal'
import styles from './WorkspaceSwitcher.module.css'

export default function WorkspaceSwitcher() {
  const { workspaces, activeWorkspace, setActiveWorkspace, createWorkspace, isLoading } = useWorkspace()
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const anchorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setIsCreating(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (workspace: typeof activeWorkspace) => {
    if (workspace) {
      setActiveWorkspace(workspace)
    }
    setIsOpen(false)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newWorkspaceName.trim()) return
    
    try {
      await createWorkspace(newWorkspaceName.trim())
      setNewWorkspaceName('')
      setIsCreating(false)
    } catch (error) {
      console.error('Failed to create workspace:', error)
    }
  }

  if (isLoading) {
    return (
      <div className={styles.switcher}>
        <div className={styles.placeholder}>Loading...</div>
      </div>
    )
  }

  return (
    <div className={styles.switcher} ref={anchorRef}>
      <button 
        className={styles.trigger}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Switch workspace"
      >
        <div className={styles.iconWrap}>
          <Layers size={14} />
        </div>
        <span className={styles.workspaceName}>
          {activeWorkspace?.name || 'Select workspace'}
        </span>
        <ChevronDown 
          size={14} 
          className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
        />
      </button>

      <DropdownPortal anchorRef={anchorRef} isOpen={isOpen} width={220}>
        <div className={styles.dropdown}>
          <div className={styles.section}>
            <div className={styles.sectionLabel}>Workspaces</div>
            {workspaces.map(workspace => (
              <button
                key={workspace.id}
                className={`${styles.item} ${workspace.id === activeWorkspace?.id ? styles.itemActive : ''}`}
                onClick={() => handleSelect(workspace)}
              >
                <Layers size={14} />
                <span className={styles.itemName}>{workspace.name}</span>
              </button>
            ))}
            {workspaces.length === 0 && !isCreating && (
              <div className={styles.empty}>No workspaces yet</div>
            )}
          </div>

          <div className={styles.divider} />

          {isCreating ? (
            <form onSubmit={handleCreate} className={styles.createForm}>
              <input
                type="text"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                placeholder="Workspace name..."
                className={styles.createInput}
                autoFocus
              />
              <div className={styles.createActions}>
                <button 
                  type="button" 
                  className={styles.cancelBtn}
                  onClick={() => {
                    setIsCreating(false)
                    setNewWorkspaceName('')
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className={styles.submitBtn}
                  disabled={!newWorkspaceName.trim()}
                >
                  Create
                </button>
              </div>
            </form>
          ) : (
            <button
              className={styles.createBtn}
              onClick={() => setIsCreating(true)}
            >
              <Plus size={14} />
              <span>Create new workspace</span>
            </button>
          )}
        </div>
      </DropdownPortal>
    </div>
  )
}
