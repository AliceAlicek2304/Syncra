import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'

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
import CalendarPage from './pages/app/CalendarPage'
import RepurposePage from './pages/app/RepurposePage'
import AnalyticsPage from './pages/app/AnalyticsPage'
import TrendRadarPage from './pages/app/TrendRadarPage'
import SettingsPage from './pages/app/SettingsPage'
import HelpPage from './pages/app/HelpPage'

import { useLocation, useNavigate } from 'react-router-dom'
import LoginModal from './components/auth/LoginModal'

function Homepage() {
  const location = useLocation()
  const navigate = useNavigate()
  const isLoginOpen = location.pathname === '/login'

  const handleCloseLogin = () => {
    navigate('/')
  }

  const handleLoginSuccess = () => {
    navigate('/app/dashboard')
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
    </div>
  )
}

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <Homepage />,
    },
    {
      path: '/login',
      element: <Homepage />,
    },
    {
      path: '/app',
      element: (
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
      ),
      children: [
        { index: true, element: <Navigate to="dashboard" replace /> },
        { path: 'dashboard', element: <DashboardPage /> },
        { path: 'ideas', element: <IdeasPage /> },
        { path: 'media', element: <MediaLibraryPage /> },
        { path: 'calendar', element: <CalendarPage /> },
        { path: 'analytics', element: <AnalyticsPage /> },
        { path: 'trends', element: <TrendRadarPage /> },
        { path: 'repurpose', element: <RepurposePage /> },
        { path: 'settings', element: <SettingsPage /> },
        { path: 'help', element: <HelpPage /> },
      ],
    },
    { path: '*', element: <Navigate to="/" replace /> },
  ],
  { basename: '/Syncra/' },
)

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <WorkspaceProvider>
            <RouterProvider router={router} />
          </WorkspaceProvider>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default Apppp