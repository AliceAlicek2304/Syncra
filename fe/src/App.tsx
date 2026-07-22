import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/AuthContext'
import { PageWrapper } from './components/PageWrapper'

// Homepage components
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Stats from './components/Stats'
import Features from './components/Features'
import HowItWorks from './components/HowItWorks'
import Pricing from './components/Pricing'
import Testimonials from './components/Testimonials'
import TrustBadges from './components/TrustBadges'
import Footer from './components/Footer'

// App pages
import { CalendarProvider } from './context/CalendarContext'
import { RepurposeProvider } from './context/RepurposeContext'
import { CreatePostModalProvider } from './context/createPostModalContext'
import { BillingProvider } from './context/BillingContext'
import { WorkspaceProvider } from './context/WorkspaceContext'
import { ToastProvider } from './context/ToastContext'
import AppLayout from './pages/app/AppLayout'
import IdeasPage from './pages/app/IdeasPage'
import RepurposePage from './pages/app/RepurposePage'
import AnalyticsPage from './pages/app/AnalyticsPage'
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/DashboardV2'
import AdminUserGrowth from './pages/admin/UserGrowthV2'
import PostAnalytics from './pages/admin/PostAnalyticsV2'
import RevenueAnalytics from './pages/admin/RevenueAnalyticsV2'
import VoucherManagement from './pages/admin/VoucherManagement'
import RealtimeMetrics from './pages/admin/RealtimeMetrics'
import TrendRadarPage from './pages/app/TrendRadarPage'
import HelpPage from './pages/app/HelpPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import OAuthCallbackPage from './pages/OAuthCallbackPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import SocialAccountsSelect from './pages/Settings/SocialAccountsSelect'


import ConnectionsPage from './pages/app/ConnectionsPage'
import PostsOverviewPage from './pages/app/PostsOverviewPage'
import PostsQueuesPage from './pages/app/PostsQueuesPage'
import MessagesPage from './pages/app/MessagesPage'
import CommentsPage from './pages/app/CommentsPage'
import SettingsPage from './pages/app/SettingsPage'
import BillingPage from './pages/app/BillingPage'
import StudentPage from './pages/app/StudentPage'
import SePayCheckoutPage from './pages/app/SePayCheckoutPage'
import { adminApi } from './api/admin'

type HttpErrorLike = {
  response?: {
    status?: number
  }
}

interface AdminGuardProps {
  children: ReactNode
}

interface UserAppGuardProps {
  children: ReactNode
}

function Homepage() {
  useEffect(() => {
    // Add light theme classes and style overrides to document body for the landing page
    document.body.classList.add('bg-brand-canvas-soft', 'text-brand-ink');
    document.body.style.backgroundColor = '#f8f1fb';
    document.body.style.color = '#211329';
    document.body.style.backgroundImage = 'none';

    return () => {
      // Clean up when unmounting (navigating into the app)
      document.body.classList.remove('bg-brand-canvas-soft', 'text-brand-ink');
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
      document.body.style.backgroundImage = '';
    };
  }, []);

  return (
    <div className="relative bg-brand-canvas-soft text-brand-ink min-h-screen font-sans antialiased selection:bg-brand-primary/20 selection:text-brand-primary">
      <Navbar />
      <Hero />
      <Stats />
      <Features />
      <HowItWorks />
      <Pricing />
      <Testimonials />
      <TrustBadges />
      <Footer />
    </div>
  )
}

const AdminGuard = ({ children }: AdminGuardProps) => {
  const { user, loading } = useAuth()
  const [accessCheck, setAccessCheck] = useState<{ userId: string; allowed: boolean } | null>(null)

  useEffect(() => {
    if (loading) return

    if (!user) {
      return
    }

    let cancelled = false
    adminApi
      .checkAccess()
      .then(() => {
        if (!cancelled) setAccessCheck({ userId: user.userId, allowed: true })
      })
      .catch(() => {
        if (!cancelled) setAccessCheck({ userId: user.userId, allowed: false })
      })

    return () => {
      cancelled = true
    }
  }, [loading, user])

  const currentAccess = user && accessCheck && accessCheck.userId === user.userId ? accessCheck.allowed : null

  if (loading || (user && currentAccess === null)) return null
  if (!user) return <Navigate to="/login" replace />
  if (!currentAccess) return <Navigate to="/app/connections" replace />

  return <>{children}</>
}

