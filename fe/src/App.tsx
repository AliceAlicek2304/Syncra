import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Stats from './components/Stats'
import Features from './components/Features'
import HowItWorks from './components/HowItWorks'
import Pricing from './components/Pricing'
import Testimonials from './components/Testimonials'
import TrustBadges from './components/TrustBadges'
import Footer from './components/Footer'

function App() {
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

export default App
