import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, Badge } from 'flowbite-react';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link to="/" className="flex items-center">
              <span className="text-2xl mr-2">🌊</span>
              <span className="text-xl font-bold text-gray-900">
                Seawater<span className="text-seawater-600">.io</span>
              </span>
            </Link>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">Features</a>
              <a href="#demo" className="text-gray-600 hover:text-gray-900 transition-colors">Demo</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">Pricing</a>
              <a href="#contact" className="text-gray-600 hover:text-gray-900 transition-colors">Contact</a>
              <Button as={Link} to="/login" color="blue" size="sm">
                Get Started
              </Button>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-seawater-50 to-blue-100 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <Badge color="blue" className="mb-8 text-sm font-medium">
              🌊 Trusted by 10,000+ early adopters
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Know Your Climate Risk<br />
              <span className="text-seawater-600">Before You Choose</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Make climate-smart decisions for any location. Whether buying, renting, vacationing, or investing - 
              get comprehensive flood, wildfire, heat, and hurricane risk data for any US address with real government data.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button as={Link} to="/register" size="xl" color="blue" className="font-medium">
                Join 10,000+ on Waitlist
              </Button>
              <Button 
                onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
                size="xl" 
                color="light" 
                className="font-medium"
              >
                See Live Demo ↓
              </Button>
            </div>
            <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-600">
              <div className="flex items-center bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full">
                <span className="mr-2">💰</span>
                <span>Free basic reports</span>
              </div>
              <div className="flex items-center bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full">
                <span className="mr-2">⚡</span>
                <span>Instant analysis</span>
              </div>
              <div className="flex items-center bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full">
                <span className="mr-2">📊</span>
                <span>Multi-source data</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Demo Section */}
      <section id="demo" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              🚀 Live Climate Risk Platform
            </h2>
            <p className="text-xl text-gray-600">
              Our backend is live! Try the real climate risk assessment API.
            </p>
          </div>
          
          <div className="max-w-2xl mx-auto">
            <Card className="shadow-xl">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Test Location Risk Assessment</h3>
                  <p className="text-gray-600">
                    Enter any US address to get real climate risk data - perfect for home shopping, vacation planning, or business decisions:
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                      Address or Location
                    </label>
                    <input 
                      id="address"
                      type="text" 
                      placeholder="Enter address (e.g., 123 Main St, Miami, FL) or vacation destination"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-seawater-500 focus:border-seawater-500 transition-colors"
                    />
                  </div>
                  <Button 
                    as={Link}
                    to="/assessment"
                    size="lg" 
                    color="blue" 
                    className="w-full font-medium"
                  >
                    🔍 Analyze Climate Risk
                  </Button>
                </div>
                
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center mb-2">
                    <span className="text-green-600 mr-2">✅</span>
                    <span className="text-green-800 font-medium">Backend API Live</span>
                  </div>
                  <p className="text-green-700 text-sm">
                    Connected to production database with real FEMA climate data sources
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Perfect For Every Location Decision
            </h2>
            <p className="text-xl text-gray-600">
              Whether you're buying, renting, vacationing, or investing - make climate-informed choices
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: '🏠',
                title: 'Home Buying & Renting',
                description: 'Assess climate risks before purchasing or renting. Know flood zones, wildfire danger, and extreme weather patterns for any property.',
                color: 'blue'
              },
              {
                icon: '🏖️',
                title: 'Vacation Planning',
                description: 'Plan safer trips by checking destination climate risks. Avoid hurricane seasons, wildfire zones, and extreme weather periods.',
                color: 'green'
              },
              {
                icon: '💼',
                title: 'Business Location',
                description: 'Evaluate climate risks for business expansion, office relocation, or supply chain decisions with comprehensive risk data.',
                color: 'purple'
              },
              {
                icon: '💰',
                title: 'Investment Analysis',
                description: 'Make informed real estate investments by understanding long-term climate risks that could impact property values.',
                color: 'orange'
              },
              {
                icon: '📊',
                title: 'Government Data',
                description: 'Access official FEMA, USGS, and NOAA climate data - the same sources used by emergency planners and insurance companies.',
                color: 'teal'
              },
              {
                icon: '⚡',
                title: 'Instant Insights',
                description: 'Get comprehensive climate risk reports in seconds for any US address. No waiting, no complicated forms.',
                color: 'pink'
              }
            ].map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-xl transition-shadow duration-300">
                <div className={`text-4xl mb-4 p-4 rounded-full bg-${feature.color}-50 w-fit mx-auto`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-1">
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-2">🌊</span>
                <span className="text-xl font-bold text-white">
                  Seawater<span className="text-seawater-400">.io</span>
                </span>
              </div>
              <p className="text-gray-400 text-sm">
                Navigate rising risks with comprehensive climate data.
              </p>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                <li><a href="#features" className="text-gray-400 hover:text-white transition-colors">Features</a></li>
                <li><a href="#demo" className="text-gray-400 hover:text-white transition-colors">Demo</a></li>
                <li><a href="#pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li><a href="#about" className="text-gray-400 hover:text-white transition-colors">About</a></li>
                <li><a href="#contact" className="text-gray-400 hover:text-white transition-colors">Contact</a></li>
                <li><a href="#careers" className="text-gray-400 hover:text-white transition-colors">Careers</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><a href="#privacy" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#terms" className="text-gray-400 hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-700 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-gray-400 text-sm mb-4 md:mb-0">
                © 2025 Seawater.io - Navigate Rising Risks
              </div>
              <div className="flex space-x-6">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">🐦</a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">💼</a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">📧</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;