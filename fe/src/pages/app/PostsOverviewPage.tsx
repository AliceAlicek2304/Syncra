import React, { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, Upload, Grid, List, Calendar, ChevronDown, 
  X, HelpCircle, ArrowLeft, ArrowRight, AlertCircle, FileSpreadsheet,
  MoreVertical, Copy, Check, Trash2
} from 'lucide-react'
import { useWorkspace } from '../../context/WorkspaceContext'
import { useAuth } from '../../context/AuthContext'
import { useCreatePostModal } from '../../context/createPostModalContext'
import { useToast } from '../../context/ToastContext'
import { postsApi } from '../../api/posts'
import type { Post } from '../../api/posts'
import { socialAccountsApi } from '../../api/socialAccounts'
import type { SocialAccountDto } from '../../api/socialAccounts'
import styles from './PostsOverviewPage.module.css'

// ─── Platform Icon Definitions ───
const PlatformIcon = ({ platform, size = 18 }: { platform: string; size?: number }) => {
  const name = platform.toLowerCase()
  
  if (name.includes('facebook')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.025 4.416 11.018 10.125 11.913v-8.427H7.078v-3.486h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.486h-2.796v8.427C19.584 23.09 24 18.098 24 12.073z" fill="#1877F2"/>
      </svg>
    )
  }
  if (name.includes('instagram')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <radialGradient id="ig-grad" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(27.5 27.5 -27.5 27.5 27.5 0)">
          <stop offset="0" stopColor="#E09B3D"/>
          <stop offset=".3" stopColor="#C74C4D"/>
          <stop offset=".6" stopColor="#C21975"/>
          <stop offset="1" stopColor="#7024C4"/>
        </radialGradient>
        <rect width="24" height="24" rx="6" fill="url(#ig-grad)"/>
        <path d="M12 6.857a5.143 5.143 0 100 10.286 5.143 5.143 0 000-10.286zm0 8.571a3.429 3.429 0 110-6.858 3.429 3.429 0 010 6.858zm5.286-9.117a1.2 1.2 0 11-2.4 0 1.2 1.2 0 012.4 0z" fill="#FFF"/>
      </svg>
    )
  }
  if (name.includes('tiktok') || name.includes('d')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="24" height="24" rx="6" fill="#000000"/>
        <path d="M16.8 7.2a4.4 4.4 0 01-3.6-1.6v6.4c0 2.2-1.8 4-4 4s-4-1.8-4-4 1.8-4 4-4c.4 0 .8.1 1.2.2v2.1c-.4-.2-.8-.3-1.2-.3-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2V4.8h2c0 1.3 1.1 2.4 2.4 2.4H16.8z" fill="#FFF"/>
        <path d="M16.8 7.2a4.4 4.4 0 01-3.6-1.6v.2a4.4 4.4 0 003.6 1.4h.2z" fill="#25F4EE"/>
      </svg>
    )
  }
  if (name.includes('youtube')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="24" height="24" rx="6" fill="#FF0000"/>
        <path d="M9.6 15.6l6-3.6-6-3.6v7.2z" fill="#FFF"/>
      </svg>
    )
  }
  if (name.includes('linkedin')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="24" height="24" rx="6" fill="#0A66C2"/>
        <path d="M6.2 18V8.8H3.2V18H6.2zM4.7 7.5c1 0 1.8-.8 1.8-1.8S5.7 3.9 4.7 3.9 2.9 4.7 2.9 5.7s.8 1.8 1.8 1.8zM18 18v-5.2c0-2.8-1.5-4.1-3.5-4.1-1.6 0-2.3.9-2.7 1.5v-1.4H8.8V18h3V13.1c0-.3 0-.5.1-.7.2-.5.7-1.1 1.5-1.1.9 0 1.3.8 1.3 2V18h3z" fill="#FFF"/>
      </svg>
    )
  }
  if (name.includes('twitter') || name.includes('x')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="24" height="24" rx="6" fill="#000000"/>
        <path d="M14.2 4.8h1.8l-4 4.5 4.7 6.2h-3.6l-2.8-3.7-3.2 3.7H5.3l4.2-4.8L5 4.8h3.7l2.6 3.4 2.9-3.4zm-.6 9.6h1l-6.4-8.5H7.2l6.4 8.5z" fill="#FFF"/>
      </svg>
    )
  }
  if (name.includes('threads')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="24" height="24" rx="6" fill="#101010"/>
        <path d="M12 4.8c-3.9 0-5.8 2-5.8 5.7 0 2.2.8 3.8 2.2 4.7.9.6 2 .9 3.2.9 1.6 0 2.9-.6 3.6-1.7l-1.3-1c-.5.7-1.3 1.1-2.3 1.1-.9 0-1.7-.2-2.3-.7-.9-.7-1.3-1.8-1.3-3.3 0-3.1 1.4-4.2 4.2-4.2s4.2 1.1 4.2 4.2v.9c0 .7-.4 1.1-1.1 1.1s-1.1-.4-1.1-1.1v-2.8c0-1.8-.8-2.6-2.2-2.6S9.1 8 9.1 9.8v1.6c0 1.8.8 2.6 2.2 2.6.7 0 1.3-.2 1.8-.7.4.8 1.1 1.3 2.1 1.3 1.9 0 2.8-1.3 2.8-2.7V10.5c0-3.7-1.9-5.7-5.8-5.7zm-1.4 6.6V9.8c0-.9.4-1.3.9-1.3s.9.4.9 1.3v1.6c0 .9-.4 1.3-.9 1.3s-.9-.4-.9-1.3z" fill="#FFF"/>
      </svg>
    )
  }
  if (name.includes('pinterest')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="12" fill="#E60023"/>
        <path d="M12 3.6c-4.6 0-8.4 3.8-8.4 8.4 0 3.6 2.2 6.6 5.4 7.8-.1-.7-.2-1.7 0-2.4l1.2-5c-.3-.6-.5-1.5-.5-2.5 0-2.3 1.4-4.1 3-4.1 1.4 0 2.1 1.1 2.1 2.4 0 1.4-.9 3.6-1.4 5.6-.4 1.7.9 3.1 2.6 3.1 3.1 0 5.5-3.3 5.5-8 0-4.2-3-7.1-7.3-7.1C9.6 3.6 6.3 6.9 6.3 11.5c0 1.5.6 3.1 1.3 4 .1.2.2.3.1.5l-.5 2c-.1.3-.3.4-.6.2-2-1-3.3-3.9-3.3-6.2C3.3 7 7 2.4 12.6 2.4c4.3 0 7.7 3.1 7.7 7.2 0 4.3-2.7 7.8-6.5 7.8-1.3 0-2.5-.7-2.9-1.5l-.8 3.1c-.3 1.1-.9 2.2-1.4 3 1.1.3 2.3.5 3.6.5 4.6 0 8.4-3.8 8.4-8.4 0-4.6-3.8-8.4-8.4-8.4z" fill="#FFF"/>
      </svg>
    )
  }
  if (name.includes('reddit')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="12" fill="#FF4500"/>
        <path d="M18.6 11.4c0-.8-.7-1.4-1.4-1.4-.4 0-.7.2-.9.4-1-.7-2.4-1.2-4-1.3l.9-2.7 2.4.5c.1.5.5.9 1 1 .6 0 1-.4 1-1s-.4-1-1-1c-.5 0-.9.3-1 .8l-2.7-.6c-.2 0-.4.2-.4.4l-1 3.1c-1.6 0-3 .5-4.1 1.2-.2-.2-.5-.4-.9-.4-.8 0-1.4.7-1.4 1.4 0 .5.3 1 .7 1.2-.1.3-.1.6-.1.9 0 2.4 2.8 4.3 6.2 4.3s6.2-1.9 6.2-4.3c0-.3 0-.6-.1-.9.5-.2.7-.7.7-1.2zm-9.3.9c.5 0 .9.4 0 .9s-.9.4-.9.9c.5 0 .9-.4.9-.9zm5.5 2.6c-1 1-2.9 1-3.9 0-.1-.1-.1-.3 0-.4s.3-.1.4 0c.8.8 2.3.8 3.1 0 .1-.1.3-.1.4 0s.1.3 0 .4zm-1.8-1.7c-.5 0-.9-.4-.9-.9s.4-.9.9-.9.9.4.9.9-.4.9-.9.9z" fill="#FFF"/>
      </svg>
    )
  }
  if (name.includes('telegram')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="12" fill="#229ED9"/>
        <path d="M17.4 7.8l-2.4 11.4c-.2.8-.7 1-1.4.6l-3.7-2.7-1.8 1.7c-.2.2-.4.4-.8.4l.3-3.8 6.9-6.2c.3-.3-.1-.4-.5-.1l-8.5 5.4-3.7-1.2c-.8-.2-.8-.8.2-1.2L16 6.3c.7-.3 1.4.2 1.4 1.5z" fill="#FFF"/>
      </svg>
    )
  }
  
  // Default Lucide HelpCircle as fallback
  return <HelpCircle size={size} className={styles.fallbackIcon} />
}

