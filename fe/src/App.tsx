import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { WorkspaceProvider } from './context/WorkspaceContext'
import { ToastProvider } from './context/ToastContext'
import type { ReactNode } from 'react'


import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Stats from './components/Stats'
import Features from './components/Features'
import HowItWorks from './components/HowItWorks'
import Pricing from './components/Pricing'
import Testimonials from './components/Testimonials'
import TrustBadges from './components/TrustBadges'
import Footer from './components/Footer'


import { CalendarProvider } from './context/CalendarContext'
import { RepurposeProvider } from './context/RepurposeContext'
import { CreatePostModalProvider } from './context/createPostModalContext'
import AppLayout from './pages/app/AppLayout'
import DashboardPage from './pages/app/DashboardPage'
import IdeasPage from './pages/app/IdeasPage'
import CalendarPage from './pages/app/CalendarPage'
import RepurposePage from './pages/app/RepurposePage'
import AnalyticsPage from './pages/app/AnalyticsPage'
import TrendRadarPage from './pages/app/TrendRadarPage'
import SettingsPage from './pages/app/SettingsPage'
import HelpPage from './pages/app/HelpPage'
import WorkspacesPage from './pages/app/WorkspacesPage'

function Homepage() {
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
    </div>
  )
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return null
  }

  return user ? <>{children}</> : <Navigate to="/" replace />
}

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <Homepage />,
    },
    {
      path: '/app',
      element: (
        <ProtectedRoute>
          <WorkspaceProvider>
            <CalendarProvider>
              <RepurposeProvider>
                <CreatePostModalProvider>
                  <AppLayout />
                </CreatePostModalProvider>
              </RepurposeProvider>
            </CalendarProvider>
          </WorkspaceProvider>
        </ProtectedRoute>
      ),
      children: [
        { index: true, element: <Navigate to="dashboard" replace /> },
        { path: 'dashboard', element: <DashboardPage /> },
        { path: 'ideas', element: <IdeasPage /> },
        { path: 'calendar', element: <CalendarPage /> },
        { path: 'analytics', element: <AnalyticsPage /> },
        { path: 'trends', element: <TrendRadarPage /> },
        { path: 'repurpose', element: <RepurposePage /> },
        { path: 'settings', element: <SettingsPage /> },
        { path: 'workspaces', element: <WorkspacesPage /> },
        { path: 'help', element: <HelpPage /> },
      ],
    },
    { path: '*', element: <Navigate to="/" replace /> },
  ],
  { basename: '/Syncra' },
)

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AuthProvider>
  )
}

export default App