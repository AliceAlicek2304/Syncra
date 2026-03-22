import { useState } from 'react'
import { Plus, Layers, Calendar, MoreVertical } from 'lucide-react'
import { useWorkspace } from '../../context/WorkspaceContext'
import { format } from 'date-fns'
import styles from './WorkspacesPage.module.css'

export default function WorkspacesPage() {
  const { workspaces, activeWorkspace, setActiveWorkspace, createWorkspace, isLoading } = useWorkspace()
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || creating) return
    
    setCreating(true)
    try {
      await createWorkspace(newName.trim())
      setNewName('')
      setIsCreating(false)
    } catch (error) {
      console.error('Failed to create workspace:', error)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Workspaces</h1>
          <p className={styles.subtitle}>Manage your workspaces and switch between them</p>
        </div>
      </div>

      {isLoading ? (
        <div className={styles.loading}>Loading workspaces...</div>
      ) : workspaces.length === 0 && !isCreating ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <Layers size={48} />
          </div>
          <h2>No workspaces yet</h2>
          <p>Create your first workspace to start organizing your content</p>
          <button 
            className={styles.createBtn}
            onClick={() => setIsCreating(true)}
          >
            <Plus size={18} />
            Create Workspace
          </button>
        </div>
      ) : (
        <>
          <div className={styles.grid}>
            {workspaces.map(workspace => (
              <div 
                key={workspace.id}
                className={`${styles.card} ${workspace.id === activeWorkspace?.id ? styles.cardActive : ''}`}
                onClick={() => setActiveWorkspace(workspace)}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.cardIcon}>
                    <Layers size={20} />
                  </div>
                  <button 
                    className={styles.cardMenu}
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Workspace options"
                  >
                    <MoreVertical size={16} />
                  </button>
                </div>
                <h3 className={styles.cardTitle}>{workspace.name}</h3>
                <div className={styles.cardMeta}>
                  <span className={styles.cardSlug}>{workspace.slug}</span>
                  <span className={styles.cardDate}>
                    <Calendar size={12} />
                    {format(new Date(workspace.createdAtUtc), 'MMM d, yyyy')}
                  </span>
                </div>
                {workspace.id === activeWorkspace?.id && (
                  <div className={styles.activeBadge}>Active</div>
                )}
              </div>
            ))}

            {isCreating ? (
              <div className={`${styles.card} ${styles.cardNew}`}>
                <form onSubmit={handleCreate} className={styles.createForm}>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
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
                        setNewName('')
                      }}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className={styles.submitBtn}
                      disabled={!newName.trim() || creating}
                    >
                      {creating ? 'Creating...' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <button 
                className={`${styles.card} ${styles.cardAdd}`}
                onClick={() => setIsCreating(true)}
              >
                <Plus size={32} />
                <span>Create Workspace</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
