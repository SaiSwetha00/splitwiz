'use client';

import Link from 'next/link';
import { useState, useEffect, Fragment } from 'react';

const css = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  .landing-root {
    background: #EEF2F7;
    font-family: 'DM Sans', system-ui, sans-serif;
    font-weight: 400;
    letter-spacing: -0.2px;
    line-height: 1.65;
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
  }
  .landing-root h1, .landing-root h2, .landing-root h3 {
    font-family: 'Clash Display', 'DM Sans', sans-serif;
    font-weight: 500;
    letter-spacing: -1px;
    line-height: 1.05;
  }
  .landing-root a { color: #6366f1; text-decoration: none; }
  .landing-root a:hover { color: #4f46e5; }

  @keyframes floatY { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-14px); } }
  @keyframes floatY2 { 0%, 100% { transform: translateY(0px) rotate(6deg); } 50% { transform: translateY(-14px) rotate(6deg); } }
  @keyframes haloSpin { 0% { transform: translate(-50%,-50%) rotate(0deg); } 100% { transform: translate(-50%,-50%) rotate(360deg); } }
  @keyframes pulseRing { 0%, 100% { opacity: .5; } 50% { opacity: 1; } }
  @keyframes shimmer { 0% { left: -40%; } 100% { left: 110%; } }

  .iphone { position: relative; border-radius: 48px; overflow: hidden; box-shadow: 0 40px 80px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.15); background: #000; flex-shrink: 0; }
  .iphone::before { content: ''; position: absolute; top: 11px; left: 50%; transform: translateX(-50%); width: 120px; height: 36px; border-radius: 24px; background: #000; z-index: 50; }
  .iphone-status { position: absolute; top: 0; left: 0; right: 0; display: flex; justify-content: space-between; align-items: center; padding: 18px 24px 6px; z-index: 40; pointer-events: none; }
  .iphone-status .time { font-family: -apple-system, 'SF Pro', system-ui; font-weight: 600; font-size: 16px; color: #fff; }
  .iphone-status .icons { display: flex; gap: 6px; align-items: center; }
  .iphone-home { position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%); width: 130px; height: 5px; border-radius: 100px; background: rgba(255,255,255,0.7); z-index: 60; pointer-events: none; }
  .iphone-content { width: 100%; height: 100%; overflow: hidden; }

  .navbar { position: sticky; top: 0; z-index: 200; display: flex; align-items: center; justify-content: space-between; padding: 16px clamp(20px,5vw,56px); background: rgba(8,8,16,0.65); backdrop-filter: blur(20px) saturate(160%); -webkit-backdrop-filter: blur(20px) saturate(160%); border-bottom: 1px solid rgba(255,255,255,0.1); }
  .nav-logo { display: flex; align-items: center; gap: 10px; font-family: 'Clash Display', sans-serif; font-weight: 800; font-size: 22px; color: #fff; text-decoration: none; }
  .nav-logo-icon { width: 30px; height: 30px; border-radius: 8px; background: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .nav-links { display: flex; gap: 36px; align-items: center; font-weight: 600; font-size: 15px; color: rgba(255,255,255,0.75); }
  .nav-links a { color: rgba(255,255,255,0.75); transition: color .2s; }
  .nav-links a:hover { color: #fff; }
  .nav-actions { display: flex; align-items: center; gap: 12px; }
  .nav-signin { font-weight: 600; font-size: 15px; color: rgba(255,255,255,0.75) !important; padding: 10px 6px; transition: color .2s; }
  .nav-signin:hover { color: #fff !important; }
  .btn-primary { font-family: 'Clash Display', sans-serif; font-weight: 500; font-size: 15px; color: #fff !important; background: #6366f1; padding: 11px 22px; border-radius: 100px; box-shadow: 0 8px 20px rgba(99,102,241,0.35); transition: background .2s, transform .15s, box-shadow .2s; white-space: nowrap; }
  .btn-primary:hover { background: #4f46e5; color: #fff !important; transform: translateY(-1px); box-shadow: 0 12px 28px rgba(99,102,241,0.45); }
  .hamburger { display: none; flex-direction: column; gap: 5px; cursor: pointer; padding: 4px; background: none; border: none; }
  .hamburger span { display: block; width: 22px; height: 2px; border-radius: 2px; background: rgba(255,255,255,0.8); transition: all .3s; }
  .hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
  .hamburger.open span:nth-child(2) { opacity: 0; }
  .hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
  .mobile-menu { display: none; flex-direction: column; gap: 0; background: rgba(8,8,16,0.95); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-top: 1px solid rgba(255,255,255,0.1); padding: 8px 0 16px; }
  .mobile-menu.open { display: flex; }
  .mobile-menu a { font-weight: 600; font-size: 16px; color: rgba(255,255,255,0.8); padding: 14px clamp(20px,5vw,56px); border-bottom: 1px solid rgba(255,255,255,0.06); transition: color .2s, background .2s; }
  .mobile-menu a:hover { color: #fff; background: rgba(255,255,255,0.04); }
  .mobile-menu .btn-primary-mobile { margin: 16px clamp(20px,5vw,56px) 0; display: block; text-align: center; background: #6366f1; color: #fff; border-radius: 100px; padding: 14px; font-family: 'Clash Display', sans-serif; font-weight: 500; font-size: 16px; }

  .btn-hero-white { display: flex; align-items: center; gap: 10px; font-family: 'Clash Display', sans-serif; font-weight: 500; font-size: 16px; color: #0a0a0a !important; background: #fff; padding: 15px 28px; border-radius: 100px; box-shadow: 0 10px 26px rgba(0,0,0,0.35); transition: transform .15s, box-shadow .2s; }
  .btn-hero-white:hover { color: #0a0a0a !important; transform: translateY(-2px); box-shadow: 0 14px 32px rgba(0,0,0,0.4); }
  .btn-hero-ghost { display: flex; align-items: center; gap: 10px; font-family: 'Clash Display', sans-serif; font-weight: 500; font-size: 16px; color: #fff !important; background: rgba(255,255,255,0.06); border: 1.5px solid rgba(255,255,255,0.25); padding: 14.5px 28px; border-radius: 100px; transition: background .2s, border-color .2s, transform .15s; }
  .btn-hero-ghost:hover { color: #fff !important; background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.4); transform: translateY(-2px); }

  .btn-pricing { position: relative; display: block; background: linear-gradient(135deg, #818cf8, #4f46e5); color: #fff !important; font-family: 'Clash Display', sans-serif; font-weight: 500; font-size: 16px; padding: 16px; border-radius: 100px; box-shadow: 0 0 0 1px rgba(139,146,255,0.4), 0 12px 32px rgba(99,102,241,0.5); overflow: hidden; text-align: center; transition: transform .15s, box-shadow .2s; }
  .btn-pricing:hover { color: #fff !important; transform: translateY(-2px); box-shadow: 0 0 0 1px rgba(139,146,255,0.5), 0 16px 40px rgba(99,102,241,0.65); }
  .btn-pricing::before { content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%; background: linear-gradient(100deg, transparent, rgba(255,255,255,0.3), transparent); transform: skewX(-20deg); animation: shimmer 3s ease-in-out infinite; }

  .faq-item { background: #fff; border-radius: 16px; margin-bottom: 14px; border: 1px solid rgba(122,138,158,0.15); border-left: 1px solid rgba(122,138,158,0.15); overflow: hidden; box-shadow: 0 6px 20px rgba(20,30,60,0.05); transition: border-left .25s, box-shadow .25s; }
  .faq-item.open { border-left: 3px solid #6366f1; box-shadow: 0 6px 24px rgba(99,102,241,0.12); }
  .faq-question { display: flex; align-items: center; justify-content: space-between; padding: 22px 26px; cursor: pointer; user-select: none; -webkit-user-select: none; }
  .faq-question h3 { font-weight: 600; font-size: 16px; color: #1a1f2e; font-family: 'DM Sans', sans-serif; letter-spacing: -0.2px; line-height: 1.4; }
  .faq-icon { width: 28px; height: 28px; border-radius: 100px; background: #EEF2F7; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: transform .25s ease; margin-left: 16px; }
  .faq-item.open .faq-icon { transform: rotate(180deg); }
  .faq-body { max-height: 0; overflow: hidden; transition: max-height .3s ease; }
  .faq-item.open .faq-body { max-height: 200px; }
  .faq-body p { padding: 0 26px 22px; font-weight: 400; font-size: 15px; color: #4a5568; line-height: 1.65; }

  @media (max-width: 768px) {
    .nav-links { display: none; }
    .nav-actions { display: none; }
    .hamburger { display: flex; }
    .hero-ctas { flex-direction: column; align-items: center; }
    .hero-ctas a { width: 100%; max-width: 320px; justify-content: center; }
    .hero-phones { transform: scale(0.72); transform-origin: top center; margin-top: -40px !important; margin-bottom: -80px !important; }
    .features-grid { grid-template-columns: 1fr !important; }
    .features-grid > div { grid-column: span 1 !important; }
    .how-it-works-grid { grid-template-columns: 1fr !important; }
    .how-it-works-phone { display: none; }
    .app-showcase { flex-wrap: nowrap; overflow-x: auto; justify-content: flex-start !important; padding-bottom: 16px; }
    .app-showcase::-webkit-scrollbar { display: none; }
    .app-showcase-item { transform: none !important; margin: 0 !important; }
    .comparison-table { overflow-x: auto; }
    .comparison-grid { min-width: 560px; }
    .footer-grid { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
    .footer-brand { grid-column: span 2; }
    .testimonial-text { font-size: clamp(18px, 4vw, 24px) !important; }
    .stats-grid { gap: clamp(16px, 4vw, 40px) !important; }
    .stat-divider { display: none; }
    .pricing-card { margin: 0 16px; }
    .footer-cta-btns { flex-direction: column; align-items: center; }
    .footer-cta-btns a { width: 100%; max-width: 320px; justify-content: center; }
  }
  @media (max-width: 480px) {
    .hero-phones { transform: scale(0.6); margin-bottom: -130px !important; }
    .iphone-hero { width: 240px !important; height: 520px !important; }
  }
  .text-gradient { background: linear-gradient(90deg, #818cf8, #6366f1); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
`;

const faqData = [
  { q: 'What exactly is SplitWiz?', a: 'SplitWiz is a free app for tracking and splitting shared expenses on trips — who paid, who owes, and how to settle up, all in one place.' },
  { q: 'Do I need to create an account?', a: 'No. You can start a trip and invite friends by link without signing up. An account just lets you sync across devices.' },
  { q: 'How does the splitting logic work?', a: 'Split evenly, by exact amounts, or by percentage. SplitWiz then calculates the minimum number of payments needed to settle every balance.' },
  { q: 'Is SplitWiz really free, forever?', a: 'Yes — unlimited trips, expenses, and friends, with no ads and no premium tier. It always will be.' },
  { q: 'Can I use SplitWiz without an internet connection?', a: 'Yes. Add expenses offline and they sync automatically the next time you have a connection.' },
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

  function toggleFaq(i: number) { setOpenFaq(prev => prev === i ? -1 : i); }
  function closeMobileMenu() { setMenuOpen(false); }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const hamburger = document.getElementById('hamburger');
      const menu = document.getElementById('mobileMenu');
      if (hamburger && menu && !hamburger.contains(e.target as Node) && !menu.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) {
          (e.target as HTMLElement).style.opacity = '1';
          (e.target as HTMLElement).style.transform = 'translateY(0)';
        }
      }),
      { threshold: 0.1 }
    );
    document.querySelectorAll<HTMLElement>('.features-grid > div, .faq-item').forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const logoSvg = (
    <svg width="24" height="24" viewBox="0 0 34 34" fill="none">
      <path d="M17 2 L30 9.5 L30 24.5 L17 32 L4 24.5 L4 9.5 Z" fill="#0a0a0a"/>
      <path d="M9 12 L13 22 L17 14 L21 22 L25 12" stroke="#6366f1" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
  const iphoneSignal = (
    <svg width="17" height="12" viewBox="0 0 19 12">
      <rect x="0" y="7.5" width="3.2" height="4.5" rx="0.7" fill="white"/>
      <rect x="4.8" y="5" width="3.2" height="7" rx="0.7" fill="white"/>
      <rect x="9.6" y="2.5" width="3.2" height="9.5" rx="0.7" fill="white"/>
      <rect x="14.4" y="0" width="3.2" height="12" rx="0.7" fill="white"/>
    </svg>
  );
  const iphoneWifi = (
    <svg width="15" height="12" viewBox="0 0 17 12">
      <path d="M8.5 3.2C10.8 3.2 12.9 4.1 14.4 5.6L15.5 4.5C13.7 2.7 11.2 1.5 8.5 1.5C5.8 1.5 3.3 2.7 1.5 4.5L2.6 5.6C4.1 4.1 6.2 3.2 8.5 3.2Z" fill="white"/>
      <path d="M8.5 6.8C9.9 6.8 11.1 7.3 12 8.2L13.1 7.1C11.8 5.9 10.2 5.1 8.5 5.1C6.8 5.1 5.2 5.9 3.9 7.1L5 8.2C5.9 7.3 7.1 6.8 8.5 6.8Z" fill="white"/>
      <circle cx="8.5" cy="10.5" r="1.5" fill="white"/>
    </svg>
  );
  const iphoneBattery = (
    <svg width="25" height="12" viewBox="0 0 27 13">
      <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke="white" strokeOpacity="0.35" fill="none"/>
      <rect x="2" y="2" width="20" height="9" rx="2" fill="white"/>
    </svg>
  );
  const appleSvg = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" fill="#0a0a0a"/>
    </svg>
  );
  const androidSvg = (
    <svg width="16" height="18" viewBox="0 0 24 27" fill="none">
      <path d="M1.5 1.5L22.5 13.5L1.5 25.5V1.5Z" fill="rgba(255,255,255,0.8)"/>
    </svg>
  );

  return (
    <div className="landing-root">
      <style>{css}</style>

      {/* NAVBAR */}
      <div id="navbar">
        <nav className="navbar">
          <Link href="/" className="nav-logo">
            <div className="nav-logo-icon">{logoSvg}</div>
            Split<span style={{color:'#818cf8',borderBottom:'2px solid #818cf8',paddingBottom:'2px'}}>Wiz</span>
          </Link>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div className="nav-actions">
            <Link href="/login" className="nav-signin">Sign in</Link>
            <Link href="/signup" className="btn-primary">Get started</Link>
          </div>
          <button className={`hamburger${menuOpen ? ' open' : ''}`} id="hamburger" aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(o => !o)}>
            <span/><span/><span/>
          </button>
        </nav>
        <div className={`mobile-menu${menuOpen ? ' open' : ''}`} id="mobileMenu">
          <a href="#features" onClick={closeMobileMenu}>Features</a>
          <a href="#how-it-works" onClick={closeMobileMenu}>How it works</a>
          <a href="#pricing" onClick={closeMobileMenu}>Pricing</a>
          <Link href="/login" onClick={closeMobileMenu} style={{fontWeight:600,fontSize:'16px',color:'rgba(255,255,255,0.8)',padding:'14px clamp(20px,5vw,56px)',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>Sign in</Link>
          <Link href="/signup" className="btn-primary-mobile">Get started free</Link>
        </div>
      </div>

      {/* HERO */}
      <div style={{position:'relative',padding:'clamp(60px,10vw,110px) clamp(20px,6vw,56px) 40px',background:'linear-gradient(180deg,#080810 0%,#0a0916 40%,#0d0c1a 75%,#070710 100%)',textAlign:'center',overflow:'hidden'}}>
        <div style={{position:'absolute',top:'38%',left:'50%',width:'60vw',maxWidth:'900px',height:'60vw',maxHeight:'900px',transform:'translate(-50%,-50%)',borderRadius:'50%',background:'radial-gradient(circle,rgba(99,102,241,0.28) 0%,rgba(99,102,241,0) 70%)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',bottom:0,left:0,width:'100%',height:'16%',minHeight:'90px',background:'linear-gradient(0deg,rgba(70,60,140,0.18) 0%,rgba(70,60,140,0) 100%)',pointerEvents:'none'}}/>
        <svg style={{position:'absolute',bottom:'-2px',left:0,width:'100%',height:'14%',minHeight:'80px',pointerEvents:'none'}} viewBox="0 0 1440 200" preserveAspectRatio="none"><path d="M0 200 L0 120 L90 70 L180 110 L260 55 L340 100 L430 40 L520 95 L610 60 L700 115 L800 50 L890 105 L980 65 L1080 120 L1180 45 L1280 100 L1360 60 L1440 110 L1440 200 Z" fill="#050408"/></svg>
        <div style={{maxWidth:'780px',margin:'0 auto',position:'relative'}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:'8px',background:'rgba(255,255,255,0.06)',backdropFilter:'blur(10px)',WebkitBackdropFilter:'blur(10px)',border:'1px solid rgba(255,255,255,0.14)',padding:'8px 18px',borderRadius:'100px',fontWeight:500,fontSize:'13px',color:'#fff',marginBottom:'28px'}}>✈️ Trusted by 500,000+ travelers</div>
          <h1 style={{fontStyle:'italic',fontWeight:600,fontSize:'clamp(40px,7vw,84px)',lineHeight:1.05,color:'#fff',margin:'0 0 24px',letterSpacing:'-1px'}}>Split trips,<br/>not friendships</h1>
          <p style={{fontWeight:500,fontSize:'clamp(16px,2vw,20px)',color:'rgba(255,255,255,0.65)',maxWidth:'520px',margin:'0 auto 36px',lineHeight:1.5}}>Track who paid what, see who owes whom, and settle up instantly — free, for every trip.</p>
          <div className="hero-ctas" style={{display:'flex',gap:'16px',justifyContent:'center',flexWrap:'wrap'}}>
            <Link href="/signup" className="btn-hero-white">{appleSvg}Download for iOS</Link>
            <Link href="/signup" className="btn-hero-ghost">{androidSvg}Download for Android</Link>
          </div>
        </div>
        {/* Phone + floating cards */}
        <div className="hero-phones" style={{position:'relative',maxWidth:'900px',height:'clamp(560px,60vw,720px)',margin:'70px auto 0',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{position:'absolute',top:'50%',left:'50%',width:'clamp(420px,54vw,680px)',height:'clamp(420px,54vw,680px)',borderRadius:'50%',border:'1px solid rgba(99,102,241,0.16)',transform:'translate(-50%,-50%)',pointerEvents:'none'}}/>
          <div style={{position:'absolute',top:'50%',left:'50%',width:'clamp(320px,42vw,520px)',height:'clamp(320px,42vw,520px)',borderRadius:'50%',border:'1px solid rgba(99,102,241,0.24)',transform:'translate(-50%,-50%)',animation:'pulseRing 5s ease-in-out infinite',pointerEvents:'none'}}/>
          <div style={{position:'absolute',top:'50%',left:'50%',width:'clamp(220px,30vw,360px)',height:'clamp(220px,30vw,360px)',borderRadius:'50%',background:'radial-gradient(circle,rgba(129,140,248,0.55) 0%,rgba(99,102,241,0) 70%)',transform:'translate(-50%,-50%)',pointerEvents:'none'}}/>
          {/* Floating card: Trip total */}
          <div style={{position:'absolute',left:'clamp(0px,2vw,40px)',top:'14%',background:'rgba(255,255,255,0.14)',backdropFilter:'blur(20px) saturate(160%)',WebkitBackdropFilter:'blur(20px) saturate(160%)',border:'1px solid rgba(255,255,255,0.35)',borderRadius:'20px',padding:'18px 22px',boxShadow:'0 20px 40px rgba(20,30,60,0.18)',textAlign:'left',transform:'rotate(-6deg)',animation:'floatY 6s ease-in-out infinite',zIndex:5,overflow:'hidden'}}>
            <div style={{position:'absolute',right:'6px',bottom:'-8px',fontSize:'52px',opacity:0.15,transform:'rotate(-8deg)'}}>💵</div>
            <div style={{position:'relative',fontSize:'12px',fontWeight:500,color:'#3a4656',marginBottom:'6px'}}>Trip total</div>
            <div style={{position:'relative',fontSize:'24px',fontWeight:600,color:'#10131a'}}>$1,240.00</div>
          </div>
          {/* Floating card: Settled */}
          <div style={{position:'absolute',right:'clamp(0px,2vw,40px)',bottom:'16%',background:'rgba(255,255,255,0.14)',backdropFilter:'blur(20px) saturate(160%)',WebkitBackdropFilter:'blur(20px) saturate(160%)',border:'1px solid rgba(255,255,255,0.35)',borderRadius:'20px',padding:'18px 22px',boxShadow:'0 20px 40px rgba(20,30,60,0.18)',textAlign:'left',animation:'floatY2 7s ease-in-out infinite 1s',zIndex:5,overflow:'hidden'}}>
            <div style={{position:'absolute',right:0,top:'-10px',fontSize:'46px',opacity:0.18,transform:'rotate(10deg)'}}>✅</div>
            <div style={{position:'relative',fontSize:'12px',fontWeight:500,color:'#3a4656',marginBottom:'8px'}}>Settled</div>
            <div style={{position:'relative',display:'flex',alignItems:'center',gap:'8px'}}>
              <div style={{fontSize:'22px',fontWeight:600,color:'#10131a'}}>3/5</div>
              <div style={{width:'60px',height:'6px',background:'rgba(99,102,241,0.15)',borderRadius:'6px',overflow:'hidden'}}><div style={{width:'60%',height:'100%',background:'#45D881'}}/></div>
            </div>
          </div>
          {/* iPhone mockup */}
          <div style={{position:'relative',zIndex:3}}>
            <div className="iphone iphone-hero" style={{width:'300px',height:'650px'}}>
              <div className="iphone-status">
                <span className="time" style={{fontSize:'15px'}}>9:41</span>
                <div className="icons">{iphoneSignal}{iphoneWifi}{iphoneBattery}</div>
              </div>
              <div className="iphone-content">
                <div style={{padding:'64px 22px 40px',height:'100%',background:'linear-gradient(160deg,#0f0c29 0%,#302b63 55%,#24243e 100%)',color:'#fff',position:'relative',overflow:'hidden'}}>
                  <div style={{position:'absolute',top:'60px',left:'-6px',fontSize:'34px',opacity:0.1,transform:'rotate(-18deg)'}}>$</div>
                  <div style={{position:'absolute',top:'130px',right:'10px',fontSize:'26px',opacity:0.08,transform:'rotate(14deg)'}}>€</div>
                  <div style={{position:'absolute',top:'260px',left:'14px',fontSize:'22px',opacity:0.08,transform:'rotate(10deg)'}}>¥</div>
                  <div style={{position:'absolute',top:'340px',right:'24px',fontSize:'28px',opacity:0.09,transform:'rotate(-12deg)'}}>£</div>
                  <div style={{position:'relative',fontSize:'13px',color:'rgba(255,255,255,0.5)',fontWeight:600}}>Good evening</div>
                  <div style={{position:'relative',fontSize:'22px',fontWeight:600,margin:'2px 0 20px'}}>Hello, Sarah 👋</div>
                  <div style={{position:'relative',background:'rgba(255,255,255,0.08)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:'22px',padding:'20px',marginBottom:'16px',overflow:'hidden',boxShadow:'0 12px 30px rgba(0,0,0,0.25)'}}>
                    <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(rgba(255,255,255,0.05) 1px,transparent 1px)',backgroundSize:'5px 5px',opacity:0.5}}/>
                    <div style={{position:'absolute',right:'8px',top:'6px',fontSize:'44px',opacity:0.12,transform:'rotate(-10deg)'}}>$</div>
                    <div style={{position:'relative',fontSize:'12px',fontWeight:500,color:'rgba(255,255,255,0.65)'}}>Net balance</div>
                    <div style={{position:'relative',fontSize:'30px',fontWeight:600,marginTop:'6px'}}>+$83.50</div>
                  </div>
                  <div style={{display:'flex',gap:'10px',marginBottom:'20px'}}>
                    <div style={{flex:1,background:'rgba(255,255,255,0.07)',backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'16px',padding:'14px'}}>
                      <div style={{fontSize:'11px',color:'rgba(255,255,255,0.5)',fontWeight:500}}>You owe</div>
                      <div style={{fontSize:'17px',fontWeight:600,color:'#FE1514',marginTop:'4px'}}>$32.00</div>
                    </div>
                    <div style={{flex:1,background:'rgba(255,255,255,0.07)',backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'16px',padding:'14px'}}>
                      <div style={{fontSize:'11px',color:'rgba(255,255,255,0.5)',fontWeight:500}}>Owed to you</div>
                      <div style={{fontSize:'17px',fontWeight:600,color:'#45D881',marginTop:'4px'}}>$115.50</div>
                    </div>
                  </div>
                  <div style={{fontSize:'12px',fontWeight:500,color:'rgba(255,255,255,0.5)',marginBottom:'10px'}}>RECENT</div>
                  <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                    {[{emoji:'🏖️',label:'Hotel',amount:'$220.00',color:'#6366f1'},{emoji:'🍽️',label:'Dinner',amount:'$85.00',color:'#45D881'},{emoji:'✈️',label:'Flight',amount:'$180.00',color:'#F59E0B'}].map(({emoji,label,amount,color})=>(
                      <div key={label} style={{position:'relative',display:'flex',alignItems:'center',gap:'10px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderLeft:`3px solid ${color}`,borderRadius:'14px',padding:'10px 12px'}}>
                        <div style={{width:'34px',height:'34px',borderRadius:'10px',background:`rgba(99,102,241,0.25)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px'}}>{emoji}</div>
                        <div style={{flex:1,fontSize:'13px',fontWeight:500}}>{label}</div>
                        <div style={{position:'absolute',right:'6px',fontSize:'26px',opacity:0.1}}>$</div>
                        <div style={{position:'relative',fontSize:'13px',fontWeight:500}}>{amount}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="iphone-home"/>
            </div>
          </div>
        </div>
      </div>

      {/* LOGOS */}
      <div style={{padding:'40px clamp(20px,6vw,56px) 60px',textAlign:'center',background:'#EEF2F7'}}>
        <div style={{fontSize:'14px',fontWeight:500,color:'#7a8a9e',marginBottom:'28px'}}>Loved by travelers on</div>
        <div style={{display:'flex',gap:'clamp(28px,6vw,64px)',justifyContent:'center',alignItems:'center',flexWrap:'wrap',opacity:0.55}}>
          {['Airbnb','Booking.com','Tripadvisor','Hostelworld'].map(b=>(
            <div key={b} style={{fontSize:'22px',fontWeight:600,color:'#7a8a9e'}}>{b}</div>
          ))}
        </div>
      </div>

      {/* STATS */}
      <div style={{padding:'20px clamp(20px,6vw,56px) 90px',textAlign:'center',background:'#EEF2F7'}}>
        <div style={{display:'inline-flex',alignItems:'center',gap:'8px',background:'#fff',border:'1px solid rgba(99,102,241,0.18)',padding:'8px 20px',borderRadius:'100px',fontWeight:500,fontSize:'13px',color:'#6366f1',marginBottom:'36px'}}>Effect</div>
        <div className="stats-grid" style={{display:'flex',justifyContent:'center',alignItems:'center',gap:'clamp(24px,6vw,72px)',flexWrap:'wrap'}}>
          {[{val:'500K+',label:'Trips Split'},{val:'$2M+',label:'Settled'},{val:'100%',label:'Free'}].map(({val,label},i)=>(
            <Fragment key={val}>
              {i>0 && <div className="stat-divider" style={{width:'1px',height:'56px',background:'rgba(122,138,158,0.25)'}}/>}
              <div style={{textAlign:'center'}}>
                <div style={{fontWeight:600,fontSize:'clamp(34px,5vw,56px)',color:'#10131a'}}>{val}</div>
                <div style={{fontWeight:600,fontSize:'15px',color:'#7a8a9e',marginTop:'4px'}}>{label}</div>
              </div>
            </Fragment>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <div id="features" style={{background:'#050505',padding:'clamp(70px,8vw,110px) clamp(20px,6vw,56px)'}}>
        <div style={{textAlign:'center',maxWidth:'600px',margin:'0 auto 48px'}}>
          <h2 style={{fontWeight:500,fontSize:'clamp(30px,4vw,46px)',color:'#fff',margin:'0 0 14px',letterSpacing:'0.5px'}}>Everything a trip needs</h2>
          <p style={{fontWeight:500,fontSize:'17px',color:'#888',margin:0}}>Four simple tools that keep every group trip drama-free.</p>
        </div>
        <div className="features-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',maxWidth:'1080px',margin:'0 auto'}}>
          <div style={{gridColumn:'span 1',position:'relative',background:'#0a0a0a',borderRadius:'20px',padding:'32px',minHeight:'300px',display:'flex',flexDirection:'column',justifyContent:'flex-end',border:'1px solid rgba(99,102,241,0.3)',overflow:'hidden'}}>
            <div style={{position:'absolute',top:'-30px',left:'-30px',width:'220px',height:'220px',borderRadius:'50%',background:'#6366f1',opacity:0.28,filter:'blur(60px)',pointerEvents:'none'}}/>
            <div style={{position:'relative',display:'flex',flexDirection:'column',gap:'8px',marginBottom:'24px'}}>
              {[{emoji:'🏖️',label:'Hotel',amt:'$220.00'},{emoji:'🍽️',label:'Dinner',amt:'$85.00'},{emoji:'✈️',label:'Flights',amt:'$450.00'}].map(({emoji,label,amt})=>(
                <div key={label} style={{display:'flex',alignItems:'center',gap:'10px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'12px',padding:'10px 12px'}}>
                  <span style={{fontSize:'15px'}}>{emoji}</span><span style={{flex:1,fontSize:'13px',fontWeight:500,color:'#fff'}}>{label}</span><span style={{fontSize:'13px',fontWeight:600,color:'#fff'}}>{amt}</span>
                </div>
              ))}
            </div>
            <div style={{position:'relative'}}>
              <div style={{fontFamily:"'Clash Display',sans-serif",fontWeight:600,fontSize:'22px',color:'#fff',marginBottom:'8px'}}>Track Every Expense</div>
              <div style={{fontWeight:400,fontSize:'15px',color:'#888',lineHeight:1.65}}>Log costs the moment they happen — flights, hotels, that extra round of drinks.</div>
            </div>
          </div>
          <div style={{gridColumn:'span 1',position:'relative',background:'#0a0a0a',borderRadius:'20px',padding:'32px',minHeight:'300px',display:'flex',flexDirection:'column',justifyContent:'flex-end',border:'1px solid rgba(99,102,241,0.3)',overflow:'hidden'}}>
            <div style={{position:'absolute',top:'-20px',right:'-20px',width:'220px',height:'220px',borderRadius:'50%',background:'#6366f1',opacity:0.28,filter:'blur(60px)',pointerEvents:'none'}}/>
            <div style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',marginBottom:'28px'}}>
              <div style={{width:'44px',height:'44px',borderRadius:'50%',background:'#6366f1',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:700,color:'#fff'}}>$64</div>
              <svg width="26" height="14" viewBox="0 0 26 14" fill="none"><path d="M1 7h20M15 1l6 6-6 6" stroke="rgba(255,255,255,0.35)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              {['S','M','P'].map(l=><div key={l} style={{width:'36px',height:'36px',borderRadius:'50%',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',fontWeight:700,color:'#fff'}}>{l}</div>)}
            </div>
            <div style={{position:'relative'}}>
              <div style={{fontFamily:"'Clash Display',sans-serif",fontWeight:600,fontSize:'22px',color:'#fff',marginBottom:'8px'}}>Auto-Split Instantly</div>
              <div style={{fontWeight:400,fontSize:'15px',color:'#888',lineHeight:1.65}}>Even, custom, or percentage splits calculated the second an expense is added.</div>
            </div>
          </div>
          <div style={{position:'relative',background:'#0a0a0a',borderRadius:'20px',padding:'32px',minHeight:'220px',display:'flex',flexDirection:'column',justifyContent:'flex-end',border:'1px solid rgba(139,92,246,0.35)',overflow:'hidden'}}>
            <div style={{position:'absolute',top:'50%',left:'50%',width:'200px',height:'200px',borderRadius:'50%',background:'#8b5cf6',opacity:0.25,filter:'blur(50px)',transform:'translate(-50%,-50%)',pointerEvents:'none'}}/>
            <div style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:'20px'}}>
              <div style={{position:'absolute',width:'80px',height:'80px',borderRadius:'50%',border:'1px solid rgba(139,92,246,0.35)'}}/>
              <div style={{position:'absolute',width:'56px',height:'56px',borderRadius:'50%',border:'1px solid rgba(139,92,246,0.5)'}}/>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" style={{position:'relative'}}><path d="M12 2l7 3.2v5.6c0 5-3 8.4-7 9.6-4-1.2-7-4.6-7-9.6V5.2L12 2z" stroke="#8b5cf6" strokeWidth="1.6" strokeLinejoin="round"/><path d="M9 12l2 2 4-4.2" stroke="#8b5cf6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div style={{position:'relative'}}>
              <div style={{fontFamily:"'Clash Display',sans-serif",fontWeight:600,fontSize:'20px',color:'#fff',marginBottom:'8px'}}>Bank-Level Security</div>
              <div style={{fontWeight:400,fontSize:'14px',color:'#888',lineHeight:1.65}}>Every expense is encrypted and protected, always.</div>
            </div>
          </div>
          <div style={{position:'relative',background:'#0a0a0a',borderRadius:'20px',padding:'32px',minHeight:'220px',display:'flex',flexDirection:'column',justifyContent:'flex-end',border:'1px solid rgba(99,102,241,0.3)',overflow:'hidden'}}>
            <div style={{position:'absolute',bottom:'-30px',right:'-10px',width:'200px',height:'200px',borderRadius:'50%',background:'#6366f1',opacity:0.25,filter:'blur(55px)',pointerEvents:'none'}}/>
            <div style={{position:'relative',display:'flex',alignItems:'center',gap:'10px',marginBottom:'20px',background:'rgba(69,216,129,0.1)',border:'1px solid rgba(69,216,129,0.3)',borderRadius:'100px',padding:'10px 16px',width:'fit-content'}}>
              <span style={{color:'#45D881',fontWeight:700,fontSize:'15px'}}>✓</span><span style={{fontSize:'13px',fontWeight:600,color:'#45D881',whiteSpace:'nowrap'}}>All settled</span>
            </div>
            <div style={{position:'relative'}}>
              <div style={{fontFamily:"'Clash Display',sans-serif",fontWeight:600,fontSize:'20px',color:'#fff',marginBottom:'8px'}}>Settle with One Tap</div>
              <div style={{fontWeight:400,fontSize:'14px',color:'#888',lineHeight:1.65}}>One tap tells everyone exactly who to pay.</div>
            </div>
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div id="how-it-works" style={{background:'#EEF2F7',padding:'clamp(60px,8vw,110px) clamp(20px,6vw,56px)'}}>
        <div className="how-it-works-grid" style={{maxWidth:'1120px',margin:'0 auto',display:'grid',gridTemplateColumns:'1.1fr 1fr',gap:'60px',alignItems:'center'}}>
          <div>
            <div style={{fontWeight:600,fontSize:'clamp(28px,4vw,44px)',fontStyle:'italic',color:'#1a1f2e',margin:'0 0 44px'}}>How it works</div>
            {[{n:1,title:'Create a trip',desc:'Name your trip and add friends in seconds — no accounts required.'},{n:2,title:'Log expenses on the go',desc:'Snap it, add the amount, tag who paid. SplitWiz remembers the rest.'},{n:3,title:'Settle in one tap',desc:'SplitWiz works out the fewest payments needed to square everyone up.'}].map(({n,title,desc})=>(
              <div key={n} style={{display:'flex',gap:'20px',marginBottom:'40px'}}>
                <div style={{fontWeight:600,fontSize:'20px',color:'#6366f1',background:'rgba(99,102,241,0.15)',width:'44px',height:'44px',borderRadius:'14px',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{n}</div>
                <div>
                  <div style={{fontWeight:600,fontSize:'20px',color:'#1a1f2e',marginBottom:'8px'}}>{title}</div>
                  <div style={{fontWeight:500,fontSize:'15px',color:'#4a5568',lineHeight:1.55,maxWidth:'400px'}}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="how-it-works-phone" style={{display:'flex',justifyContent:'center'}}>
            <div className="iphone" style={{width:'300px',height:'650px'}}>
              <div className="iphone-status">
                <span className="time" style={{fontSize:'15px'}}>9:41</span>
                <div className="icons">{iphoneSignal}{iphoneBattery}</div>
              </div>
              <div className="iphone-content">
                <div style={{padding:'64px 22px 40px',height:'100%',background:'#0a0a0a',color:'#fff'}}>
                  <div style={{fontSize:'11px',fontWeight:500,color:'rgba(255,255,255,0.4)'}}>TRIP</div>
                  <div style={{fontSize:'22px',fontWeight:600,margin:'4px 0 18px'}}>Bali Trip 2025 🌴</div>
                  <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                    {[{emoji:'✈️',label:'Flights',paid:'Paid by Sarah',amt:'$450.00',bg:'rgba(99,102,241,0.2)'},{emoji:'🏨',label:'Hotel',paid:'Paid by Marco',amt:'$620.00',bg:'rgba(69,216,129,0.15)'},{emoji:'🍽️',label:'Dinner',paid:'Paid by Priya',amt:'$85.00',bg:'rgba(254,21,20,0.15)'},{emoji:'🛵',label:'Scooter rental',paid:'Paid by Sarah',amt:'$40.00',bg:'rgba(255,255,255,0.1)'}].map(({emoji,label,paid,amt,bg})=>(
                      <div key={label} style={{display:'flex',alignItems:'center',gap:'10px',background:'#111214',borderRadius:'14px',padding:'12px'}}>
                        <div style={{width:'34px',height:'34px',borderRadius:'10px',background:bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px'}}>{emoji}</div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:'13px',fontWeight:500}}>{label}</div>
                          <div style={{fontSize:'11px',color:'rgba(255,255,255,0.4)',marginTop:'2px'}}>{paid}</div>
                        </div>
                        <div style={{fontSize:'13px',fontWeight:500}}>{amt}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="iphone-home"/>
            </div>
          </div>
        </div>
      </div>

      {/* APP SHOWCASE */}
      <div style={{background:'radial-gradient(ellipse at 50% 100%,#14112a 0%,#080810 60%)',padding:'0 clamp(20px,6vw,56px) clamp(90px,9vw,140px)',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:0,left:0,right:0,bottom:0,backgroundImage:'linear-gradient(rgba(255,255,255,0.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.035) 1px,transparent 1px)',backgroundSize:'44px 44px',maskImage:'radial-gradient(ellipse at 50% 40%,#000 0%,transparent 70%)',WebkitMaskImage:'radial-gradient(ellipse at 50% 40%,#000 0%,transparent 70%)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',top:'6%',left:'6%',width:'320px',height:'320px',borderRadius:'50%',background:'#6366f1',opacity:0.22,filter:'blur(100px)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',top:'18%',left:'42%',width:'420px',height:'420px',borderRadius:'50%',background:'#6366f1',opacity:0.22,filter:'blur(120px)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',top:'10%',right:'4%',width:'300px',height:'300px',borderRadius:'50%',background:'#8b5cf6',opacity:0.2,filter:'blur(100px)',pointerEvents:'none'}}/>
        <div style={{position:'relative',maxWidth:'1240px',margin:'0 auto',textAlign:'center',paddingTop:'clamp(60px,8vw,110px)'}}>
          <h2 style={{fontFamily:"'Clash Display',sans-serif",fontWeight:600,fontSize:'clamp(28px,4vw,44px)',color:'#fff',margin:'0 0 12px',letterSpacing:'-1px'}}>Every screen, designed for speed</h2>
          <p style={{fontWeight:500,fontSize:'16px',color:'rgba(255,255,255,0.5)',maxWidth:'520px',margin:'0 auto 64px'}}>From first open to settled up — no clutter, no friction.</p>
          <div className="app-showcase" style={{display:'flex',alignItems:'flex-end',justifyContent:'center',flexWrap:'wrap',gap:0}}>
            {/* Left phone */}
            <div className="app-showcase-item" style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'14px',transform:'rotate(-8deg)',margin:'0 -14px 22px',position:'relative',zIndex:2}}>
              <div style={{filter:'drop-shadow(-6px 0 24px rgba(99,102,241,0.35)) drop-shadow(0 40px 50px rgba(0,0,0,0.55))'}}>
                <div className="iphone" style={{width:'236px',height:'510px'}}>
                  <div className="iphone-status">
                    <span className="time" style={{fontSize:'13px'}}>9:41</span>
                    <div className="icons" style={{transform:'scale(0.85)',transformOrigin:'right center'}}>{iphoneSignal}</div>
                  </div>
                  <div className="iphone-content">
                    <div style={{padding:'56px 16px 28px',height:'100%',background:'linear-gradient(160deg,#0f0c29 0%,#302b63 100%)',color:'#fff'}}>
                      <div style={{fontSize:'11px',fontWeight:500,color:'rgba(255,255,255,0.5)'}}>TRIPS</div>
                      <div style={{fontSize:'19px',fontWeight:600,margin:'2px 0 14px'}}>My Trips</div>
                      <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                        {[{name:'Bali 2025 🌴',members:'4 members',status:'All settled ✓',statusColor:'#45D881',bg:'rgba(255,255,255,0.07)',border:'rgba(255,255,255,0.1)'},{name:'Tokyo Trip ⛩️',members:'3 members',status:'You owe $48',statusColor:'#FE1514',bg:'rgba(99,102,241,0.15)',border:'rgba(99,102,241,0.35)'},{name:'NYC Crew 🗽',members:'6 members',status:'+$83.50 owed to you',statusColor:'#45D881',bg:'rgba(255,255,255,0.07)',border:'rgba(255,255,255,0.1)'}].map(({name,members,status,statusColor,bg,border})=>(
                          <div key={name} style={{background:bg,border:`1px solid ${border}`,borderRadius:'14px',padding:'12px'}}>
                            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                              <div style={{fontSize:'13px',fontWeight:600}}>{name}</div>
                              <div style={{fontSize:'11px',color:'rgba(255,255,255,0.4)'}}>{members}</div>
                            </div>
                            <div style={{fontSize:'11px',color:statusColor,marginTop:'4px'}}>{status}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="iphone-home"/>
                </div>
              </div>
              <div style={{width:'34px',height:'2px',background:'rgba(255,255,255,0.35)',borderRadius:'2px'}}/>
              <div style={{fontWeight:500,fontSize:'13px',color:'rgba(255,255,255,0.6)'}}>My Trips</div>
            </div>
            {/* Center phone */}
            <div className="app-showcase-item" style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'14px',position:'relative',zIndex:3}}>
              <div style={{filter:'drop-shadow(0 0 40px rgba(99,102,241,0.4)) drop-shadow(0 50px 60px rgba(0,0,0,0.7))'}}>
                <div className="iphone" style={{width:'280px',height:'608px'}}>
                  <div className="iphone-status">
                    <span className="time" style={{fontSize:'15px'}}>9:41</span>
                    <div className="icons">{iphoneSignal}{iphoneBattery}</div>
                  </div>
                  <div className="iphone-content">
                    <div style={{padding:'64px 18px 40px',height:'100%',background:'linear-gradient(160deg,#0f0c29 0%,#302b63 55%,#24243e 100%)',color:'#fff'}}>
                      <div style={{fontSize:'11px',fontWeight:500,color:'rgba(255,255,255,0.4)'}}>BALANCES</div>
                      <div style={{fontSize:'19px',fontWeight:600,margin:'4px 0 16px'}}>Who owes who</div>
                      <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                        {[{init:'M',bg:'#6366f1',label:'You owe Marco',amt:'$32.00',amtColor:'#FE1514',shadow:'rgba(254,21,20,0.6)'},{init:'P',bg:'#45D881',bgText:'#0a0a0a',label:'Priya owes you',amt:'$70.00',amtColor:'#45D881',shadow:'rgba(69,216,129,0.6)'},{init:'L',bg:'#eab308',bgText:'#0a0a0a',label:'Li owes you',amt:'$45.50',amtColor:'#45D881',shadow:'rgba(69,216,129,0.6)'}].map(({init,bg,bgText,label,amt,amtColor,shadow})=>(
                          <div key={init} style={{display:'flex',alignItems:'center',gap:'10px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'14px',padding:'12px'}}>
                            <div style={{width:'32px',height:'32px',borderRadius:'100px',background:bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:600,color:bgText||'#fff'}}>{init}</div>
                            <div style={{flex:1,fontSize:'12px',fontWeight:500}}>{label}</div>
                            <div style={{fontSize:'13px',fontWeight:600,color:amtColor,textShadow:`0 0 10px ${shadow}`}}>{amt}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{position:'relative',marginTop:'20px',background:'linear-gradient(135deg,#6366f1,#4f46e5)',boxShadow:'0 0 0 1px rgba(139,146,255,0.6),0 8px 24px rgba(99,102,241,0.5)',color:'#fff',textAlign:'center',borderRadius:'100px',padding:'12px',fontFamily:"'Clash Display',sans-serif",fontWeight:500,fontSize:'13px',overflow:'hidden'}}>
                        <div style={{position:'absolute',top:0,left:'-40%',width:'40%',height:'100%',background:'linear-gradient(100deg,transparent,rgba(255,255,255,0.35),transparent)',transform:'skewX(-20deg)',animation:'shimmer 3s ease-in-out infinite'}}/>
                        <span style={{position:'relative'}}>Settle all</span>
                      </div>
                    </div>
                  </div>
                  <div className="iphone-home"/>
                </div>
              </div>
              <div style={{width:'34px',height:'2px',background:'rgba(255,255,255,0.35)',borderRadius:'2px'}}/>
              <div style={{fontWeight:500,fontSize:'13px',color:'rgba(255,255,255,0.6)'}}>Settle Up</div>
            </div>
            {/* Right phone */}
            <div className="app-showcase-item" style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'14px',transform:'rotate(8deg)',margin:'0 -14px 22px',position:'relative',zIndex:2}}>
              <div style={{filter:'drop-shadow(6px 0 24px rgba(99,102,241,0.35)) drop-shadow(0 40px 50px rgba(0,0,0,0.55))'}}>
                <div className="iphone" style={{width:'236px',height:'510px'}}>
                  <div className="iphone-status">
                    <span className="time" style={{fontSize:'13px'}}>9:41</span>
                    <div className="icons" style={{transform:'scale(0.85)',transformOrigin:'right center'}}>{iphoneBattery}</div>
                  </div>
                  <div className="iphone-content">
                    <div style={{padding:'56px 16px 28px',height:'100%',background:'#0a0a0a',color:'#fff'}}>
                      <div style={{fontSize:'11px',fontWeight:500,color:'rgba(255,255,255,0.4)'}}>ADD EXPENSE</div>
                      <div style={{fontSize:'19px',fontWeight:600,margin:'2px 0 14px'}}>New Expense</div>
                      <div style={{background:'#111214',borderRadius:'16px',padding:'14px',marginBottom:'10px'}}>
                        <div style={{fontSize:'11px',color:'rgba(255,255,255,0.4)',marginBottom:'4px'}}>AMOUNT</div>
                        <div style={{fontSize:'26px',fontWeight:600}}>$85.00</div>
                      </div>
                      <div style={{background:'#111214',borderRadius:'16px',padding:'14px',marginBottom:'10px'}}>
                        <div style={{fontSize:'11px',color:'rgba(255,255,255,0.4)',marginBottom:'4px'}}>DESCRIPTION</div>
                        <div style={{fontSize:'13px',fontWeight:500,color:'#fff'}}>Beachside dinner 🍽️</div>
                      </div>
                      <div style={{background:'#111214',borderRadius:'16px',padding:'14px',marginBottom:'10px'}}>
                        <div style={{fontSize:'11px',color:'rgba(255,255,255,0.4)',marginBottom:'8px'}}>PAID BY</div>
                        <div style={{display:'flex',gap:'6px'}}>
                          <div style={{background:'#6366f1',borderRadius:'100px',padding:'6px 10px',fontSize:'11px',fontWeight:600,color:'#fff'}}>Sarah ✓</div>
                          <div style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'100px',padding:'6px 10px',fontSize:'11px',fontWeight:600,color:'rgba(255,255,255,0.5)'}}>Marco</div>
                        </div>
                      </div>
                      <div style={{background:'linear-gradient(135deg,#818cf8,#4f46e5)',borderRadius:'100px',padding:'12px',textAlign:'center',fontWeight:600,fontSize:'13px',color:'#fff',boxShadow:'0 8px 20px rgba(99,102,241,0.5)'}}>Add expense</div>
                    </div>
                  </div>
                  <div className="iphone-home"/>
                </div>
              </div>
              <div style={{width:'34px',height:'2px',background:'rgba(255,255,255,0.35)',borderRadius:'2px'}}/>
              <div style={{fontWeight:500,fontSize:'13px',color:'rgba(255,255,255,0.6)'}}>Add Expense</div>
            </div>
          </div>
        </div>
      </div>

      {/* COMPARISON */}
      <div style={{background:'#F8F9FC',padding:'clamp(70px,8vw,120px) clamp(20px,6vw,56px)',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:'-40px',left:'50%',transform:'translateX(-50%)',fontFamily:"'Clash Display',sans-serif",fontWeight:700,fontSize:'260px',color:'rgba(16,19,26,0.03)',lineHeight:1,pointerEvents:'none',whiteSpace:'nowrap'}}>01</div>
        <div style={{maxWidth:'900px',margin:'0 auto',position:'relative'}}>
          <div style={{textAlign:'center',marginBottom:'48px'}}>
            <div style={{fontWeight:600,fontSize:'12px',letterSpacing:'2px',textTransform:'uppercase',color:'#6366f1',marginBottom:'12px'}}>Comparison</div>
            <h2 style={{fontWeight:600,fontSize:'clamp(28px,4vw,44px)',color:'#1a1f2e',margin:'0 0 12px',letterSpacing:'-1px'}}>SplitWiz vs the rest</h2>
            <p style={{fontWeight:500,fontSize:'16px',color:'#4a5568',margin:0}}>Why groups are switching.</p>
          </div>
          <div className="comparison-table">
            <div className="comparison-grid" style={{background:'#fff',borderRadius:'24px',overflow:'hidden',border:'1px solid rgba(122,138,158,0.15)',boxShadow:'0 20px 50px rgba(20,30,60,0.08)'}}>
              <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr',background:'#fff'}}>
                <div style={{padding:'18px 20px',fontWeight:500,fontSize:'13px',color:'#8a94a6'}}>Feature</div>
                <div style={{padding:'18px 12px',fontWeight:600,fontSize:'14px',color:'#fff',textAlign:'center',background:'#6366f1'}}>SplitWiz</div>
                <div style={{padding:'18px 12px',fontWeight:500,fontSize:'13px',color:'#8a94a6',textAlign:'center',background:'#F8F9FC'}}>Splitwise</div>
                <div style={{padding:'18px 12px',fontWeight:500,fontSize:'13px',color:'#8a94a6',textAlign:'center',background:'#F8F9FC'}}>Spreadsheet</div>
              </div>
              {[
                {feat:'Free forever',sw:true,sp:false,ss:true},
                {feat:'No sign-up required',sw:true,sp:false,ss:true},
                {feat:'Instant settle-up',sw:true,sp:true,ss:false},
                {feat:'Smart split suggestions',sw:true,sp:false,ss:false},
                {feat:'Multi-currency support',sw:true,sp:true,ss:false},
                {feat:'Works offline',sw:true,sp:false,ss:false},
              ].map(({feat,sw,sp,ss},i,arr)=>(
                <div key={feat} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr',borderBottom:i<arr.length-1?'1px solid rgba(122,138,158,0.12)':undefined}}>
                  <div style={{padding:'16px 20px',fontWeight:600,fontSize:'14px',color:'#1a1f2e'}}>{feat}</div>
                  <div style={{padding:'16px 12px',textAlign:'center',background:'rgba(99,102,241,0.04)'}}><span style={{color:sw?'#45D881':'#FE1514',fontWeight:700}}>{sw?'✓':'✕'}</span></div>
                  <div style={{padding:'16px 12px',textAlign:'center'}}><span style={{color:sp?'#45D881':'#FE1514',fontWeight:700}}>{sp?'✓':'✕'}</span></div>
                  <div style={{padding:'16px 12px',textAlign:'center'}}><span style={{color:ss?'#45D881':'#FE1514',fontWeight:700}}>{ss?'✓':'✕'}</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* TESTIMONIAL */}
      <div style={{background:'#0a0a0a',padding:'clamp(60px,8vw,110px) clamp(20px,6vw,56px)',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:'-50px',left:'50%',transform:'translateX(-50%)',fontFamily:"'Clash Display',sans-serif",fontWeight:700,fontSize:'260px',color:'rgba(255,255,255,0.025)',lineHeight:1,pointerEvents:'none',whiteSpace:'nowrap'}}>02</div>
        <div style={{position:'absolute',top:'30%',left:'50%',width:'400px',height:'400px',borderRadius:'50%',background:'#6366f1',opacity:0.14,filter:'blur(100px)',transform:'translate(-50%,-50%)',pointerEvents:'none'}}/>
        <div style={{maxWidth:'720px',margin:'0 auto',textAlign:'center',position:'relative'}}>
          <div style={{fontWeight:600,fontSize:'12px',letterSpacing:'2px',textTransform:'uppercase',color:'#6366f1',marginBottom:'20px'}}>Review</div>
          <div style={{position:'relative',fontFamily:"'Clash Display',sans-serif",fontWeight:500,fontStyle:'italic',fontSize:'clamp(20px,3vw,32px)',color:'#fff',lineHeight:1.4,marginBottom:'32px'}} className="testimonial-text">
            <span style={{position:'absolute',top:'-46px',left:'50%',transform:'translateX(-50%)',fontFamily:'Georgia,serif',fontSize:'140px',color:'rgba(99,102,241,0.18)',pointerEvents:'none'}}>&ldquo;</span>
            <span style={{position:'relative'}}>We split a two-week trip across four currencies and never opened a spreadsheet once. Settling up at the airport took thirty seconds.</span>
          </div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'14px'}}>
            <div style={{width:'52px',height:'52px',borderRadius:'100px',background:'linear-gradient(135deg,#818cf8,#4f46e5)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:600,fontSize:'18px',boxShadow:'0 0 0 3px rgba(99,102,241,0.2),0 0 24px rgba(99,102,241,0.45)'}}>JM</div>
            <div style={{textAlign:'left'}}>
              <div style={{fontWeight:700,fontSize:'15px',color:'#fff'}}>Jamie Moreno</div>
              <div style={{fontWeight:500,fontSize:'13px',color:'#666'}}>Trip organizer, Lisbon &apos;25</div>
            </div>
          </div>
        </div>
      </div>

      {/* PRICING */}
      <div id="pricing" style={{background:'#050505',padding:'clamp(70px,8vw,120px) clamp(20px,6vw,56px)',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:'-40px',left:'50%',transform:'translateX(-50%)',fontFamily:"'Clash Display',sans-serif",fontWeight:700,fontSize:'260px',color:'rgba(255,255,255,0.025)',lineHeight:1,pointerEvents:'none',whiteSpace:'nowrap'}}>03</div>
        <div className="pricing-card" style={{maxWidth:'440px',margin:'0 auto',position:'relative',background:'#0f0f0f',borderRadius:'32px',padding:'clamp(36px,5vw,48px)',border:'1px solid rgba(99,102,241,0.35)',boxShadow:'0 0 70px rgba(99,102,241,0.12)',textAlign:'center',overflow:'hidden'}}>
          <div style={{position:'absolute',top:'50%',left:'50%',width:'320px',height:'320px',borderRadius:'50%',background:'#6366f1',opacity:0.16,filter:'blur(80px)',transform:'translate(-50%,-50%)',pointerEvents:'none'}}/>
          <div style={{position:'relative',fontWeight:600,fontSize:'14px',color:'#6366f1',marginBottom:'16px'}}>Free, forever</div>
          <div style={{position:'relative',fontFamily:"'Clash Display',sans-serif",fontWeight:600,fontSize:'64px',color:'#fff',marginBottom:'6px'}}>$0<span style={{fontSize:'18px',fontWeight:600,color:'#888'}}>/forever</span></div>
          <p style={{position:'relative',fontWeight:500,fontSize:'15px',color:'#888',margin:'0 0 32px'}}>Everything you need. No trials, no upsells.</p>
          <div style={{position:'relative',display:'flex',flexDirection:'column',gap:'16px',textAlign:'left',marginBottom:'32px'}}>
            {['Unlimited trips & expenses','Unlimited friends & groups','Smart settle-up suggestions','Multi-currency support','No ads, ever'].map(feat=>(
              <div key={feat} style={{display:'flex',gap:'10px',alignItems:'center',fontWeight:600,fontSize:'15px',color:'#fff'}}>
                <span style={{color:'#45D881',fontWeight:700,textShadow:'0 0 10px rgba(69,216,129,0.7)'}}>✓</span>{feat}
              </div>
            ))}
          </div>
          <Link href="/signup" className="btn-pricing">
            <span style={{position:'relative'}}>Get started free</span>
          </Link>
        </div>
      </div>

      {/* FAQ */}
      <div style={{background:'#EEF2F7',padding:'clamp(70px,8vw,120px) clamp(20px,6vw,56px)',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:'-40px',left:'50%',transform:'translateX(-50%)',fontFamily:"'Clash Display',sans-serif",fontWeight:700,fontSize:'260px',color:'rgba(16,19,26,0.03)',lineHeight:1,pointerEvents:'none',whiteSpace:'nowrap'}}>04</div>
        <div style={{maxWidth:'760px',margin:'0 auto',position:'relative'}}>
          <div style={{textAlign:'center',fontWeight:600,fontSize:'12px',letterSpacing:'2px',textTransform:'uppercase',color:'#6366f1',marginBottom:'12px'}}>FAQ</div>
          <h2 style={{textAlign:'center',fontFamily:"'Clash Display',sans-serif",fontWeight:600,fontSize:'clamp(28px,4vw,44px)',color:'#1a1f2e',margin:'0 0 40px',letterSpacing:'-1px'}}>Frequently asked questions</h2>
          {faqData.map((item, i) => (
            <div key={i} className={`faq-item${openFaq === i ? ' open' : ''}`} id={`faq-${i}`}>
              <div className="faq-question" onClick={() => toggleFaq(i)} role="button" tabIndex={0} aria-expanded={openFaq === i} onKeyDown={e => { if (e.key==='Enter'||e.key===' ') { e.preventDefault(); toggleFaq(i); } }}>
                <h3>{item.q}</h3>
                <div className="faq-icon">
                  <svg width="12" height="8" viewBox="0 0 12 8"><path d="M1 1l5 5 5-5" stroke="#6366f1" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              </div>
              <div className="faq-body"><p>{item.a}</p></div>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER CTA */}
      <div style={{background:'#0a0a0a',padding:'clamp(70px,10vw,130px) clamp(20px,6vw,56px)',textAlign:'center'}}>
        <div style={{fontSize:'clamp(48px,7vw,84px)',marginBottom:'16px'}}>🤳</div>
        <h2 style={{fontWeight:600,fontStyle:'italic',fontSize:'clamp(32px,5vw,58px)',maxWidth:'720px',margin:'0 auto 40px',lineHeight:1.1,letterSpacing:'-1px'}}>
          <span style={{color:'#fff'}}>Spend freely.</span><br/>
          <span style={{position:'relative',display:'inline-block',color:'#818cf8',background:'linear-gradient(90deg,#818cf8,#6366f1)',WebkitBackgroundClip:'text',backgroundClip:'text',WebkitTextFillColor:'transparent'}}>
            <span style={{position:'absolute',top:'-20px',left:0,right:0,bottom:'-20px',background:'#6366f1',opacity:0.25,filter:'blur(30px)',zIndex:-1}}/>
            Settle smartly.
          </span>
        </h2>
        <div className="footer-cta-btns" style={{display:'flex',gap:'16px',justifyContent:'center',flexWrap:'wrap'}}>
          <Link href="/signup" className="btn-hero-white">{appleSvg}Download for iOS</Link>
          <Link href="/signup" className="btn-hero-ghost">{androidSvg}Download for Android</Link>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{background:'#0a0a0a',borderTop:'1px solid rgba(255,255,255,0.08)',padding:'64px clamp(20px,6vw,56px) 32px'}}>
        <div className="footer-grid" style={{maxWidth:'1120px',margin:'0 auto',display:'grid',gridTemplateColumns:'1.4fr 1fr 1fr 1fr',gap:'40px'}}>
          <div className="footer-brand">
            <Link href="/" style={{display:'flex',alignItems:'center',gap:'8px',fontFamily:"'Clash Display',sans-serif",fontWeight:800,fontSize:'20px',color:'#fff',marginBottom:'10px',textDecoration:'none'}}>
              <div style={{width:'26px',height:'26px',borderRadius:'7px',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <svg width="20" height="20" viewBox="0 0 34 34" fill="none"><path d="M17 2 L30 9.5 L30 24.5 L17 32 L4 24.5 L4 9.5 Z" fill="#0a0a0a"/><path d="M9 12 L13 22 L17 14 L21 22 L25 12" stroke="#6366f1" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
              </div>
              Split<span style={{color:'#818cf8',borderBottom:'2px solid #818cf8',paddingBottom:'1px'}}>Wiz</span>
            </Link>
            <div style={{fontWeight:500,fontSize:'14px',color:'rgba(255,255,255,0.45)',maxWidth:'220px'}}>Split trips, not friendships.</div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
            <div style={{fontWeight:500,fontSize:'13px',color:'rgba(255,255,255,0.35)',marginBottom:'4px'}}>PRODUCT</div>
            <a href="#features" style={{fontWeight:500,fontSize:'14px',color:'rgba(255,255,255,0.65)'}}>Features</a>
            <a href="#how-it-works" style={{fontWeight:500,fontSize:'14px',color:'rgba(255,255,255,0.65)'}}>How it works</a>
            <a href="#pricing" style={{fontWeight:500,fontSize:'14px',color:'rgba(255,255,255,0.65)'}}>Pricing</a>
            <Link href="/dashboard" style={{fontWeight:500,fontSize:'14px',color:'rgba(255,255,255,0.65)'}}>Open App</Link>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
            <div style={{fontWeight:500,fontSize:'13px',color:'rgba(255,255,255,0.35)',marginBottom:'4px'}}>COMPANY</div>
            {['About','Blog','Careers','Contact'].map(l=><a key={l} href="#" style={{fontWeight:500,fontSize:'14px',color:'rgba(255,255,255,0.65)'}}>{l}</a>)}
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
            <div style={{fontWeight:500,fontSize:'13px',color:'rgba(255,255,255,0.35)',marginBottom:'4px'}}>LEGAL</div>
            {['Privacy','Terms','Cookies'].map(l=><a key={l} href="#" style={{fontWeight:500,fontSize:'14px',color:'rgba(255,255,255,0.65)'}}>{l}</a>)}
          </div>
        </div>
        <div style={{maxWidth:'1120px',margin:'48px auto 0',paddingTop:'24px',borderTop:'1px solid rgba(255,255,255,0.08)',fontWeight:500,fontSize:'13px',color:'rgba(255,255,255,0.35)',textAlign:'center'}}>© 2026 SplitWiz. Made for travelers.</div>
      </div>
    </div>
  );
}
