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
import DashboardPage from './pages/app/DashboardPage'
import IdeasPage from './pages/app/IdeasPage'
import MediaLibraryPage from './pages/app/MediaLibraryPage'
import CalendarPage from './pages/app/CalendarPage'
import RepurposePage from './pages/app/RepurposePage'
import AnalyticsPage from './pages/app/AnalyticsPage'
import TrendRadarPage from './pages/app/TrendRadarPage'
import SettingsPage from './pages/app/SettingsPage'
import HelpPage from './pages/app/HelpPage'
import InboxPage from './pages/inbox/InboxPage'

import { useNavigate } from 'react-router-dom'
import LoginModal from './components/auth/LoginModal'
import SignupModal from './components/auth/SignupModal'
import OAuthCallbackPage from './pages/OAuthCallbackPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import SocialAccountsSelect from './pages/Settings/SocialAccountsSelect'


import ConnectionsPage from './pages/app/ConnectionsPage'
import PostsOverviewPage from './pages/app/PostsOverviewPage'
import PostsQueuesPage from './pages/app/PostsQueuesPage'


function Homepage() {
  const location = useLocation()
  const navigate = useNavigate()
  const isLoginOpen = location.pathname === '/login'
  const isSignupOpen = location.pathname === '/signup'

  const handleCloseLogin = () => {
    navigate('/')
  }

  const handleLoginSuccess = () => {
    navigate('/app/connections')
  }

  const handleCloseSignup = () => {
    navigate('/')
  }

  const handleSignupSuccess = () => {
    navigate('/app/connections')
  }

  return (
    <div style={{ position: 'relative' }}>
      <Navbar />
      <Hero />
      <Stats />
      <Features />
      <HowItWorks />
      <Pricing />
      <Testimonials />
      <TrustBadges />
      <Footer />
      
      {isLoginOpen && (
        <LoginModal 
          onClose={handleCloseLogin} 
          onSuccess={handleLoginSuccess} 
        />
      )}
      
      {isSignupOpen && (
        <SignupModal 
          onClose={handleCloseSignup} 
          onSuccess={handleSignupSuccess} 
        />
      )}
    </div>
  )
}

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.key}>
        <Route path="/" element={<PageWrapper><Homepage /></PageWrapper>} />
        <Route path="/login" element={<PageWrapper><Homepage /></PageWrapper>} />
        <Route path="/signup" element={<PageWrapper><Homepage /></PageWrapper>} />
        <Route path="/auth/google/callback" element={<OAuthCallbackPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/social-accounts/select" element={<SocialAccountsSelect />} />

        
        <Route path="/app" element={
          <ProtectedRoute>
            <BillingProvider>
              <CalendarProvider>
                <RepurposeProvider>
                  <CreatePostModalProvider>
                    <AppLayout />
                  </CreatePostModalProvider>
                </RepurposeProvider>
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
          <Route path="media" element={<PageWrapper><MediaLibraryPage /></PageWrapper>} />
          <Route path="calendar" element={<PageWrapper><CalendarPage /></PageWrapper>} />
          <Route path="analytics" element={<PageWrapper><AnalyticsPage /></PageWrapper>} />
          <Route path="trends" element={<PageWrapper><TrendRadarPage /></PageWrapper>} />
          <Route path="repurpose" element={<PageWrapper><RepurposePage /></PageWrapper>} />
          <Route path="settings" element={<PageWrapper><SettingsPage /></PageWrapper>} />
          <Route path="inbox" element={<PageWrapper><InboxPage /></PageWrapper>} />
          <Route path="help" element={<PageWrapper><HelpPage /></PageWrapper>} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <WorkspaceProvider>
            <BrowserRouter basename="/Syncra/">
              <AnimatedRoutes />
            </BrowserRouter>
          </WorkspaceProvider>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
