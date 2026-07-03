import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import asset1 from '../assets/asset1.svg';
import asset2 from '../assets/asset2.svg';
import asset3 from '../assets/asset3.svg';
import CandlestickChart from '../CandlestickChart';
import LiveChart from '../components/LiveChart';
import LiveTicker from '../components/LiveTicker';
import Navbar from '../components/Navbar';
import SetupBanner from '../components/SetupBanner';
import AuthCTA from '../components/AuthCTA';
import { useAuth } from '../hooks/useAuth';
import { getFriendlyAuthError } from '../lib/authErrors';
import { Link } from 'react-router-dom';

export default function Landing() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const authError = getFriendlyAuthError(searchParams.get('error'));

  useEffect(() => {
    const raw = searchParams.get('error');
    if (raw && import.meta.env.DEV) console.error('Auth error:', raw);
  }, [searchParams]);

  return (
    <>
      <Navbar variant="landing" />

      <SetupBanner />

      {authError && (
        <div className="auth-error-banner">
          {authError}
        </div>
      )}

      <section className="hero" style={{ position: 'relative', overflow: 'hidden' }}>
        <CandlestickChart numCandles={40} isBackground={true} />
        <div className="container">
          <div className="hero-content">
            <h1 className="heading-xl">
              <span className="animated-text-shimmer">Next-Gen Trading,</span> <br />
              <span style={{ color: '#000000' }}>Powered by Deriv</span>
            </h1>
            <p className="text-lead" style={{ color: '#ffffff' }}>
              Experience the ultimate trading platform with ultra-low latency, institutional-grade security, and access to global markets. Trade forex, crypto, synthetics, and more with Newxool Traders.
            </p>
            <AuthCTA variant="hero" />
          </div>
        </div>
      </section>

      <LiveTicker />

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
                Access over 100+ instruments across forex, commodities, cryptocurrencies, and Deriv&apos;s exclusive synthetic indices.
              </p>
            </div>

            <div className="bento-item bento-span-8">
              <div className="bento-item-bg"></div>
              <div className="live-chart-compact" style={{ marginBottom: '20px' }}>
                <LiveChart symbol="1HZ100V" height={150} />
              </div>
              <h3 className="heading-md">Advanced Analytics</h3>
              <p className="text-secondary">
                Make informed decisions with our suite of professional charting tools, custom indicators, and real-time market sentiment data.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="reviews" className="section" style={{ background: 'var(--bg-secondary)' }}>
        <div className="container">
          <h2 className="heading-lg" style={{ textAlign: 'center' }}>
            Trusted by <span className="text-gradient">Traders Worldwide</span>
          </h2>

          <div className="reviews-grid">
            {[
              { name: 'Alex Mercer', role: 'Day Trader', review: 'The execution speed on Newxool Traders is unmatched. Switching from my old broker was the best decision for my scalping strategy.', rating: '★★★★★' },
              { name: 'Sarah Jenkins', role: 'Crypto Enthusiast', review: "I love the clean, dark interface. It doesn't strain my eyes during long sessions, and the integration with Deriv synthetics is seamless.", rating: '★★★★★' },
              { name: 'David Chen', role: 'Swing Trader', review: 'Withdrawals are instantaneous. The advanced charting tools give me everything I need without needing external software.', rating: '★★★★☆' },
            ].map((review, i) => (
              <div className="card review-card" key={i}>
                <div className="stars">{review.rating}</div>
                <p className="text-secondary" style={{ fontStyle: 'italic' }}>&quot;{review.review}&quot;</p>
                <div className="review-header">
                  <div className="reviewer-img" style={{ background: 'linear-gradient(45deg, var(--purple-main), #222)' }}></div>
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

      <section className="section">
        <div className="container">
          <div className="cta-box">
            <h2 className="heading-xl">Ready to elevate your trading?</h2>
            <p className="text-lead" style={{ marginBottom: '32px' }}>
              Join thousands of traders who have already made the switch. Deposits are handled securely on Deriv — we never hold your funds.
            </p>
            <AuthCTA variant="footer" layout="stack" />
            <p className="text-muted" style={{ marginTop: '16px', fontSize: '0.85rem' }}>
              <a href="https://deriv.com" target="_blank" rel="noopener noreferrer">Deposit on Deriv</a> using EcoCash, cards, crypto, and more.
            </p>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <p>Redefining the trading experience with cutting-edge technology and institutional-level access.</p>
            </div>
            <div className="footer-links">
              <h4>Platform</h4>
              <ul>
                <li>
                  {user?.authenticated ? (
                    <Link to="/trade">Web Trader</Link>
                  ) : (
                    <Link to="/login">Web Trader</Link>
                  )}
                </li>
                <li><Link to="/login">Log In</Link></li>
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
}
