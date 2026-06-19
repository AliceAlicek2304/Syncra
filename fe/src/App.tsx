import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import { AnimatePresence } from 'framer-motion'
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
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './pages/app/AppLayout'
import IdeasPage from './pages/app/IdeasPage'
import RepurposePage from './pages/app/RepurposePage'
import AnalyticsPage from './pages/app/AnalyticsPage'
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
import SePayCheckoutPage from './pages/app/SePayCheckoutPage'


function Homepage() {
  useEffect(() => {
    // Add light theme classes and style overrides to document body for the landing page
    document.body.classList.add('bg-brand-canvas-soft', 'text-brand-ink');
    document.body.style.backgroundColor = '#f8f4f0';
    document.body.style.color = '#201515';
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

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageWrapper><Homepage /></PageWrapper>} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/auth/google/callback" element={<OAuthCallbackPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/social-accounts/select" element={<SocialAccountsSelect />} />


        <Route path="/app" element={
          <ProtectedRoute>
            <BillingProvider>
              <CalendarProvider>
                <CreatePostModalProvider>
                  <AppLayout />
                </CreatePostModalProvider>
              </CalendarProvider>
            </BillingProvider>
          </ProtectedRoute>
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
          <Route path="settings" element={<PageWrapper><SettingsPage /></PageWrapper>} />
          <Route path="sepay-checkout" element={<PageWrapper><SePayCheckoutPage /></PageWrapper>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        const status = error?.response?.status;
        if (status >= 400 && status < 500) return false;
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
