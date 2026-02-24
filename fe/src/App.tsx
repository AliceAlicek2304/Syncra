import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

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
import AppLayout from './pages/app/AppLayout'
import DashboardPage from './pages/app/DashboardPage'
import AIAssistantPage from './pages/app/AIAssistantPage'
import CalendarPage from './pages/app/CalendarPage'
import AnalyticsPage from './pages/app/AnalyticsPage'
import SettingsPage from './pages/app/SettingsPage'

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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
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
          <AppLayout />
        </ProtectedRoute>
      ),
      children: [
        { index: true, element: <Navigate to="dashboard" replace /> },
        { path: 'dashboard', element: <DashboardPage /> },
        { path: 'ai', element: <AIAssistantPage /> },
        { path: 'calendar', element: <CalendarPage /> },
        { path: 'analytics', element: <AnalyticsPage /> },
        { path: 'settings', element: <SettingsPage /> },
      ],
    },
    { path: '*', element: <Navigate to="/" replace /> },
  ],
  { basename: '/TechNest' },
)

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}

export default App
