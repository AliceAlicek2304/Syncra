import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, Upload, Grid, List, Calendar, ChevronDown, 
  X, ArrowLeft, ArrowRight, AlertCircle, FileSpreadsheet,
  MoreVertical, Copy, Check, Trash2, Pencil, Globe
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
import SchedulePicker from '../../components/SchedulePicker'

import { PlatformIcon } from '../../components/create-post/platformIcons'

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
  const { openCreatePost, openEditPost } = useCreatePostModal()
  const { success: showSuccess, error: showError } = useToast()
  
  const queryClient = useQueryClient()
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([])
  const [selectedPostDetails, setSelectedPostDetails] = useState<Post | null>(null)
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null)
  const [deleteConfirmPost, setDeleteConfirmPost] = useState<Post | null>(null)
  const [isDeletingSelected, setIsDeletingSelected] = useState<boolean>(false)
  const [isDeletingSingle, setIsDeletingSingle] = useState<boolean>(false)
  const [isDeletingSyncraOnly, setIsDeletingSyncraOnly] = useState<boolean>(false)
  const [isDeletingPlatformOnly, setIsDeletingPlatformOnly] = useState<boolean>(false)
  const [isDeletingPlatformAndSyncra, setIsDeletingPlatformAndSyncra] = useState<boolean>(false)
  const menuRef = useRef<HTMLDivElement>(null)
  
  // ─── Filter & View States ───
  const [statusFilter, setStatusFilter] = useState<string>('All posts')
  const [platformFilter, setPlatformFilter] = useState<string>('All platforms')
  const [workspaceFilter, setWorkspaceFilter] = useState<string>('All workspaces')
  const selectedWorkspace = workspaceFilter !== 'All workspaces'
    ? workspaces.find(w => w.name === workspaceFilter)
    : undefined
  const workspaceId = selectedWorkspace?.id || activeWorkspace?.id
  const workspaceNameMap = React.useMemo(() => {
    const map = new Map<string, string>()
    workspaces.forEach(w => map.set(w.id, w.name))
    return map
  }, [workspaces])
  const workspaceColorMap = React.useMemo(() => {
    const map = new Map<string, string>()
    workspaces.forEach(w => map.set(w.id, w.color || '#fdba74'))
    return map
  }, [workspaces])
  const [userFilter, setUserFilter] = useState<string>('All users')
  const [dateFilter, setDateFilter] = useState<string>('All dates')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [weekStartsOn, setWeekStartsOn] = useState<'sun' | 'mon'>(() => {
    const saved = localStorage.getItem('syncra_week_starts_on')
    return (saved === 'mon' || saved === 'sun') ? saved : 'sun'
  })

  useEffect(() => {
    localStorage.setItem('syncra_week_starts_on', weekStartsOn)
  }, [weekStartsOn])

  const [sortField, setSortField] = useState<string>('Scheduled (newest first)')
  
  const [searchParams, setSearchParams] = useSearchParams()
  const viewParam = searchParams.get('view')

  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'calendar'>(() => {
    if (viewParam === 'calendar' || viewParam === 'table' || viewParam === 'grid') {
      return viewParam as 'grid' | 'table' | 'calendar'
    }
    return 'grid'
  })

  // Sync state if URL changes (e.g. navigation via sidebar/navbar)
  useEffect(() => {
    if (viewParam === 'calendar' || viewParam === 'table' || viewParam === 'grid') {
      setViewMode(viewParam as 'grid' | 'table' | 'calendar')
    }
  }, [viewParam])

  // Sync URL search param with state changes
  useEffect(() => {
    const currentView = searchParams.get('view')
    if (currentView !== viewMode) {
      setSearchParams(
        (prev) => {
          prev.set('view', viewMode)
          return prev
        },
        { replace: true }
      )
    }
  }, [viewMode, searchParams, setSearchParams])
  const [limitPerPage] = useState<number>(20)
  const [currentPage, setCurrentPage] = useState<number>(1)
  
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // ─── CSV Import State ───
  const [importOpen, setImportOpen] = useState(false)
  const [csvPreviewData, setCsvPreviewData] = useState<any[]>([])
  const [csvFile, setCsvFile] = useState<File | null>(null)

  // ─── Fetch Active Connected Profiles ───
  const { data: socialAccountsPage } = useQuery<ReturnType<typeof socialAccountsApi.getSocialAccounts> extends Promise<infer R> ? R : never>({
    queryKey: ['social-accounts', workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () => socialAccountsApi.getSocialAccounts(workspaceId!),
  })
  const socialAccounts: SocialAccountDto[] = socialAccountsPage?.items ?? []

  // ─── Fetch Posts from API ───
  const statusParam = statusFilter !== 'All posts' ? statusFilter.toLowerCase() : undefined
  const { data: postsPage, isLoading: isPostsLoading } = useQuery({
    queryKey: ['posts', workspaceId, statusParam],
    enabled: Boolean(workspaceId),
    queryFn: () => postsApi.getPosts(workspaceId!, statusParam ? { status: statusParam } : undefined),
  })
  const apiPosts: Post[] = postsPage?.items ?? []

  // ─── CSV Import Posts ───
  const [csvPosts, setCsvPosts] = useState<Post[]>([])

  const copyToClipboard = (e: React.MouseEvent, text: string) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text)
    showSuccess("Copied post ID to clipboard!")
  }

  const handlePostClick = (post: Post) => {
    if (post.status === 'published') {
      setSelectedPostDetails(post)
    } else if (post.status === 'scheduled' || post.status === 'draft') {
      const scheduledDate = new Date(post.scheduledAtUtc || post.createdAt)
      const scheduledTimeStr = scheduledDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) // e.g. "14:30"
      openEditPost({
        id: post.id,
        title: post.title,
        caption: post.content || '',
        platform: post.platforms?.[0] || 'facebook',
        status: post.status,
        year: scheduledDate.getFullYear(),
        month: scheduledDate.getMonth(),
        day: scheduledDate.getDate(),
        time: scheduledTimeStr,
        color: '#ff4f00',
        hashtags: [],
        zernioPostId: post.zernioPostId,
        platformTargets: post.platformTargets,
        mediaItems: post.mediaItems,
        media: post.mediaItems
      })
    }
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
        const platforms = post.platforms?.length 
          ? post.platforms 
          : (post.platformTargets?.map(t => t.platform) || [])
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
          const dayOfWeekOffset = weekStartsOn === 'sun' ? today.getDay() : (today.getDay() + 6) % 7
          const firstDayOfWeek = new Date(today.getTime() - dayOfWeekOffset * 24 * 60 * 60 * 1000)
          const lastDayOfWeek = new Date(firstDayOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000)
          if (postDate < firstDayOfWeek || postDate >= lastDayOfWeek) return false
        } else if (dateFilter === 'Next week') {
          const dayOfWeekOffset = weekStartsOn === 'sun' ? today.getDay() : (today.getDay() + 6) % 7
          const startOfNextWeek = new Date(today.getTime() + (7 - dayOfWeekOffset) * 24 * 60 * 60 * 1000)
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
  }, [allMergedPosts, statusFilter, platformFilter, userFilter, dateFilter, customStartDate, customEndDate, socialAccounts, user, weekStartsOn])

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
    setIsDeletingSelected(true)
    try {
      const apiIds = selectedPostIds.filter(id => !id.startsWith('csv-'))
      const csvIds = selectedPostIds.filter(id => id.startsWith('csv-'))
      
      let successCount = 0
      let failCount = 0
      const failedIds: string[] = []
      
      if (apiIds.length > 0 && workspaceId) {
        const results = await Promise.allSettled(
          apiIds.map(async (id) => {
            const post = allMergedPosts.find(p => p.id === id)
            if (post && post.zernioPostId) {
              await postsApi.deleteZernioPost(workspaceId, post.zernioPostId)
            } else {
              await postsApi.deletePost(workspaceId, id)
            }
            return id
          })
        )
        
        results.forEach((result, idx) => {
          if (result.status === 'fulfilled') {
            successCount++
          } else {
            failCount++
            failedIds.push(apiIds[idx])
          }
        })
      }
      
      if (csvIds.length > 0) {
        setCsvPosts(prev => prev.filter(p => !csvIds.includes(p.id)))
        successCount += csvIds.length
      }
      
      if (successCount > 0) {
        showSuccess(`Successfully deleted ${successCount} post(s)`)
      }
      
      // Keep only the failed posts selected
      setSelectedPostIds(failedIds)
      
      if (successCount > 0 && workspaceId) {
        queryClient.invalidateQueries({ queryKey: ['posts', workspaceId] })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsDeletingSelected(false)
    }
  }

  const handleDeleteSinglePost = async (post: Post) => {
    if (!workspaceId) return
    setIsDeletingSingle(true)
    try {
      if (post.zernioPostId) {
        await postsApi.deleteZernioPost(workspaceId, post.zernioPostId)
        showSuccess('Post deleted successfully')
      } else {
        await postsApi.deletePost(workspaceId, post.id)
        showSuccess('Post deleted successfully')
      }
      setDeleteConfirmPost(null)
      setOpenMenuPostId(null)
      queryClient.invalidateQueries({ queryKey: ['posts', workspaceId] })
    } catch (err) {
      showError('Failed to delete post')
    } finally {
      setIsDeletingSingle(false)
    }
  }

  const handleDeleteSyncraOnly = async (post: Post) => {
    if (!workspaceId) return
    setIsDeletingSyncraOnly(true)
    try {
      if (post.zernioPostId) {
        await postsApi.deleteZernioPost(workspaceId, post.zernioPostId)
      } else {
        await postsApi.deletePost(workspaceId, post.id)
      }
      showSuccess('Post deleted from Syncra only')
      setDeleteConfirmPost(null)
      setOpenMenuPostId(null)
      queryClient.invalidateQueries({ queryKey: ['posts', workspaceId] })
    } catch (err) {
      showError('Failed to delete post')
    } finally {
      setIsDeletingSyncraOnly(false)
    }
  }

  const handleDeletePlatformOnly = async (post: Post) => {
    if (!workspaceId) return
    setIsDeletingPlatformOnly(true)
    try {
      if (post.zernioPostId) {
        const postPlatforms = Array.from(new Set(
          post.platforms?.length 
            ? post.platforms 
            : (post.platformTargets?.map(t => t.platform.toLowerCase()) || [])
        ));
        for (const platform of postPlatforms) {
          await postsApi.unpublishZernioPost(workspaceId, post.zernioPostId, platform, false);
        }
        showSuccess('Post unpublished from platforms')
      } else {
        showError('Post does not support unpublish')
      }
      setDeleteConfirmPost(null)
      setOpenMenuPostId(null)
      queryClient.invalidateQueries({ queryKey: ['posts', workspaceId] })
    } catch (err) {
      showError('Failed to unpublish post')
    } finally {
      setIsDeletingPlatformOnly(false)
    }
  }

  const handleDeletePlatformAndSyncra = async (post: Post) => {
    if (!workspaceId) return
    setIsDeletingPlatformAndSyncra(true)
    try {
      if (post.zernioPostId) {
        const postPlatforms = Array.from(new Set(
          post.platforms?.length 
            ? post.platforms 
            : (post.platformTargets?.map(t => t.platform.toLowerCase()) || [])
        ));
        for (const platform of postPlatforms) {
          await postsApi.unpublishZernioPost(workspaceId, post.zernioPostId, platform, false);
        }
        await postsApi.deleteZernioPost(workspaceId, post.zernioPostId);
        showSuccess('Post deleted from platforms and Syncra')
      } else {
        await postsApi.deletePost(workspaceId, post.id)
        showSuccess('Post deleted successfully')
      }
      setDeleteConfirmPost(null)
      setOpenMenuPostId(null)
      queryClient.invalidateQueries({ queryKey: ['posts', workspaceId] })
    } catch (err) {
      showError('Failed to delete post')
    } finally {
      setIsDeletingPlatformAndSyncra(false)
    }
  }

  // Close post menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuPostId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  const formatDateAndTime = (dateStr?: string) => {
    if (!dateStr) return { date: '—', time: '—' }
    const date = new Date(dateStr)
    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }) + ' GMT+7'
    return { date: formattedDate, time: formattedTime }
  }

  // ─── Calendar Navigation Handlers ───
  const goToPrevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
    else setCurrentMonth(m => m - 1)
  }
  const goToNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
    else setCurrentMonth(m => m + 1)
  }
  const goToToday = () => {
    const now = new Date()
    setCurrentYear(now.getFullYear())
    setCurrentMonth(now.getMonth())
  }

  // ─── Calendar Generation ───
  const renderCalendar = () => {
    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']

    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate()
    const prevMonth = currentMonth === 0 ? { month: 11, year: currentYear - 1 } : { month: currentMonth - 1, year: currentYear }
    const prevMonthDays = new Date(prevMonth.year, prevMonth.month + 1, 0).getDate()
    const nextMonth = currentMonth === 11 ? { month: 0, year: currentYear + 1 } : { month: currentMonth + 1, year: currentYear }
    const firstDay = new Date(currentYear, currentMonth, 1)
    const startOffset = weekStartsOn === 'sun' 
      ? firstDay.getDay() 
      : (firstDay.getDay() + 6) % 7

    const calendarGrid = []

    for (let i = startOffset - 1; i >= 0; i--) {
      calendarGrid.push({
        dayNumber: prevMonthDays - i,
        isCurrentMonth: false,
        dateString: `${prevMonth.year}-${String(prevMonth.month + 1).padStart(2, '0')}-${String(prevMonthDays - i).padStart(2, '0')}`
      })
    }

    for (let i = 1; i <= totalDays; i++) {
      calendarGrid.push({
        dayNumber: i,
        isCurrentMonth: true,
        dateString: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      })
    }

    const remainingCells = (7 - (calendarGrid.length % 7)) % 7
    for (let i = 1; i <= remainingCells; i++) {
      calendarGrid.push({
        dayNumber: i,
        isCurrentMonth: false,
        dateString: `${nextMonth.year}-${String(nextMonth.month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      })
    }

    return (
      <div className={styles.calendarContainer}>
        <div className={styles.calendarHeader}>
          <div className={styles.calendarTitleGroup}>
            <span className={styles.calendarMonthName}>{monthNames[currentMonth]} {currentYear}</span>
            <button className={styles.calendarTodayBtn} onClick={goToToday}>Today</button>
          </div>
          <div className={styles.calendarControls}>
            <div className={styles.calendarStartDaySelect}>
              <span>week starts on</span>
              <button 
                className={`${styles.calendarDayTab} ${weekStartsOn === 'sun' ? styles.activeTab : ''}`}
                onClick={() => setWeekStartsOn('sun')}
              >
                Sun
              </button>
              <button 
                className={`${styles.calendarDayTab} ${weekStartsOn === 'mon' ? styles.activeTab : ''}`}
                onClick={() => setWeekStartsOn('mon')}
              >
                Mon
              </button>
            </div>
            <div className={styles.calendarArrows}>
              <button className={styles.calendarArrowBtn} onClick={goToPrevMonth}><ArrowLeft size={16} /></button>
              <button className={styles.calendarArrowBtn} onClick={goToNextMonth}><ArrowRight size={16} /></button>
            </div>
          </div>
        </div>

        <div className={styles.calendarGridHeader}>
          {(weekStartsOn === 'sun' 
            ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
            : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
          ).map(day => (
            <div key={day}>{day}</div>
          ))}
        </div>

        <div className={styles.calendarGrid}>
          {calendarGrid.map((cell, index) => {
            const cellPosts = sortedPosts.filter(p => {
              const pDate = p.scheduledAtUtc || p.createdAt
              return pDate.startsWith(cell.dateString)
            })

            const isToday = cell.dateString === todayStr

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
                      onClick={(e) => { e.stopPropagation(); handlePostClick(p); }}
                      style={{ cursor: 'pointer' }}
                    >
                      <span className={styles.calBadgeTime}>
                        {(() => {
                          const d = new Date(p.scheduledAtUtc || p.createdAt)
                          return `[${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}]`
                        })()}
                      </span>
                      <span className={styles.calPostTitle}>{p.content || p.title}</span>
                      <PlatformIcon 
                        platform={(p.platforms?.[0] || p.platformTargets?.[0]?.platform || 'facebook') as any} 
                        size={12} 
                      />
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
                    <PlatformIcon platform={plat.id as any} size={14} />
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
                    <span className={styles.workspaceDot} style={{ background: w.color || '#fdba74' }} />
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
                    <SchedulePicker
                      value={customStartDate}
                      onChange={(val) => setCustomStartDate(val)}
                      onlyDate={true}
                    />
                    <label className={styles.dateLabel}>To:</label>
                    <SchedulePicker
                      value={customEndDate}
                      onChange={(val) => setCustomEndDate(val)}
                      onlyDate={true}
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
                  disabled={isDeletingSelected}
                >
                  {isDeletingSelected ? (
                    <div className={styles.buttonSpinner} />
                  ) : (
                    <Trash2 size={16} />
                  )}
                  <span>{isDeletingSelected ? 'Deleting...' : 'Delete'}</span>
                </button>
              </div>
            </div>
          )}

          {/* GRID VIEW */}
          {viewMode === 'grid' && (
            <div className={styles.gridContainer}>
              {paginatedPosts.map(post => {
                const platforms = Array.from(new Set(
                  post.platforms?.length 
                    ? post.platforms 
                    : (post.platformTargets?.map(t => t.platform.toLowerCase()) || [])
                ))
                const displayPlatforms = platforms.length > 0 ? platforms : ['facebook']
                const isChecked = selectedPostIds.includes(post.id)
                return (
                  <div key={post.id} className={`${styles.postCard} ${isChecked ? styles.postCardChecked : ''}`} onClick={() => handlePostClick(post)} style={{ cursor: 'pointer' }}>
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
                        
                        <div className={styles.platformBadgeWrapper} style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {displayPlatforms.map((plat, idx) => (
                            <div key={idx} className={styles.platformBadge}>
                              <PlatformIcon platform={plat as any} size={16} />
                              <span className={styles.platformBadgeDot} style={{ backgroundColor: workspaceColorMap.get(post.workspaceId || '') || '#fdba74' }} />
                            </div>
                          ))}
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
                        <button type="button" className={styles.cardThumbnailBtn} aria-label="Preview media" onClick={(e) => { e.stopPropagation(); handlePostClick(post); }}>
                          <img src={post.mediaItems[0].url} alt={post.mediaItems[0].filename || 'media'} className={styles.cardThumbnailImg} />
                          {post.mediaItems.length > 1 && (
                            <span className={styles.mediaCountBadge}>
                              {post.mediaItems.length}
                            </span>
                          )}
                        </button>
                      )}
                    </div>

                    <div className={styles.cardFooter}>
                      <div className={styles.statusBadgeWrapper}>
                        <StatusBadge status={post.status} />
                      </div>
                      <div className={styles.moreOptionsWrapper} ref={openMenuPostId === post.id ? menuRef : undefined}>
                        <button
                          className={styles.moreOptionsBtn}
                          aria-label="More options"
                          onClick={(e) => { e.stopPropagation(); setOpenMenuPostId(openMenuPostId === post.id ? null : post.id) }}
                        >
                          <MoreVertical size={14} />
                        </button>
                        {openMenuPostId === post.id && (
                          <div className={styles.postMenuDropdown}>
                            {post.status !== 'published' && (
                              <button
                                type="button"
                                className={styles.postMenuItem}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setOpenMenuPostId(null)
                                  handlePostClick(post)
                                }}
                              >
                                <Pencil size={14} />
                                <span>Edit</span>
                              </button>
                            )}
                            <button
                              type="button"
                              className={`${styles.postMenuItem} ${styles.postMenuItemDanger}`}
                              onClick={(e) => {
                                e.stopPropagation()
                                setOpenMenuPostId(null)
                                setDeleteConfirmPost(post)
                              }}
                            >
                              <Trash2 size={14} />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
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
                    <th>Workspace</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPosts.map(post => {
                    const platforms = Array.from(new Set(
                      post.platforms?.length 
                        ? post.platforms 
                        : (post.platformTargets?.map(t => t.platform.toLowerCase()) || [])
                    ))
                    const displayPlatforms = platforms.length > 0 ? platforms : ['facebook']
                    const isChecked = selectedPostIds.includes(post.id)
                    const wsName = workspaceNameMap.get(post.workspaceId || '') || activeWorkspace?.name || '—'
                    const wsColor = workspaceColorMap.get(post.workspaceId || '') || '#fdba74'
                    return (
                      <tr key={post.id} className={isChecked ? styles.selectedRow : ''} onClick={() => handlePostClick(post)} style={{ cursor: 'pointer' }}>
                        <td onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            className={styles.checkbox} 
                            checked={isChecked}
                            onChange={() => togglePostSelection(post.id)}
                          />
                        </td>
                        <td className={styles.tableNameCell}>
                          <div className={styles.tableTitle}>{post.content || post.title}</div>
                        </td>
                        <td>
                          <div className={styles.tablePlatforms} style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {displayPlatforms.map((plat, idx) => (
                              <PlatformIcon key={idx} platform={plat as any} size={16} />
                            ))}
                          </div>
                        </td>
                        <td className={styles.tableDate}>{formatPostDate(post.scheduledAtUtc || post.createdAt)}</td>
                        <td><StatusBadge status={post.status} /></td>
                        <td>
                          <div className={styles.tableProfile}>
                            <span className={styles.workspaceDot} style={{ backgroundColor: wsColor }}></span>
                            <span>{wsName}</span>
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

      {selectedPostDetails && (
        <div 
          className={styles.editorBackdrop} 
          style={{ 
            zIndex: 10000, 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex', 
            justifyContent: 'flex-end', 
            alignItems: 'stretch',
            background: 'rgba(0, 0, 0, 0.4)'
          }} 
          onClick={() => setSelectedPostDetails(null)}
        >
          <div 
            className={styles.editorModal} 
            style={{ 
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              maxWidth: 500, 
              padding: '32px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '24px', 
              background: 'var(--clr-canvas)', 
              borderRadius: '0px', 
              borderLeft: '1px solid var(--clr-border)',
              borderTop: 'none',
              borderRight: 'none',
              borderBottom: 'none',
              boxShadow: '-10px 0 30px rgba(0,0,0,0.15)',
              height: '100vh',
              margin: 0
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: 24, fontWeight: 600, color: 'var(--clr-ink)', fontFamily: 'var(--font-body)', margin: '0 0 6px 0' }}>
                  Post Details
                </h3>
                <span style={{ fontSize: 14, color: 'var(--clr-body-mid)', fontFamily: 'var(--font-body)' }}>
                  {selectedPostDetails.status === 'published' ? 'Published' : 'Scheduled'} on{' '}
                  {(() => {
                    const d = new Date(selectedPostDetails.scheduledAtUtc || selectedPostDetails.createdAt);
                    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + ' at ' + 
                           d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                  })()}
                </span>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedPostDetails(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--clr-body-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '50%' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Body */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
              
              {/* Caption Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--clr-body-mid)', textTransform: 'lowercase', fontFamily: 'var(--font-body)' }}>
                  content
                </div>
                <div style={{ background: 'var(--clr-canvas)', border: '1px solid var(--clr-border)', borderRadius: '8px', padding: '16px', boxSizing: 'border-box' }}>
                  <p style={{ fontSize: 14, color: 'var(--clr-ink)', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'var(--font-body)' }}>
                    {selectedPostDetails.content || selectedPostDetails.title || 'No content'}
                  </p>
                </div>
              </div>

              {/* Media Thumbnails if any */}
              {selectedPostDetails.mediaItems && selectedPostDetails.mediaItems.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--clr-body-mid)', textTransform: 'lowercase', fontFamily: 'var(--font-body)' }}>
                    media
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px' }}>
                    {selectedPostDetails.mediaItems.map((item, idx) => (
                      <div key={idx} style={{ position: 'relative', paddingBottom: '100%', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--clr-border)', background: 'var(--clr-canvas-soft)' }}>
                        <img 
                          src={item.url} 
                          alt={item.filename || 'media'} 
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Platforms Section */}
              <div className={styles.detailPlatformSection}>
                <div className={styles.detailPlatformSectionLabel}>platforms</div>
                <div className={styles.detailPlatformList}>
                  {(() => {
                    const renderCard = (name: string, badgeStatus: string, url: string) => {
                      const isPub = badgeStatus === 'published' || selectedPostDetails.status === 'published';
                      const { date: dDate, time: dTime } = formatDateAndTime(selectedPostDetails.scheduledAtUtc || selectedPostDetails.createdAt);
                      return (
                        <div key={name} className={styles.detailPlatformCard}>
                          {/* Section 1: Icon */}
                          <div className={styles.detailPlatformIconSquare}>
                            <PlatformIcon platform={name as any} size={20} />
                          </div>

                          {/* Section 2: Platform Details Stack */}
                          <div className={styles.detailPlatformNameStack}>
                            <span className={styles.detailPlatformName}>{name}</span>
                            <div className={styles.detailPlatformStatusWrapper}>
                              <StatusBadge status={badgeStatus as any} />
                            </div>
                          </div>

                          {/* Section 3: Date/Time Stack */}
                          <div className={styles.detailPlatformDateStack}>
                            <div className={styles.detailPlatformDateLine}>{dDate}</div>
                            <div className={styles.detailPlatformTimeLine}>{dTime}</div>
                          </div>

                          {/* Section 4: External Link */}
                          {isPub && (
                            <a 
                              href={url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className={styles.detailPlatformLink}
                            >
                              View on {name.toLowerCase()}
                            </a>
                          )}
                        </div>
                      )
                    }

                    const targets = selectedPostDetails.platformTargets || [];
                    if (targets.length === 0) {
                      const platforms = selectedPostDetails.platforms || ['facebook'];
                      return platforms.map((plat) => {
                        const fallbackUrl = plat.toLowerCase() === 'facebook' 
                          ? 'https://www.facebook.com' 
                          : `https://${plat.toLowerCase()}.com`;
                        return renderCard(plat, selectedPostDetails.status, fallbackUrl)
                      });
                    }

                    return targets.map((target) => {
                      const linkPlatform = target.platform.toLowerCase();
                      const fallbackUrl = linkPlatform === 'facebook' 
                        ? 'https://www.facebook.com' 
                        : `https://${linkPlatform}.com`;
                      const destinationUrl = target.externalPostUrl || fallbackUrl;
                      return renderCard(target.platform, target.status.toLowerCase(), destinationUrl)
                    });
                  })()}
                </div>
              </div>

            </div>

            {/* Modal Bottom / ID */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--clr-border)', paddingTop: '16px', marginTop: '4px' }}>
              <span style={{ fontSize: 12, color: 'var(--clr-body-mid)', fontFamily: 'monospace' }}>
                Post ID: {selectedPostDetails.id}
              </span>
              <button
                type="button"
                className={styles.pageBtn}
                style={{ fontSize: 13, padding: '8px 16px', margin: 0 }}
                onClick={() => setSelectedPostDetails(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmPost && (
        (() => {
          const postPlatforms = Array.from(new Set(
            deleteConfirmPost.platforms?.length 
              ? deleteConfirmPost.platforms 
              : (deleteConfirmPost.platformTargets?.map(t => t.platform.toLowerCase()) || [])
          ));
          const hasUnsupported = postPlatforms.some(p => ['instagram', 'tiktok', 'snapchat'].includes(p.toLowerCase()));
          const formatPlatformName = (p: string) => {
            if (p === 'youtube') return 'YouTube';
            if (p === 'linkedin') return 'LinkedIn';
            if (p === 'gmb' || p === 'googlebusiness') return 'Google Business';
            return p.charAt(0).toUpperCase() + p.slice(1);
          };
          const platformsText = postPlatforms.map(formatPlatformName).join(', ') || 'platforms';
          const unsupportedPlatforms = postPlatforms.filter(p => ['instagram', 'tiktok', 'snapchat'].includes(p.toLowerCase()));

          const isAnyDeleting = isDeletingSyncraOnly || isDeletingPlatformOnly || isDeletingPlatformAndSyncra;

          return deleteConfirmPost.status === 'published' ? (
            <div className={styles.modalBackdrop} onClick={() => !isAnyDeleting && setDeleteConfirmPost(null)}>
              <div className={styles.publishedDeleteModal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.publishedDeleteHeader}>
                  <div className={styles.publishedDeleteTitleGroup}>
                    <Trash2 size={20} className={styles.publishedDeleteIcon} />
                    <h2>Delete post</h2>
                  </div>
                  <button onClick={() => !isAnyDeleting && setDeleteConfirmPost(null)} disabled={isAnyDeleting} className={styles.closeModalBtn}>
                    <X size={20} />
                  </button>
                </div>
                
                <p className={styles.publishedDeleteSubtext}>
                  Choose how you want to delete this post.
                </p>

                <div className={styles.deleteOptionsContainer}>
                  {/* Option 1: Delete from Syncra only */}
                  <button 
                    type="button" 
                    className={`${styles.deleteOptionCard} ${isAnyDeleting ? styles.deleteOptionCardDisabled : ''}`}
                    onClick={() => !isAnyDeleting && handleDeleteSyncraOnly(deleteConfirmPost)}
                    disabled={isAnyDeleting}
                  >
                    <div className={styles.optionIconSquare}>
                      {isDeletingSyncraOnly ? (
                        <div className={styles.optionSpinner} />
                      ) : (
                        <Trash2 size={20} />
                      )}
                    </div>
                    <div className={styles.optionTextStack}>
                      <span className={styles.optionTitle}>Delete from Syncra only</span>
                      <span className={styles.optionDescription}>
                        Remove from your Syncra dashboard. The post will remain live on {platformsText}.
                      </span>
                    </div>
                  </button>

                  {/* Option 2: Delete from platform only */}
                  <button 
                    type="button" 
                    className={`${styles.deleteOptionCard} ${hasUnsupported || isAnyDeleting ? styles.deleteOptionCardDisabled : ''}`}
                    onClick={() => !hasUnsupported && !isAnyDeleting && handleDeletePlatformOnly(deleteConfirmPost)}
                    disabled={hasUnsupported || isAnyDeleting}
                  >
                    <div className={styles.optionIconSquare}>
                      {isDeletingPlatformOnly ? (
                        <div className={styles.optionSpinner} />
                      ) : (
                        <Globe size={20} />
                      )}
                    </div>
                    <div className={styles.optionTextStack}>
                      <span className={styles.optionTitle}>Delete from platform only</span>
                      <span className={styles.optionDescription}>
                        Permanently delete from {platformsText}. The post will remain on your Syncra dashboard.
                      </span>
                      {unsupportedPlatforms.length > 0 && (
                        <div className={styles.unsupportedWarning}>
                          <AlertCircle size={14} />
                          <span>
                            {unsupportedPlatforms.map(formatPlatformName).join(', ')} {unsupportedPlatforms.length === 1 ? "doesn't" : "don't"} support deletion via API and will need to be removed manually.
                          </span>
                        </div>
                      )}
                    </div>
                  </button>

                  {/* Option 3: Delete from platform and Syncra */}
                  <button 
                    type="button" 
                    className={`${styles.deleteOptionCard} ${isAnyDeleting ? styles.deleteOptionCardDisabled : ''}`}
                    onClick={() => !isAnyDeleting && handleDeletePlatformAndSyncra(deleteConfirmPost)}
                    disabled={isAnyDeleting}
                  >
                    <div className={styles.optionIconSquare}>
                      {isDeletingPlatformAndSyncra ? (
                        <div className={styles.optionSpinner} />
                      ) : (
                        <Globe size={20} />
                      )}
                    </div>
                    <div className={styles.optionTextStack}>
                      <span className={styles.optionTitle}>Delete from platform and Syncra</span>
                      <span className={styles.optionDescription}>
                        Permanently delete from {platformsText} and remove from Syncra.
                      </span>
                      {unsupportedPlatforms.length > 0 && (
                        <div className={styles.unsupportedWarning}>
                          <AlertCircle size={14} />
                          <span>
                            {unsupportedPlatforms.map(formatPlatformName).join(', ')} {unsupportedPlatforms.length === 1 ? "doesn't" : "don't"} support deletion via API and will need to be removed manually.
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                </div>

                {/* Footer displaying target platforms */}
                <div className={styles.publishedDeleteFooter}>
                  {postPlatforms.map((plat) => (
                    <PlatformIcon key={plat} platform={plat as any} size={20} />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.modalBackdrop} onClick={() => !isDeletingSingle && setDeleteConfirmPost(null)}>
              <div className={styles.deleteConfirmModal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.deleteConfirmHeader}>
                  <Trash2 size={18} />
                  <h3>Delete post</h3>
                </div>
                <p className={styles.deleteConfirmText}>
                  Are you sure you want to delete this post? This action cannot be undone.
                </p>
                <div className={styles.deleteConfirmActions}>
                  <button
                    type="button"
                    className={styles.deleteConfirmCancelBtn}
                    onClick={() => setDeleteConfirmPost(null)}
                    disabled={isDeletingSingle}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={styles.deleteConfirmDeleteBtn}
                    onClick={() => handleDeleteSinglePost(deleteConfirmPost)}
                    disabled={isDeletingSingle}
                  >
                    {isDeletingSingle ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className={styles.buttonSpinner} />
                        <span>Deleting...</span>
                      </div>
                    ) : (
                      'Delete'
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })()
      )}
    </div>
  )
}