// ─── Status Badge Definition ───
const StatusBadge = ({ status }: { status: Post['status'] }) => {
  let label = status.toUpperCase()
  let className = styles.statusBadge
  
  switch (status) {
    case 'scheduled':
      className += ` ${styles.statusScheduled}`
      label = 'scheduled'
      break
    case 'published':
      className += ` ${styles.statusPublished}`
      label = 'published'
      break
    case 'draft':
      className += ` ${styles.statusDraft}`
      label = 'draft'
      break
    case 'failed':
      className += ` ${styles.statusFailed}`
      label = 'failed'
      break
    default:
      className += ` ${styles.statusDefault}`
  }

  return (
    <span className={className}>
      {label}
    </span>
  )
}

export default function PostsOverviewPage() {
  const { workspaces, activeWorkspace } = useWorkspace()
  const { user } = useAuth()
  const { openCreatePost } = useCreatePostModal()
  const { success: showSuccess } = useToast()
  
  const queryClient = useQueryClient()
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([])
  
  // ─── Filter & View States ───
  const [statusFilter, setStatusFilter] = useState<string>('All posts')
  const [platformFilter, setPlatformFilter] = useState<string>('All platforms')
  const [workspaceFilter, setWorkspaceFilter] = useState<string>('All workspaces')
  const selectedWorkspace = workspaceFilter !== 'All workspaces'
    ? workspaces.find(w => w.name === workspaceFilter)
    : undefined
  const workspaceId = selectedWorkspace?.id || activeWorkspace?.id
  const [userFilter, setUserFilter] = useState<string>('All users')
  const [dateFilter, setDateFilter] = useState<string>('All dates')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [sortField, setSortField] = useState<string>('Scheduled (newest first)')
  
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'calendar'>('grid')
  const [limitPerPage, setLimitPerPage] = useState<number>(4)
  const [currentPage, setCurrentPage] = useState<number>(1)
  
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // ─── CSV Import State ───
  const [importOpen, setImportOpen] = useState(false)
  const [csvPreviewData, setCsvPreviewData] = useState<any[]>([])
  const [csvFile, setCsvFile] = useState<File | null>(null)

  // ─── Fetch Active Connected Profiles ───
  const { data: socialAccounts = [] } = useQuery<SocialAccountDto[]>({
    queryKey: ['social-accounts', workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () => socialAccountsApi.getSocialAccounts(workspaceId!),
  })

  // ─── Fetch Posts from API ───
  const { data: apiPosts = [], isLoading: isPostsLoading } = useQuery<Post[]>({
    queryKey: ['posts', workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () => postsApi.getPosts(workspaceId!),
  })

  // ─── CSV Import Posts ───
  const [csvPosts, setCsvPosts] = useState<Post[]>([])

  const copyToClipboard = (e: React.MouseEvent, text: string) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text)
    showSuccess("Copied post ID to clipboard!")
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  // ─── Merge API & CSV Imported Posts ───
  const allMergedPosts = React.useMemo(() => {
    if (csvPosts.length === 0) return apiPosts
    const apiIds = new Set(apiPosts.map(p => p.id))
    const filteredCsv = csvPosts.filter(p => !apiIds.has(p.id))
    return [...apiPosts, ...filteredCsv]
  }, [apiPosts, csvPosts])

  // ─── Filter Logic ───
  const filteredPosts = React.useMemo(() => {
    return allMergedPosts.filter(post => {
      // 1. Status Filter
      if (statusFilter !== 'All posts') {
        const filterLower = statusFilter.toLowerCase()
        if (post.status.toLowerCase() !== filterLower) return false
      }

      // 2. Platform Filter
      if (platformFilter !== 'All platforms') {
        const filterLower = platformFilter.toLowerCase()
        const platforms = post.platforms || []
        const hasPlatform = platforms.some(p => p.toLowerCase().includes(filterLower))
        if (!hasPlatform) return false
      }

      // 3. User Filter (Current user vs all)
      if (userFilter !== 'All users' && user) {
        if (post.createdBy && post.createdBy !== user.userId) return false
      }

      // 5. Date Filter
      if (dateFilter !== 'All dates') {
        const postDate = post.scheduledAtUtc ? new Date(post.scheduledAtUtc) : new Date(post.createdAt)
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
        const dayAfterTomorrow = new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)
        
        if (dateFilter === 'Today') {
          if (postDate < today || postDate >= tomorrow) return false
        } else if (dateFilter === 'Tomorrow') {
          if (postDate < tomorrow || postDate >= dayAfterTomorrow) return false
        } else if (dateFilter === 'This week') {
          const firstDayOfWeek = new Date(today.getTime() - today.getDay() * 24 * 60 * 60 * 1000)
          const lastDayOfWeek = new Date(firstDayOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000)
          if (postDate < firstDayOfWeek || postDate >= lastDayOfWeek) return false
        } else if (dateFilter === 'Next week') {
          const startOfNextWeek = new Date(today.getTime() + (7 - today.getDay()) * 24 * 60 * 60 * 1000)
          const endOfNextWeek = new Date(startOfNextWeek.getTime() + 7 * 24 * 60 * 60 * 1000)
          if (postDate < startOfNextWeek || postDate >= endOfNextWeek) return false
        } else if (dateFilter === 'This month') {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
          if (postDate < startOfMonth || postDate >= endOfMonth) return false
        } else if (dateFilter === 'Custom range' && customStartDate && customEndDate) {
          const start = new Date(customStartDate)
          const end = new Date(customEndDate)
          end.setHours(23, 59, 59, 999)
          if (postDate < start || postDate > end) return false
        }
      }

      return true
    })
  }, [allMergedPosts, statusFilter, platformFilter, userFilter, dateFilter, customStartDate, customEndDate, socialAccounts, user])

  // ─── Sorting Logic ───
  const sortedPosts = React.useMemo(() => {
    return [...filteredPosts].sort((a, b) => {
      const getScheduledTime = (p: Post) => p.scheduledAtUtc ? new Date(p.scheduledAtUtc).getTime() : 0
      const getCreatedTime = (p: Post) => new Date(p.createdAt).getTime()

      if (sortField === 'Scheduled (newest first)') {
        return getScheduledTime(b) - getScheduledTime(a)
      }
      if (sortField === 'Scheduled (oldest first)') {
        return getScheduledTime(a) - getScheduledTime(b)
      }
      if (sortField === 'Created (newest first)') {
        return getCreatedTime(b) - getCreatedTime(a)
      }
      if (sortField === 'Created (oldest first)') {
        return getCreatedTime(a) - getCreatedTime(b)
      }
      if (sortField === 'Status') {
        return a.status.localeCompare(b.status)
      }
      if (sortField === 'Platform') {
        const platA = a.platforms?.[0] || ''
        const platB = b.platforms?.[0] || ''
        return platA.localeCompare(platB)
      }
      return 0
    })
  }, [filteredPosts, sortField])

  // ─── Selection & Deletion ───
  const togglePostSelection = (postId: string) => {
    setSelectedPostIds(prev => 
      prev.includes(postId) 
        ? prev.filter(id => id !== postId) 
        : [...prev, postId]
    )
  }

  const handleSelectAll = () => {
    setSelectedPostIds(filteredPosts.map(p => p.id))
  }

  const handleClearSelection = () => {
    setSelectedPostIds([])
  }

  const handleDeleteSelected = async () => {
    if (selectedPostIds.length === 0) return
    
    try {
      const apiIds = selectedPostIds.filter(id => !id.startsWith('csv-'))
      const csvIds = selectedPostIds.filter(id => id.startsWith('csv-'))
      
      if (apiIds.length > 0 && workspaceId) {
        await Promise.all(apiIds.map(id => postsApi.deletePost(workspaceId, id)))
      }
      
      if (csvIds.length > 0) {
        setCsvPosts(prev => prev.filter(p => !csvIds.includes(p.id)))
      }
      
      showSuccess(`Successfully deleted ${selectedPostIds.length} post(s)`)
      setSelectedPostIds([])
      
      if (workspaceId) {
        queryClient.invalidateQueries({ queryKey: ['posts', workspaceId] })
      }
    } catch (err) {
      console.error(err)
    }
  }

  // ─── Pagination ───
  const paginatedPosts = React.useMemo(() => {
    if (viewMode === 'calendar') return sortedPosts // Calendar view displays all posts on the grid
    const startIndex = (currentPage - 1) * limitPerPage
    return sortedPosts.slice(startIndex, startIndex + limitPerPage)
  }, [sortedPosts, currentPage, limitPerPage, viewMode])

  const totalPages = Math.ceil(sortedPosts.length / limitPerPage)

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }

  // ─── Dropdown Toggles ───
  const toggleDropdown = (dropdownName: string) => {
    setActiveDropdown(prev => prev === dropdownName ? null : dropdownName)
  }

  // ─── CSV Parser Implementation ───
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setCsvFile(file)
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (!text) return

      // Simple CSV parser
      const lines = text.split(/\r?\n/)
      const result = []
      const headers = lines[0].split(',')

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue
        
        // Handle commas inside double quotes
        const row: string[] = []
        let inQuotes = false
        let currentValue = ''
        
        for (let j = 0; j < lines[i].length; j++) {
          const char = lines[i][j]
          if (char === '"') {
            inQuotes = !inQuotes
          } else if (char === ',' && !inQuotes) {
            row.push(currentValue.trim().replace(/^"|"$/g, ''))
            currentValue = ''
          } else {
            currentValue += char
          }
        }
        row.push(currentValue.trim().replace(/^"|"$/g, ''))

        if (row.length >= headers.length) {
          const postObj: any = {}
          headers.forEach((header, index) => {
            postObj[header.trim().toLowerCase()] = row[index]
          })
          result.push(postObj)
        }
      }
      setCsvPreviewData(result)
    }
    reader.readAsText(file)
  }

  const confirmCSVImport = () => {
    if (csvPreviewData.length === 0) return

    const importedPosts: Post[] = csvPreviewData.map((data, index) => {
      const scheduledDate = data.scheduledatutc || data.date || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
      const platformsList = data.platforms ? data.platforms.split(';').map((p: string) => p.trim().toLowerCase()) : ['facebook']
      
      return {
        id: `csv-${Date.now()}-${index}`,
        title: data.title || `Imported post ${index + 1}`,
        content: data.content || data.caption || '',
        status: (data.status?.toLowerCase() === 'published' ? 'published' : 'scheduled') as Post['status'],
        scheduledAtUtc: new Date(scheduledDate).toISOString(),
        platforms: platformsList,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        platformTargets: platformsList.map((plat: string) => ({
          id: `csv-t-${Date.now()}-${index}-${plat}`,
          platform: plat,
          status: data.status?.toLowerCase() === 'published' ? 'Published' : 'Pending',
          zernioAccountId: 'csv-account'
        }))
      }
    })

    setCsvPosts(prev => [...importedPosts, ...prev])
    showSuccess(`Successfully imported ${importedPosts.length} posts!`)
    setImportOpen(false)
    setCsvPreviewData([])
    setCsvFile(null)
  }

  // ─── Format Date Utility ───
  const formatPostDate = (dateStr?: string) => {
    if (!dateStr) return '—'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }) + ' GMT+7' // matching screenshot timezone display
  }

  // ─── Calendar Generation ───
  const renderCalendar = () => {
    const currentMonth = 4 // May (0-indexed represents May as 4)
    
    // First day of May 2026
    const firstDay = new Date(2026, currentMonth, 1)
    // Weekday index of first day (0 = Sun, 1 = Mon, etc.)
    const startOffset = firstDay.getDay()
    // Total days in May 2026 (31 days)
    const totalDays = 31

    const calendarGrid = []
    
    // Padding for previous month (April has 30 days)
    const prevMonthDays = 30
    for (let i = startOffset - 1; i >= 0; i--) {
      calendarGrid.push({
        dayNumber: prevMonthDays - i,
        isCurrentMonth: false,
        dateString: `2026-04-${String(prevMonthDays - i).padStart(2, '0')}`
      })
    }

    // Days of current month (May 2026)
    for (let i = 1; i <= totalDays; i++) {
      calendarGrid.push({
        dayNumber: i,
        isCurrentMonth: true,
        dateString: `2026-05-${String(i).padStart(2, '0')}`
      })
    }

    // Padding for next month (June) to fill the grid (multiple of 7, usually 35 or 42 cells)
    const remainingCells = (7 - (calendarGrid.length % 7)) % 7
    for (let i = 1; i <= remainingCells; i++) {
      calendarGrid.push({
        dayNumber: i,
        isCurrentMonth: false,
        dateString: `2026-06-${String(i).padStart(2, '0')}`
      })
    }

    return (
      <div className={styles.calendarContainer}>
        <div className={styles.calendarHeader}>
          <div className={styles.calendarTitleGroup}>
            <span className={styles.calendarMonthName}>May 2026</span>
            <button className={styles.calendarTodayBtn}>Today</button>
          </div>
          <div className={styles.calendarControls}>
            <div className={styles.calendarStartDaySelect}>
              <span>week starts on</span>
              <button className={`${styles.calendarDayTab} ${styles.activeTab}`}>Sun</button>
              <button className={styles.calendarDayTab}>Mon</button>
            </div>
            <div className={styles.calendarArrows}>
              <button className={styles.calendarArrowBtn}><ArrowLeft size={16} /></button>
              <button className={styles.calendarArrowBtn}><ArrowRight size={16} /></button>
            </div>
          </div>
        </div>

        <div className={styles.calendarGridHeader}>
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        <div className={styles.calendarGrid}>
          {calendarGrid.map((cell, index) => {
            // Find posts scheduled for this day
            const cellPosts = sortedPosts.filter(p => {
              const pDate = p.scheduledAtUtc || p.createdAt
              return pDate.startsWith(cell.dateString)
            })

            const isToday = cell.dateString === '2026-05-25' // mock today date from screenshot

            return (
              <div 
                key={index} 
                className={`${styles.calendarCell} ${!cell.isCurrentMonth ? styles.calendarCellMuted : ''} ${isToday ? styles.calendarCellToday : ''}`}
              >
                <div className={styles.calendarCellNumber}>
                  <span className={isToday ? styles.todayCircle : ''}>{cell.dayNumber}</span>
                </div>
                <div className={styles.calendarCellPosts}>
                  {cellPosts.map(p => (
                    <div 
                      key={p.id} 
                      className={`${styles.calendarPostBadge} ${p.status === 'published' ? styles.calPublished : styles.calScheduled}`}
                      title={p.content || p.title}
                    >
                      <span className={styles.calPostTitle}>{p.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {/* ─── Header ─── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Posts</h1>
          <p className={styles.subtitle}>Manage your scheduled and published content</p>
        </div>
        <div className={styles.actionButtons}>
          <button 
            className={styles.createPostBtn}
            onClick={() => openCreatePost({ source: 'direct' })}
          >
            <Plus size={16} />
            <span>Create post</span>
          </button>
          <button 
            className={styles.importBtn}
            onClick={() => setImportOpen(true)}
          >
            <Upload size={16} />
            <span>Import CSV</span>
          </button>
        </div>
      </div>

      {/* ─── Filters & Sort Toolbar ─── */}
      <div className={styles.toolbar} ref={dropdownRef}>
        <div className={styles.filtersGroup}>
          
          {/* Post Status Filter */}
          <div className={styles.dropdownWrapper}>
            <button 
              className={styles.filterDropdownBtn}
              onClick={() => toggleDropdown('status')}
            >
              <span>{statusFilter}</span>
              <ChevronDown size={14} />
            </button>
            {activeDropdown === 'status' && (
              <div className={styles.dropdownMenu}>
                {['All posts', 'Draft', 'Scheduled', 'Published', 'Failed'].map(opt => (
                  <button 
                    key={opt}
                    className={`${styles.dropdownItem} ${statusFilter === opt ? styles.activeDropdownItem : ''}`}
                    onClick={() => { setStatusFilter(opt); setActiveDropdown(null); setCurrentPage(1); }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Platform Filter */}
          <div className={styles.dropdownWrapper}>
            <button 
              className={styles.filterDropdownBtn}
              onClick={() => toggleDropdown('platform')}
            >
              <span>{platformFilter}</span>
              <ChevronDown size={14} />
            </button>
            {activeDropdown === 'platform' && (
              <div className={`${styles.dropdownMenu} ${styles.platformMenu}`}>
                <button 
                  className={`${styles.dropdownItem} ${platformFilter === 'All platforms' ? styles.activeDropdownItem : ''}`}
                  onClick={() => { setPlatformFilter('All platforms'); setActiveDropdown(null); setCurrentPage(1); }}
                >
                  All platforms
                </button>
                {[
                  { name: 'TikTok', id: 'tiktok' },
                  { name: 'Instagram', id: 'instagram' },
                  { name: 'Facebook', id: 'facebook' },
                  { name: 'YouTube', id: 'youtube' },
                  { name: 'LinkedIn', id: 'linkedin' },
                  { name: 'Twitter/X', id: 'twitter' },
                  { name: 'Threads', id: 'threads' },
                  { name: 'Pinterest', id: 'pinterest' },
                  { name: 'Reddit', id: 'reddit' },
                  { name: 'Telegram', id: 'telegram' }
                ].map(plat => (
                  <button 
                    key={plat.id}
                    className={`${styles.dropdownItem} ${styles.platformItem} ${platformFilter === plat.name ? styles.activeDropdownItem : ''}`}
                    onClick={() => { setPlatformFilter(plat.name); setActiveDropdown(null); setCurrentPage(1); }}
                  >
                    <PlatformIcon platform={plat.id} size={14} />
                    <span>{plat.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Workspace Filter */}
          <div className={styles.dropdownWrapper}>
            <button 
              className={styles.filterDropdownBtn}
              onClick={() => toggleDropdown('workspace')}
            >
              <span>{workspaceFilter}</span>
              <ChevronDown size={14} />
            </button>
            {activeDropdown === 'workspace' && (
              <div className={styles.dropdownMenu}>
                <button 
                  className={`${styles.dropdownItem} ${workspaceFilter === 'All workspaces' ? styles.activeDropdownItem : ''}`}
                  onClick={() => { setWorkspaceFilter('All workspaces'); setActiveDropdown(null); }}
                >
                  All workspaces
                </button>
                {workspaces.map(w => (
                  <button 
                    key={w.id}
                    className={`${styles.dropdownItem} ${workspaceFilter === w.name ? styles.activeDropdownItem : ''}`}
                    onClick={() => { setWorkspaceFilter(w.name); setActiveDropdown(null); setCurrentPage(1); }}
                  >
                    {w.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User Filter */}
          <div className={styles.dropdownWrapper}>
            <button 
              className={styles.filterDropdownBtn}
              onClick={() => toggleDropdown('user')}
            >
              <span>{userFilter}</span>
              <ChevronDown size={14} />
            </button>
            {activeDropdown === 'user' && (
              <div className={styles.dropdownMenu}>
                {['All users', user?.displayName || 'You'].map(opt => (
                  <button 
                    key={opt}
                    className={`${styles.dropdownItem} ${userFilter === opt ? styles.activeDropdownItem : ''}`}
                    onClick={() => { setUserFilter(opt); setActiveDropdown(null); setCurrentPage(1); }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date Filter */}
          <div className={styles.dropdownWrapper}>
            <button 
              className={styles.filterDropdownBtn}
              onClick={() => toggleDropdown('date')}
            >
              <span>{dateFilter === 'All dates' ? 'All dates' : dateFilter}</span>
              <ChevronDown size={14} />
            </button>
            {activeDropdown === 'date' && (
              <div className={`${styles.dropdownMenu} ${styles.dateMenu}`}>
                {['All dates', 'Today', 'Tomorrow', 'This week', 'Next week', 'This month', 'Custom range'].map(opt => (
                  <button 
                    key={opt}
                    className={`${styles.dropdownItem} ${dateFilter === opt ? styles.activeDropdownItem : ''}`}
                    onClick={() => { setDateFilter(opt); if (opt !== 'Custom range') setActiveDropdown(null); setCurrentPage(1); }}
                  >
                    {opt}
                  </button>
                ))}
                {dateFilter === 'Custom range' && (
                  <div className={styles.customDateInputs}>
                    <label className={styles.dateLabel}>From:</label>
                    <input 
                      type="date" 
                      value={customStartDate} 
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className={styles.datePickerInput}
                    />
                    <label className={styles.dateLabel}>To:</label>
                    <input 
                      type="date" 
                      value={customEndDate} 
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className={styles.datePickerInput}
                    />
                    <button 
                      onClick={() => setActiveDropdown(null)} 
                      className={styles.applyDateBtn}
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* View Layout, Sorting, and Pagination limit */}
        <div className={styles.viewSettings}>
          {/* Sorting Dropdown */}
          <div className={styles.dropdownWrapper}>
            <button 
              className={styles.sortDropdownBtn}
              onClick={() => toggleDropdown('sort')}
            >
              <span>{sortField}</span>
              <ChevronDown size={14} />
            </button>
            {activeDropdown === 'sort' && (
              <div className={`${styles.dropdownMenu} ${styles.sortMenu}`}>
                {[
                  'Scheduled (newest first)', 
                  'Scheduled (oldest first)', 
                  'Created (newest first)', 
                  'Created (oldest first)', 
                  'Status', 
                  'Platform'
                ].map(opt => (
                  <button 
                    key={opt}
                    className={`${styles.dropdownItem} ${sortField === opt ? styles.activeDropdownItem : ''}`}
                    onClick={() => { setSortField(opt); setActiveDropdown(null); }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* View Toggles */}
          <div className={styles.viewToggleGroup}>
            <button 
              className={`${styles.viewToggleBtn} ${viewMode === 'grid' ? styles.activeViewBtn : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <Grid size={16} />
            </button>
            <button 
              className={`${styles.viewToggleBtn} ${viewMode === 'table' ? styles.activeViewBtn : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <List size={16} />
            </button>
            <button 
              className={`${styles.viewToggleBtn} ${viewMode === 'calendar' ? styles.activeViewBtn : ''}`}
              onClick={() => setViewMode('calendar')}
              title="Calendar View"
            >
              <Calendar size={16} />
            </button>
          </div>

          {/* Pagination limit control */}
          {viewMode !== 'calendar' && (
            <div className={styles.limitControl}>
              <button 
                onClick={() => setLimitPerPage(prev => Math.max(1, prev - 1))}
                className={styles.limitBtn}
              >
                -
              </button>
              <span className={styles.limitValue}>{limitPerPage}</span>
              <button 
                onClick={() => setLimitPerPage(prev => prev + 1)}
                className={styles.limitBtn}
              >
                +
              </button>
            </div>
          )}

        </div>
      </div>

      {/* ─── Main Content View Rendering ─── */}
      {isPostsLoading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading posts...</p>
        </div>
      ) : sortedPosts.length === 0 ? (
        <div className={styles.emptyStateCard}>
          <AlertCircle size={40} className={styles.emptyIcon} />
          <h3>No posts found</h3>
          <p>Try clearing your filters or create a new post to get started.</p>
        </div>
      ) : (
        <>
          {/* Bulk Selection Bar */}
          {selectedPostIds.length > 0 && (
            <div className={styles.selectionBar}>
              <div className={styles.selectionBarLeft}>
                <span className={styles.selectedCount}>
                  {selectedPostIds.length} selected
                </span>
              </div>
              <div className={styles.selectionBarRight}>
                <button 
                  type="button" 
                  className={styles.selectionBarLink} 
                  onClick={handleSelectAll}
                >
                  Select all
                </button>
                <button 
                  type="button" 
                  className={styles.selectionBarLink} 
                  onClick={handleClearSelection}
                >
                  Clear
                </button>
                <button 
                  type="button" 
                  className={styles.deleteSelectedBtn} 
                  onClick={handleDeleteSelected}
                >
                  <Trash2 size={16} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          )}

          {/* GRID VIEW */}
          {viewMode === 'grid' && (
            <div className={styles.gridContainer}>
              {paginatedPosts.map(post => {
                const platform = post.platforms?.[0] || 'facebook'
                const isChecked = selectedPostIds.includes(post.id)
                return (
                  <div key={post.id} className={`${styles.postCard} ${isChecked ? styles.postCardChecked : ''}`}>
                    {/* Hover check button */}
                    <div className={`${styles.checkboxContainer} ${isChecked || selectedPostIds.length > 0 ? styles.checkboxContainerActive : ''}`}>
                      <button 
                        type="button" 
                        role="checkbox" 
                        aria-checked={isChecked} 
                        className={`${styles.cardCheckbox} ${isChecked ? styles.cardCheckboxChecked : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePostSelection(post.id);
                        }}
                      >
                        {isChecked && <Check size={10} strokeWidth={3} />}
                      </button>
                    </div>

                    <div className={styles.cardBody}>
                      <div className={styles.cardInfo}>
                        <p className={styles.cardTitle} title={post.content}>{post.content || post.title}</p>
                        
                        <div className={styles.platformBadgeWrapper}>
                          <div className={styles.platformBadge}>
                            <PlatformIcon platform={platform} size={16} />
                            <span className={styles.platformBadgeDot}></span>
                          </div>
                        </div>

                        <div className={styles.cardDate}>{formatPostDate(post.scheduledAtUtc || post.createdAt)}</div>
                        
                        <div className={styles.cardMeta}>
                          <span className={styles.creatorName}>{user?.displayName || 'You'}</span>
                          <span className={styles.dotSeparator}>·</span>
                          <span className={styles.creatorHandleWrapper}>
                            <span className={styles.creatorHandleDot} style={{ backgroundColor: 'rgb(255, 237, 160)' }}></span>
                            {user?.email?.split('@')[0] || 'nguyenhonghieutai7a9'}
                          </span>
                          <span className={styles.dotSeparator}>·</span>
                          <button type="button" className={styles.copyIdBtn} onClick={(e) => copyToClipboard(e, post.id)}>
                            {post.id.substring(0, 6)}...
                            <Copy size={10} className={styles.copyIcon} />
                          </button>
                        </div>
                      </div>

                      {post.mediaItems?.[0] && (
                        <button type="button" className={styles.cardThumbnailBtn} aria-label="Preview media">
                          <img src={post.mediaItems[0].url} alt={post.mediaItems[0].filename || 'media'} className={styles.cardThumbnailImg} />
                        </button>
                      )}
                    </div>

                    <div className={styles.cardFooter}>
                      <div className={styles.statusBadgeWrapper}>
                        <StatusBadge status={post.status} />
                      </div>
                      <button className={styles.moreOptionsBtn} aria-label="More options">
                        <MoreVertical size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* TABLE VIEW */}
          {viewMode === 'table' && (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input 
                        type="checkbox" 
                        className={styles.checkbox} 
                        checked={paginatedPosts.length > 0 && paginatedPosts.every(p => selectedPostIds.includes(p.id))}
                        onChange={() => {
                          const allPageSelected = paginatedPosts.every(p => selectedPostIds.includes(p.id));
                          if (allPageSelected) {
                            setSelectedPostIds(prev => prev.filter(id => !paginatedPosts.some(p => p.id === id)));
                          } else {
                            setSelectedPostIds(prev => {
                              const next = [...prev];
                              paginatedPosts.forEach(p => {
                                if (!next.includes(p.id)) next.push(p.id);
                              });
                              return next;
                            });
                          }
                        }}
                      />
                    </th>
                    <th>Content</th>
                    <th>Platforms</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Profile</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPosts.map(post => {
                    const platform = post.platforms?.[0] || 'facebook'
                    const isChecked = selectedPostIds.includes(post.id)
                    return (
                      <tr key={post.id} className={isChecked ? styles.selectedRow : ''}>
                        <td>
                          <input 
                            type="checkbox" 
                            className={styles.checkbox} 
                            checked={isChecked}
                            onChange={() => togglePostSelection(post.id)}
                          />
                        </td>
                        <td className={styles.tableNameCell}>
                          <div className={styles.tableTitle}>{post.title}</div>
                        </td>
                        <td>
                          <div className={styles.tablePlatforms}>
                            <PlatformIcon platform={platform} size={16} />
                          </div>
                        </td>
                        <td className={styles.tableDate}>{formatPostDate(post.scheduledAtUtc || post.createdAt)}</td>
                        <td><StatusBadge status={post.status} /></td>
                        <td>
                          <div className={styles.tableProfile}>
                            <span className={styles.tableProfileBullet}>o</span>
                            <span>{user?.email?.split('@')[0] || 'nguyenhonghieutai...'}</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* CALENDAR VIEW */}
          {viewMode === 'calendar' && renderCalendar()}

          {/* Pagination Controls for Grid/Table */}
          {viewMode !== 'calendar' && totalPages > 1 && (
            <div className={styles.pagination}>
              <button 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={styles.pageBtn}
              >
                Previous
              </button>
              <span className={styles.pageInfo}>
                Page {currentPage} of {totalPages}
              </span>
              <button 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={styles.pageBtn}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* ─── Import CSV Overlay Modal ─── */}
      {importOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleGroup}>
                <FileSpreadsheet size={22} className={styles.modalTitleIcon} />
                <h2>Import Posts from CSV</h2>
              </div>
              <button onClick={() => { setImportOpen(false); setCsvPreviewData([]); setCsvFile(null); }} className={styles.closeModalBtn}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.dragDropZone}>
                <Upload size={32} className={styles.uploadCloudIcon} />
                <p>Drag and drop your CSV file here, or click to browse</p>
                <span className={styles.fileSupportText}>Supported format: CSV (must contain columns: <code>title</code>, <code>content</code>, <code>scheduledAtUtc</code>, <code>platforms</code>)</span>
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleCSVUpload}
                  className={styles.fileInputHidden}
                />
              </div>

              {csvFile && (
                <div className={styles.selectedFileBar}>
                  <span>Selected file: <strong>{csvFile.name}</strong></span>
                  <button onClick={() => { setCsvFile(null); setCsvPreviewData([]); }} className={styles.removeFileBtn}>
                    Remove
                  </button>
                </div>
              )}

              {csvPreviewData.length > 0 && (
                <div className={styles.previewSection}>
                  <h3>Parsed Posts Preview ({csvPreviewData.length} entries)</h3>
                  <div className={styles.previewTableContainer}>
                    <table className={styles.previewTable}>
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Content</th>
                          <th>Scheduled Date</th>
                          <th>Platforms</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreviewData.map((row, idx) => (
                          <tr key={idx}>
                            <td>{row.title || '—'}</td>
                            <td className={styles.truncateCell}>{row.content || row.caption || '—'}</td>
                            <td>{row.scheduledatutc || row.date || '—'}</td>
                            <td>{row.platforms || 'facebook'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button 
                onClick={() => { setImportOpen(false); setCsvPreviewData([]); setCsvFile(null); }} 
                className={styles.modalCancelBtn}
              >
                Cancel
              </button>
              <button 
                onClick={confirmCSVImport}
                disabled={csvPreviewData.length === 0}
                className={styles.modalConfirmBtn}
              >
                Import Posts
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
