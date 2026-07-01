import React, { useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import asset1 from '../assets/asset1.svg';
import asset2 from '../assets/asset2.svg';
import asset3 from '../assets/asset3.svg';
import CandlestickChart from '../CandlestickChart';
import Navbar from '../components/Navbar';
import SetupBanner from '../components/SetupBanner';
import { authUrls } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { useSetupStatus } from '../hooks/useSetupStatus';

const tickerItems = [
  { symbol: 'Volatility 100', price: 'Live', change: 'Deriv', up: true },
  { symbol: 'Volatility 75', price: 'Live', change: 'Deriv', up: true },
  { symbol: 'EUR/USD', price: 'Live', change: 'Deriv', up: true },
  { symbol: 'BTC/USD', price: 'Live', change: 'Deriv', up: true },
];

export default function Landing() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { setup } = useSetupStatus();
  const authError = searchParams.get('error');
  const oauthReady = setup?.oauthReady ?? false;
  const patReady = setup?.patReady ?? false;

  useEffect(() => {
    if (authError) {
      console.error('Auth error:', authError);
    }
  }, [authError]);

  return (
    <>
      <Navbar variant="landing" />

      <SetupBanner />

      {authError && (
        <div className="auth-error-banner">
          Sign in failed: {authError}. Please try again.
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
            <div className="hero-actions">
              {user?.authenticated ? (
                <Link to="/trade" className="btn btn-primary">
                  Open Trader <ArrowRight size={18} style={{ marginLeft: '8px' }} />
                </Link>
              ) : (
                <>
                  {oauthReady ? (
                    <>
                      <a href={authUrls.register} className="btn btn-primary">
                        Start Trading Now <ArrowRight size={18} style={{ marginLeft: '8px' }} />
                      </a>
                      <a href={authUrls.login} className="btn btn-secondary">
                        Try Free Demo
                      </a>
                    </>
                  ) : (
                    <span className="text-secondary" style={{ fontSize: '0.9rem' }}>
                      OAuth buttons unlock after you set credentials in backend/.env
                    </span>
                  )}
                  {import.meta.env.DEV && patReady && (
                    <a href={`${import.meta.env.VITE_API_URL || ''}/auth/dev-login`} className="btn btn-secondary" style={{ opacity: 0.85 }}>
                      Dev Login (PAT)
                    </a>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="ticker-wrapper">
        <div className="ticker-content">
          {[...tickerItems, ...tickerItems].map((item, index) => (
            <div className="ticker-item" key={index}>
              <span className="ticker-symbol">{item.symbol}</span>
              <span className="ticker-price">{item.price}</span>
              <span className={`ticker-change ${item.up ? 'up' : 'down'}`}>▲ {item.change}</span>
            </div>
          ))}
        </div>
      </div>

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
              <div style={{ marginBottom: '20px' }}>
                <CandlestickChart height="150px" numCandles={20} />
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
            <div className="hero-actions" style={{ marginTop: 0 }}>
              {oauthReady ? (
                <a href={authUrls.register} className="btn btn-primary" style={{ padding: '16px 32px', fontSize: '1.1rem' }}>
                  Create Free Account
                </a>
              ) : (
                <p className="text-muted" style={{ fontSize: '0.9rem' }}>
                  Complete Deriv Web-based app setup in backend/.env to enable registration.
                </p>
              )}
            </div>
            <p className="text-muted" style={{ marginTop: '16px', fontSize: '0.85rem' }}>
              <a href="https://deriv.com" target="_blank" rel="noopener noreferrer">Deposit on Deriv</a> using EcoCash, cards, crypto, and more.
            </p>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} Newxool Traders. All rights reserved.</p>
            <p>Powered by Deriv API</p>
          </div>
        </div>
      </footer>
    </>
  );
}
