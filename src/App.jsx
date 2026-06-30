import React, { useState, useEffect } from 'react';
import {
  LineChart,
  ArrowRight,
  Menu,
  X
} from 'lucide-react';
import asset1 from './assets/asset1.svg';
import asset2 from './assets/asset2.svg';
import asset3 from './assets/asset3.svg';
import asset4 from './assets/asset4.svg';
import './index.css';

// Mock Ticker Data
const tickerItems = [
  { symbol: 'BTC/USD', price: '64,230.50', change: '+2.4%', up: true },
  { symbol: 'ETH/USD', price: '3,450.20', change: '+1.8%', up: true },
  { symbol: 'SOL/USD', price: '145.60', change: '-0.5%', up: false },
  { symbol: 'EUR/USD', price: '1.0850', change: '+0.1%', up: true },
  { symbol: 'GBP/USD', price: '1.2640', change: '-0.2%', up: false },
  { symbol: 'GOLD', price: '2,350.10', change: '+0.8%', up: true },
  { symbol: 'AAPL', price: '185.40', change: '+1.2%', up: true },
  { symbol: 'TSLA', price: '175.20', change: '-1.5%', up: false },
];

const App = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* Navbar */}
      <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
        <div className="container">
          <a href="#" className="logo">
            <img src={asset4} alt="Newxool Traders Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
            newxool<span>traders</span>
          </a>

          <div className="nav-links">
            <a href="#markets" className="nav-link">Markets</a>
            <a href="#features" className="nav-link">Features</a>
            <a href="#about" className="nav-link">About Us</a>
            <a href="#reviews" className="nav-link">Reviews</a>
            <a href="#login" className="btn btn-secondary" style={{ padding: '8px 20px', fontSize: '0.9rem' }}>Log In</a>
            <a href="#signup" className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '0.9rem' }}>Get Started</a>
          </div>

          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ display: 'none' }}>
            {mobileMenuOpen ? <X color="#fff" /> : <Menu color="#fff" />}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1 className="heading-xl">
              <span className="animated-text-shimmer">Next-Gen Trading,</span> <br />
              <span style={{ color: '#000000' }}>Powered by Deriv</span>
            </h1>
            <p className="text-lead" style={{ color: '#ffffff' }}>
              Experience the ultimate trading platform with ultra-low latency, institutional-grade security, and access to global markets. Trade forex, crypto, synthetics, and more with Newxool Traders.
            </p>
            <div className="hero-actions">
              <a href="#start" className="btn btn-primary">
                Start Trading Now <ArrowRight size={18} style={{ marginLeft: '8px' }} />
              </a>
              <a href="#demo" className="btn btn-secondary">
                Try Free Demo
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Market Ticker */}
      <div className="ticker-wrapper">
        <div className="ticker-content">
          {[...tickerItems, ...tickerItems].map((item, index) => (
            <div className="ticker-item" key={index}>
              <span className="ticker-symbol">{item.symbol}</span>
              <span className="ticker-price">${item.price}</span>
              <span className={`ticker-change ${item.up ? 'up' : 'down'}`}>
                {item.up ? '▲' : '▼'} {item.change}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Features Bento Grid */}
      <section id="features" className="section">
        <div className="dark-energy-bg"></div>
        <div className="container">
          <h2 className="heading-lg" style={{ textAlign: 'center' }}>
            Built for <span className="text-gradient">Performance</span>
          </h2>
          <p className="text-lead" style={{ textAlign: 'center', marginBottom: '40px' }}>
            Everything you need to execute your strategy with precision.
          </p>

          <div className="bento-grid">
            <div className="bento-item bento-span-8">
              <div className="bento-item-bg"></div>
              <div className="bento-icon"><img src={asset1} alt="Lightning-Fast" /></div>
              <h3 className="heading-md">Lightning-Fast Execution</h3>
              <p className="text-secondary">
                Our infrastructure is optimized for speed. Execute trades in milliseconds with direct market access and no dealing desk intervention.
              </p>
            </div>

            <div className="bento-item bento-span-4">
              <div className="bento-item-bg"></div>
              <div className="bento-icon"><img src={asset2} alt="Security" /></div>
              <h3 className="heading-md">Bank-Grade Security</h3>
              <p className="text-secondary">
                Your funds are kept in segregated accounts with top-tier banks. We employ military-grade encryption to protect your data.
              </p>
            </div>

            <div className="bento-item bento-span-4">
              <div className="bento-item-bg"></div>
              <div className="bento-icon"><img src={asset3} alt="Global Markets" /></div>
              <h3 className="heading-md">Global Markets</h3>
              <p className="text-secondary">
                Access over 100+ instruments across forex, commodities, cryptocurrencies, and Deriv's exclusive synthetic indices.
              </p>
            </div>

            <div className="bento-item bento-span-8">
              <div className="bento-item-bg"></div>
              <div className="bento-icon"><img src={asset4} alt="Analytics" /></div>
              <h3 className="heading-md">Advanced Analytics</h3>
              <p className="text-secondary">
                Make informed decisions with our suite of professional charting tools, custom indicators, and real-time market sentiment data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section id="reviews" className="section" style={{ background: 'var(--bg-secondary)' }}>
        <div className="container">
          <h2 className="heading-lg" style={{ textAlign: 'center' }}>
            Trusted by <span className="text-gradient">Traders Worldwide</span>
          </h2>

          <div className="reviews-grid">
            {[
              { name: "Alex Mercer", role: "Day Trader", review: "The execution speed on Newxool Traders is unmatched. Switching from my old broker was the best decision for my scalping strategy.", rating: "★★★★★" },
              { name: "Sarah Jenkins", role: "Crypto Enthusiast", review: "I love the clean, dark interface. It doesn't strain my eyes during long sessions, and the integration with Deriv synthetics is seamless.", rating: "★★★★★" },
              { name: "David Chen", role: "Swing Trader", review: "Withdrawals are instantaneous. The advanced charting tools give me everything I need without needing external software.", rating: "★★★★☆" }
            ].map((review, i) => (
              <div className="card review-card" key={i}>
                <div className="stars">{review.rating}</div>
                <p className="text-secondary" style={{ fontStyle: 'italic' }}>"{review.review}"</p>
                <div className="review-header">
                  <div className="reviewer-img" style={{ background: `linear-gradient(45deg, var(--purple-main), #222)` }}></div>
                  <div className="reviewer-info">
                    <h4>{review.name}</h4>
                    <p>{review.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section">
        <div className="container">
          <div className="cta-box">
            <h2 className="heading-xl">Ready to elevate your trading?</h2>
            <p className="text-lead" style={{ marginBottom: '32px' }}>
              Join thousands of traders who have already made the switch. Open your account in under 3 minutes.
            </p>
            <div className="hero-actions" style={{ marginTop: 0 }}>
              <button className="btn btn-primary" style={{ padding: '16px 32px', fontSize: '1.1rem' }}>
                Create Free Account
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <a href="#" className="logo">
                <img src={asset4} alt="Newxool Traders Logo" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                newxool<span>traders</span>
              </a>
              <p>Redefining the trading experience with cutting-edge technology and institutional-level access.</p>
            </div>

            <div className="footer-links">
              <h4>Markets</h4>
              <ul>
                <li><a href="#">Forex</a></li>
                <li><a href="#">Cryptocurrencies</a></li>
                <li><a href="#">Synthetic Indices</a></li>
                <li><a href="#">Commodities</a></li>
              </ul>
            </div>

            <div className="footer-links">
              <h4>Platform</h4>
              <ul>
                <li><a href="#">Web Trader</a></li>
                <li><a href="#">Mobile App</a></li>
                <li><a href="#">API Documentation</a></li>
                <li><a href="#">System Status</a></li>
              </ul>
            </div>

            <div className="footer-links">
              <h4>Company</h4>
              <ul>
                <li><a href="#">About Us</a></li>
                <li><a href="#">Contact Support</a></li>
                <li><a href="#">Careers</a></li>
                <li><a href="#">Legal & Privacy</a></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} Newxool Traders. All rights reserved.</p>
            <p>Powered by Deriv API</p>
          </div>
        </div>
      </footer>
    </>
  );
};

export default App;
