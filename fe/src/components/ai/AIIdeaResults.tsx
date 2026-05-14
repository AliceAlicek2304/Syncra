import { useState } from 'react'
import { Check } from 'lucide-react'
import { motion } from 'framer-motion'
import type { GeneratedIdea as ApiGeneratedIdea } from '../../api/ai'
import styles from './AIIdeaResults.module.css'

interface AIIdeaResultsProps {
  ideas: ApiGeneratedIdea[]
  presetResults?: ApiGeneratedIdea[]
  onSelectIdea: (idea: { id: string; title: string; description: string }) => void
  onRegenerate: () => void
  cooldownRemaining: number
}

export function AIIdeaResults({ ideas, presetResults, onSelectIdea }: AIIdeaResultsProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleBulkAdd = () => {
    if (presetResults && selectedIds.length > 0) {
      const combinedContent = selectedIds.map(id => {
        const r = ideas.find(x => x.id === id)
        return r ? `[${r.title}]\n${r.hook}\n\n${r.caption}` : ''
      }).join('\n\n---\n\n')
      onSelectIdea({ id: 'combined-' + Date.now(), title: 'Combined Ideas', description: combinedContent })
      return
    }

    selectedIds.forEach(id => {
      const idea = ideas.find(r => r.id === id)
      if (idea) {
        onSelectIdea({
          id: idea.id + '-' + Date.now() + '-' + Math.random(),
          title: idea.title,
          description: idea.hook,
        })
      }
    })
    setSelectedIds([])
  }

  return (
    <>
      <div className={styles.resultsList}>
        <p className={styles.resultsHint}>
          Select ideas to {presetResults ? <strong>create new post</strong> : <strong>add to Unassigned column</strong>}
        </p>
        {ideas.map(idea => {
          const isSelected = selectedIds.includes(idea.id)
          return (
            <motion.div
              key={idea.id}
              className={`glass-card ${styles.resultCard} ${isSelected ? styles.resultCardSelected : ''}`}
              whileHover={{ y: -2, boxShadow: '0 12px 40px rgba(139, 92, 246, 0.2)' }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.15 }}
              onClick={() => toggleSelect(idea.id)}
            >
              <div className={styles.resultCardTop}>
                <span className={styles.resultType}>{idea.type}</span>
                <span className={styles.resultPlatforms}>{idea.platforms.join(' · ')}</span>
              </div>
              <h3 className={styles.resultTitle}>{idea.title}</h3>
              <p className={styles.resultHook}>{idea.hook}</p>
              <button
                className={`${styles.selectBtn} ${isSelected ? styles.selectBtnSelected : ''}`}
                onClick={e => { e.stopPropagation(); toggleSelect(idea.id) }}
              >
                {isSelected ? <><Check size={13} /> Selected</> : '+ Select'}
              </button>
            </motion.div>
          )
        })}
      </div>
      <div className={styles.bulkFooter}>
        <span className={styles.bulkCount}>
          {selectedIds.length > 0 ? `Selected ${selectedIds.length} ideas` : 'No ideas selected'}
        </span>
        <motion.button
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.1 }}
          className={`btn-primary ${styles.bulkAddBtn}`}
          onClick={handleBulkAdd}
          disabled={selectedIds.length === 0}
        >
          {presetResults ? 'Create now' : 'Add to board'}
        </motion.button>
      </div>
    </>
  )
}