const UserAppGuard = ({ children }: UserAppGuardProps) => {
  const { user, loading } = useAuth()
  const [adminCheck, setAdminCheck] = useState<{ userId: string; isAdmin: boolean } | null>(null)

  useEffect(() => {
    if (loading) return

    if (!user) {
      return
    }

    let cancelled = false
    adminApi
      .checkAccess()
      .then(() => {
        if (!cancelled) setAdminCheck({ userId: user.userId, isAdmin: true })
      })
      .catch(() => {
        if (!cancelled) setAdminCheck({ userId: user.userId, isAdmin: false })
      })

    return () => {
      cancelled = true
    }
  }, [loading, user])

  const currentIsAdmin = user && adminCheck && adminCheck.userId === user.userId ? adminCheck.isAdmin : null

  if (loading || (user && currentIsAdmin === null)) return null
  if (!user) return <Navigate to="/login" replace />
  if (currentIsAdmin) return <Navigate to="/admin" replace />

  return <>{children}</>
}

function AnimatedRoutes() {
  const location = useLocation()

  return (
      <Routes location={location}>
        <Route path="/admin" element={
          <AdminGuard>
            <AdminLayout />
          </AdminGuard>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUserGrowth />} />
          <Route path="posts" element={<PostAnalytics />} />
          <Route path="revenue" element={<RevenueAnalytics />} />
          <Route path="vouchers" element={<VoucherManagement />} />
          <Route path="realtime" element={<RealtimeMetrics />} />
        </Route>
        <Route path="/" element={<PageWrapper><Homepage /></PageWrapper>} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/auth/google/callback" element={<OAuthCallbackPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/social-accounts/select" element={<SocialAccountsSelect />} />


        <Route path="/app" element={
          <UserAppGuard>
            <BillingProvider>
              <CalendarProvider>
                <CreatePostModalProvider>
                  <AppLayout />
                </CreatePostModalProvider>
              </CalendarProvider>
            </BillingProvider>
          </UserAppGuard>
        }>
          <Route index element={<Navigate to="connections" replace />} />
          <Route path="dashboard" element={<Navigate to="/app/connections" replace />} />
          <Route path="connections" element={<PageWrapper><ConnectionsPage /></PageWrapper>} />
          <Route path="posts-all" element={<PageWrapper><PostsOverviewPage /></PageWrapper>} />
          <Route path="posts/overview" element={<Navigate to="/app/posts-all" replace />} />
          <Route path="posts/queues" element={<PageWrapper><PostsQueuesPage /></PageWrapper>} />
          <Route path="ideas" element={<PageWrapper><IdeasPage /></PageWrapper>} />
          <Route path="calendar" element={<Navigate to="/app/posts-all?view=calendar" replace />} />
          <Route path="analytics" element={<PageWrapper><AnalyticsPage /></PageWrapper>} />
          <Route path="trends" element={<PageWrapper><TrendRadarPage /></PageWrapper>} />
          <Route path="repurpose" element={<RepurposeProvider><PageWrapper><RepurposePage /></PageWrapper></RepurposeProvider>} />
          <Route path="help" element={<PageWrapper><HelpPage /></PageWrapper>} />
          <Route path="inbox/messages" element={<PageWrapper><MessagesPage /></PageWrapper>} />
          <Route path="inbox/comments" element={<PageWrapper><CommentsPage /></PageWrapper>} />
          <Route path="billing" element={<PageWrapper><BillingPage /></PageWrapper>} />
          <Route path="student" element={<PageWrapper><StudentPage /></PageWrapper>} />
          <Route path="settings" element={<PageWrapper><SettingsPage /></PageWrapper>} />
          <Route path="sepay-checkout" element={<PageWrapper><SePayCheckoutPage /></PageWrapper>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
  )
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: Error) => {
        const status = (error as HttpErrorLike).response?.status;
        if (typeof status === 'number' && status >= 400 && status < 500) return false;
        return failureCount < 1;
      },
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <WorkspaceProvider>
            <BrowserRouter basename="/">
              <AnimatedRoutes />
            </BrowserRouter>
          </WorkspaceProvider>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
