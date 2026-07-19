'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';

export default function LandingPage() {
  useEffect(() => {
    // ── FAQ Accordion ──
    let openFaq = 0;

    function toggleFaq(index: number) {
      const prev = openFaq;
      openFaq = openFaq === index ? -1 : index;

      if (prev !== -1) {
        const prevItem = document.getElementById('faq-' + prev);
        if (prevItem) {
          prevItem.classList.remove('open');
          const q = prevItem.querySelector('.faq-question');
          if (q) q.setAttribute('aria-expanded', 'false');
        }
      }
      if (openFaq !== -1) {
        const item = document.getElementById('faq-' + openFaq);
        if (item) {
          item.classList.add('open');
          const q = item.querySelector('.faq-question');
          if (q) q.setAttribute('aria-expanded', 'true');
        }
      }
    }

    // Attach FAQ click handlers
    [0, 1, 2, 3, 4].forEach((i) => {
      const q = document.querySelector(`#faq-${i} .faq-question`);
      if (q) {
        (q as HTMLElement).onclick = () => toggleFaq(i);
        (q as HTMLElement).onkeydown = (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleFaq(i); }
        };
      }
    });

    // Open first FAQ by default
    toggleFaq(0);

    // ── Hamburger ──
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobileMenu');
    if (hamburger && mobileMenu) {
      hamburger.addEventListener('click', () => {
        const isOpen = mobileMenu.classList.toggle('open');
        hamburger.classList.toggle('open', isOpen);
        hamburger.setAttribute('aria-expanded', String(isOpen));
      });
      document.addEventListener('click', (e) => {
        if (!hamburger.contains(e.target as Node) && !mobileMenu.contains(e.target as Node)) {
          mobileMenu.classList.remove('open');
          hamburger.classList.remove('open');
          hamburger.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // ── Scroll reveal ──
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          (e.target as HTMLElement).style.opacity = '1';
          (e.target as HTMLElement).style.transform = 'translateY(0)';
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.features-grid > div, .faq-item').forEach((el) => {
      (el as HTMLElement).style.opacity = '0';
      (el as HTMLElement).style.transform = 'translateY(20px)';
      (el as HTMLElement).style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,500;1,9..40,600&display=swap');
        @import url('https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body {
          background: #EEF2F7;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-weight: 400;
          letter-spacing: -0.2px;
          line-height: 1.65;
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
        }
        h1, h2, h3 {
          font-family: 'Clash Display', 'DM Sans', sans-serif;
          font-weight: 500;
          letter-spacing: -1px;
          line-height: 1.05;
        }
        a { color: #6366f1; text-decoration: none; }
        a:hover { color: #4f46e5; }

        @keyframes floatY {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-14px); }
        }
        @keyframes floatY2 {
          0%, 100% { transform: translateY(0px) rotate(6deg); }
          50% { transform: translateY(-14px) rotate(6deg); }
        }
        @keyframes pulseRing {
          0%, 100% { opacity: .5; }
          50% { opacity: 1; }
        }
        @keyframes shimmer {
          0% { left: -40%; }
          100% { left: 110%; }
        }

        .iphone {
          position: relative;
          border-radius: 48px;
          overflow: hidden;
          box-shadow: 0 40px 80px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.15);
          background: #000;
          flex-shrink: 0;
        }
        .iphone::before {
          content: '';
          position: absolute;
          top: 11px;
          left: 50%;
          transform: translateX(-50%);
          width: 120px;
          height: 36px;
          border-radius: 24px;
          background: #000;
          z-index: 50;
        }
        .iphone-status {
          position: absolute;
          top: 0; left: 0; right: 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 24px 6px;
          z-index: 40;
          pointer-events: none;
        }
        .iphone-status .time {
          font-weight: 600;
          font-size: 16px;
          color: #fff;
        }
        .iphone-status .icons {
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .iphone-home {
          position: absolute;
          bottom: 8px;
          left: 50%;
          transform: translateX(-50%);
          width: 130px;
          height: 5px;
          border-radius: 100px;
          background: rgba(255,255,255,0.7);
          z-index: 60;
          pointer-events: none;
        }
        .iphone-content {
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        /* Navbar */
        .navbar {
          position: sticky;
          top: 0;
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px clamp(20px,5vw,56px);
          background: rgba(8,8,16,0.65);
          backdrop-filter: blur(20px) saturate(160%);
          -webkit-backdrop-filter: blur(20px) saturate(160%);
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .nav-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: 'Clash Display', sans-serif;
          font-weight: 800;
          font-size: 22px;
          color: #fff;
          text-decoration: none;
        }
        .nav-logo-icon {
          width: 30px; height: 30px;
          border-radius: 8px;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .nav-links {
          display: flex;
          gap: 36px;
          align-items: center;
          font-weight: 600;
          font-size: 15px;
          color: rgba(255,255,255,0.75);
        }
        .nav-links a {
          color: rgba(255,255,255,0.75);
          transition: color .2s;
        }
        .nav-links a:hover { color: #fff; }
        .nav-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .nav-signin {
          font-weight: 600;
          font-size: 15px;
          color: rgba(255,255,255,0.75);
          padding: 10px 6px;
          transition: color .2s;
        }
        .nav-signin:hover { color: #fff; }
        .btn-primary {
          font-family: 'Clash Display', sans-serif;
          font-weight: 500;
          font-size: 15px;
          color: #fff;
          background: #6366f1;
          padding: 11px 22px;
          border-radius: 100px;
          box-shadow: 0 8px 20px rgba(99,102,241,0.35);
          transition: background .2s, transform .15s, box-shadow .2s;
          white-space: nowrap;
        }
        .btn-primary:hover {
          background: #4f46e5;
          color: #fff;
          transform: translateY(-1px);
          box-shadow: 0 12px 28px rgba(99,102,241,0.45);
        }
        .hamburger {
          display: none;
          flex-direction: column;
          gap: 5px;
          cursor: pointer;
          padding: 4px;
          background: none;
          border: none;
        }
        .hamburger span {
          display: block;
          width: 22px;
          height: 2px;
          border-radius: 2px;
          background: rgba(255,255,255,0.8);
          transition: all .3s;
        }
        .hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
        .hamburger.open span:nth-child(2) { opacity: 0; }
        .hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
        .mobile-menu {
          display: none;
          flex-direction: column;
          gap: 0;
          background: rgba(8,8,16,0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-top: 1px solid rgba(255,255,255,0.1);
          padding: 8px 0 16px;
        }
        .mobile-menu.open { display: flex; }
        .mobile-menu a {
          font-weight: 600;
          font-size: 16px;
          color: rgba(255,255,255,0.8);
          padding: 14px clamp(20px,5vw,56px);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          transition: color .2s, background .2s;
        }
        .mobile-menu a:hover { color: #fff; background: rgba(255,255,255,0.04); }
        .mobile-menu .btn-primary-mobile {
          margin: 16px clamp(20px,5vw,56px) 0;
          display: block;
          text-align: center;
          background: #6366f1;
          color: #fff;
          border-radius: 100px;
          padding: 14px;
          font-family: 'Clash Display', sans-serif;
          font-weight: 500;
          font-size: 16px;
        }

        .btn-hero-white {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: 'Clash Display', sans-serif;
          font-weight: 500;
          font-size: 16px;
          color: #0a0a0a;
          background: #fff;
          padding: 15px 28px;
          border-radius: 100px;
          box-shadow: 0 10px 26px rgba(0,0,0,0.35);
          transition: transform .15s, box-shadow .2s;
        }
        .btn-hero-white:hover { color: #0a0a0a; transform: translateY(-2px); box-shadow: 0 14px 32px rgba(0,0,0,0.4); }
        .btn-hero-ghost {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: 'Clash Display', sans-serif;
          font-weight: 500;
          font-size: 16px;
          color: #fff;
          background: rgba(255,255,255,0.06);
          border: 1.5px solid rgba(255,255,255,0.25);
          padding: 14.5px 28px;
          border-radius: 100px;
          transition: background .2s, border-color .2s, transform .15s;
        }
        .btn-hero-ghost:hover { color: #fff; background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.4); transform: translateY(-2px); }

        .btn-pricing {
          position: relative;
          display: block;
          background: linear-gradient(135deg, #818cf8, #4f46e5);
          color: #fff;
          font-family: 'Clash Display', sans-serif;
          font-weight: 500;
          font-size: 16px;
          padding: 16px;
          border-radius: 100px;
          box-shadow: 0 0 0 1px rgba(139,146,255,0.4), 0 12px 32px rgba(99,102,241,0.5);
          overflow: hidden;
          text-align: center;
          transition: transform .15s, box-shadow .2s;
        }
        .btn-pricing:hover { color: #fff; transform: translateY(-2px); box-shadow: 0 0 0 1px rgba(139,146,255,0.5), 0 16px 40px rgba(99,102,241,0.65); }
        .btn-pricing::before {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 50%;
          height: 100%;
          background: linear-gradient(100deg, transparent, rgba(255,255,255,0.3), transparent);
          transform: skewX(-20deg);
          animation: shimmer 3s ease-in-out infinite;
        }

        .faq-item {
          background: #fff;
          border-radius: 16px;
          margin-bottom: 14px;
          border: 1px solid rgba(122,138,158,0.15);
          border-left: 1px solid rgba(122,138,158,0.15);
          overflow: hidden;
          box-shadow: 0 6px 20px rgba(20,30,60,0.05);
          transition: border-left .25s, box-shadow .25s;
        }
        .faq-item.open {
          border-left: 3px solid #6366f1;
          box-shadow: 0 6px 24px rgba(99,102,241,0.12);
        }
        .faq-question {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 22px 26px;
          cursor: pointer;
        }
        .faq-question h3 {
          font-family: 'DM Sans', sans-serif;
          font-weight: 600;
          font-size: 17px;
          color: #10131a;
          letter-spacing: -0.3px;
          line-height: 1.3;
        }
        .faq-icon {
          width: 32px; height: 32px;
          border-radius: 50%;
          background: rgba(99,102,241,0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: transform .25s, background .2s;
        }
        .faq-item.open .faq-icon { transform: rotate(180deg); background: rgba(99,102,241,0.14); }
        .faq-body {
          max-height: 0;
          overflow: hidden;
          transition: max-height .35s ease, padding .35s ease;
        }
        .faq-item.open .faq-body { max-height: 300px; }
        .faq-body p {
          padding: 0 26px 22px;
          font-size: 15px;
          color: #5a6a7e;
          line-height: 1.7;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        .how-steps { display: flex; flex-direction: column; gap: 36px; }
        .how-step { display: flex; gap: 20px; align-items: flex-start; }
        .step-num {
          width: 44px; height: 44px;
          border-radius: 14px;
          background: rgba(99,102,241,0.12);
          border: 1px solid rgba(99,102,241,0.25);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Clash Display', sans-serif;
          font-weight: 600; font-size: 18px; color: #6366f1;
          flex-shrink: 0;
        }
        .compare-table { width: 100%; border-collapse: collapse; border-radius: 20px; overflow: hidden; }
        .compare-table th { padding: 18px 20px; font-family: 'Clash Display', sans-serif; font-weight: 500; font-size: 15px; }
        .compare-table td { padding: 16px 20px; font-size: 15px; font-weight: 500; color: #2d3748; border-top: 1px solid rgba(122,138,158,0.12); }
        .compare-table .check { color: #22c55e; font-size: 18px; }
        .compare-table .cross { color: #f87171; font-size: 18px; }
        .stats-grid { display: flex; justify-content: center; align-items: center; gap: clamp(24px,6vw,72px); flex-wrap: wrap; }

        @media (max-width: 768px) {
          .nav-links { display: none; }
          .hamburger { display: flex; }
          .features-grid { grid-template-columns: 1fr; }
          .how-layout { flex-direction: column !important; }
          .stat-divider { display: none; }
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      {/* NAVBAR */}
      <nav className="navbar">
        <Link href="/" className="nav-logo">
          <div className="nav-logo-icon">
            <svg width="20" height="20" viewBox="0 0 34 34" fill="none">
              <path d="M17 2 L30 9.5 L30 24.5 L17 32 L4 24.5 L4 9.5 Z" fill="#0a0a0a"/>
              <path d="M9 12 L13 22 L17 14 L21 22 L25 12" stroke="#6366f1" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </div>
          Split<span style={{color:'#818cf8',borderBottom:'2px solid #818cf8',paddingBottom:'1px'}}>Wiz</span>
        </Link>
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#pricing">Pricing</a>
        </div>
        <div className="nav-actions">
          <Link href="/login" className="nav-signin">Sign in</Link>
          <Link href="/signup" className="btn-primary">Get started</Link>
          <button className="hamburger" id="hamburger" aria-label="Menu" aria-expanded="false">
            <span/><span/><span/>
          </button>
        </div>
      </nav>

      {/* MOBILE MENU */}
      <div className="mobile-menu" id="mobileMenu">
        <a href="#features">Features</a>
        <a href="#how-it-works">How it works</a>
        <a href="#pricing">Pricing</a>
        <Link href="/login">Sign in</Link>
        <Link href="/signup" className="btn-primary-mobile">Get started →</Link>
      </div>

      {/* HERO */}
      <div style={{background:'linear-gradient(160deg,#080810 0%,#0d0b1f 55%,#10132a 100%)',padding:'clamp(80px,12vw,140px) clamp(20px,6vw,56px) 0',textAlign:'center',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-60%)',width:'700px',height:'700px',borderRadius:'50%',background:'radial-gradient(circle,rgba(99,102,241,0.18) 0%,transparent 65%)',pointerEvents:'none'}}/>
        <div style={{display:'inline-flex',alignItems:'center',gap:'10px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'100px',padding:'9px 20px',fontSize:'14px',fontWeight:600,color:'rgba(255,255,255,0.8)',marginBottom:'32px',backdropFilter:'blur(12px)'}}>
          <span style={{width:'8px',height:'8px',borderRadius:'50%',background:'#45D881',display:'inline-block'}}/>
          Free · No hidden fees
        </div>
        <h1 style={{fontWeight:600,fontStyle:'italic',fontSize:'clamp(44px,7vw,88px)',maxWidth:'820px',margin:'0 auto 26px',color:'#fff',letterSpacing:'-2px'}}>
          Split trips,<br/>
          <span style={{color:'#818cf8'}}>not friendships.</span>
        </h1>
        <p style={{fontSize:'clamp(16px,2vw,19px)',color:'rgba(255,255,255,0.6)',maxWidth:'500px',margin:'0 auto 44px',lineHeight:1.65}}>
          Track who paid what, see who owes whom, and settle up instantly — free, for every trip.
        </p>
        <div style={{display:'flex',gap:'16px',justifyContent:'center',flexWrap:'wrap',marginBottom:'70px'}}>
          <Link href="/signup" className="btn-hero-white">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" fill="#0a0a0a"/></svg>
            Download for iOS
          </Link>
          <Link href="/signup" className="btn-hero-ghost">
            <svg width="16" height="18" viewBox="0 0 24 27" fill="none"><path d="M1.5 1.5L22.5 13.5L1.5 25.5V1.5Z" fill="rgba(255,255,255,0.8)"/></svg>
            Download for Android
          </Link>
        </div>

        {/* Phone Mockup */}
        <div style={{position:'relative',maxWidth:'900px',height:'clamp(560px,60vw,720px)',margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{position:'absolute',top:'50%',left:'50%',width:'clamp(420px,54vw,680px)',height:'clamp(420px,54vw,680px)',borderRadius:'50%',border:'1px solid rgba(99,102,241,0.16)',transform:'translate(-50%,-50%)',pointerEvents:'none'}}/>
          <div style={{position:'absolute',top:'50%',left:'50%',width:'clamp(320px,42vw,520px)',height:'clamp(320px,42vw,520px)',borderRadius:'50%',border:'1px solid rgba(99,102,241,0.24)',transform:'translate(-50%,-50%)',animation:'pulseRing 5s ease-in-out infinite',pointerEvents:'none'}}/>
          <div style={{position:'absolute',top:'50%',left:'50%',width:'clamp(220px,30vw,360px)',height:'clamp(220px,30vw,360px)',borderRadius:'50%',background:'radial-gradient(circle,rgba(129,140,248,0.55) 0%,rgba(99,102,241,0) 70%)',transform:'translate(-50%,-50%)',pointerEvents:'none'}}/>

          {/* Floating card left */}
          <div style={{position:'absolute',left:'clamp(0px,2vw,40px)',top:'14%',background:'rgba(255,255,255,0.14)',backdropFilter:'blur(20px)',border:'1px solid rgba(255,255,255,0.35)',borderRadius:'20px',padding:'18px 22px',boxShadow:'0 20px 40px rgba(20,30,60,0.18)',textAlign:'left',transform:'rotate(-6deg)',animation:'floatY 6s ease-in-out infinite',zIndex:5,overflow:'hidden'}}>
            <div style={{position:'absolute',right:'6px',bottom:'-8px',fontSize:'52px',opacity:0.15,transform:'rotate(-8deg)'}}>💵</div>
            <div style={{position:'relative',fontSize:'12px',fontWeight:500,color:'#3a4656',marginBottom:'6px'}}>Trip total</div>
            <div style={{position:'relative',fontSize:'24px',fontWeight:600,color:'#10131a'}}>$1,240.00</div>
          </div>

          {/* Floating card right */}
          <div style={{position:'absolute',right:'clamp(0px,2vw,40px)',bottom:'16%',background:'rgba(255,255,255,0.14)',backdropFilter:'blur(20px)',border:'1px solid rgba(255,255,255,0.35)',borderRadius:'20px',padding:'18px 22px',boxShadow:'0 20px 40px rgba(20,30,60,0.18)',textAlign:'left',animation:'floatY2 7s ease-in-out infinite 1s',zIndex:5,overflow:'hidden'}}>
            <div style={{position:'absolute',right:'0',top:'-10px',fontSize:'46px',opacity:0.18,transform:'rotate(10deg)'}}>✅</div>
            <div style={{position:'relative',fontSize:'12px',fontWeight:500,color:'#3a4656',marginBottom:'8px'}}>Settled</div>
            <div style={{position:'relative',display:'flex',alignItems:'center',gap:'8px'}}>
              <div style={{fontSize:'22px',fontWeight:600,color:'#10131a'}}>3/5</div>
              <div style={{width:'60px',height:'6px',background:'rgba(99,102,241,0.15)',borderRadius:'6px',overflow:'hidden'}}>
                <div style={{width:'60%',height:'100%',background:'#45D881'}}/>
              </div>
            </div>
          </div>

          {/* iPhone */}
          <div style={{position:'relative',zIndex:3}}>
            <div className="iphone" style={{width:'300px',height:'650px'}}>
              <div className="iphone-status">
                <span className="time" style={{fontSize:'15px'}}>9:41</span>
                <div className="icons">
                  <svg width="17" height="12" viewBox="0 0 19 12"><rect x="0" y="7.5" width="3.2" height="4.5" rx="0.7" fill="white"/><rect x="4.8" y="5" width="3.2" height="7" rx="0.7" fill="white"/><rect x="9.6" y="2.5" width="3.2" height="9.5" rx="0.7" fill="white"/><rect x="14.4" y="0" width="3.2" height="12" rx="0.7" fill="white"/></svg>
                  <svg width="25" height="12" viewBox="0 0 27 13"><rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke="white" strokeOpacity="0.35" fill="none"/><rect x="2" y="2" width="20" height="9" rx="2" fill="white"/></svg>
                </div>
              </div>
              <div className="iphone-content">
                <div style={{padding:'64px 22px 40px',height:'100%',background:'linear-gradient(160deg,#0f0c29 0%,#302b63 55%,#24243e 100%)',color:'#fff',position:'relative',overflow:'hidden'}}>
                  <div style={{position:'relative',fontSize:'13px',color:'rgba(255,255,255,0.5)',fontWeight:600}}>Good evening</div>
                  <div style={{position:'relative',fontSize:'22px',fontWeight:600,margin:'2px 0 20px'}}>Hello, Sarah 👋</div>
                  <div style={{position:'relative',background:'rgba(255,255,255,0.08)',backdropFilter:'blur(20px)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:'22px',padding:'20px',marginBottom:'16px'}}>
                    <div style={{fontSize:'12px',fontWeight:500,color:'rgba(255,255,255,0.65)'}}>Net balance</div>
                    <div style={{fontSize:'30px',fontWeight:600,marginTop:'6px'}}>+$83.50</div>
                  </div>
                  <div style={{display:'flex',gap:'10px',marginBottom:'20px'}}>
                    <div style={{flex:1,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'16px',padding:'14px'}}>
                      <div style={{fontSize:'11px',color:'rgba(255,255,255,0.5)',fontWeight:500}}>You owe</div>
                      <div style={{fontSize:'17px',fontWeight:600,color:'#FE1514',marginTop:'4px'}}>$32.00</div>
                    </div>
                    <div style={{flex:1,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'16px',padding:'14px'}}>
                      <div style={{fontSize:'11px',color:'rgba(255,255,255,0.5)',fontWeight:500}}>Owed to you</div>
                      <div style={{fontSize:'17px',fontWeight:600,color:'#45D881',marginTop:'4px'}}>$115.50</div>
                    </div>
                  </div>
                  <div style={{fontSize:'12px',fontWeight:500,color:'rgba(255,255,255,0.5)',marginBottom:'10px'}}>RECENT</div>
                  {[{icon:'🏖️',label:'Hotel',amt:'$220.00',color:'#6366f1'},{icon:'🍽️',label:'Dinner',amt:'$85.00',color:'#45D881'},{icon:'✈️',label:'Flight',amt:'$180.00',color:'#F59E0B'}].map((item)=>(
                    <div key={item.label} style={{display:'flex',alignItems:'center',gap:'10px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderLeft:`3px solid ${item.color}`,borderRadius:'14px',padding:'10px 12px',marginBottom:'10px'}}>
                      <div style={{width:'34px',height:'34px',borderRadius:'10px',background:'rgba(99,102,241,0.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px'}}>{item.icon}</div>
                      <div style={{flex:1,fontSize:'13px',fontWeight:500}}>{item.label}</div>
                      <div style={{fontSize:'13px',fontWeight:500}}>{item.amt}</div>
                    </div>
                  ))}
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
        <div className="stats-grid">
          {[{num:'500K+',label:'Trips Split'},{num:'$2M+',label:'Settled'},{num:'100%',label:'Free'}].map((s,i)=>(
            <>
              {i>0 && <div key={`d${i}`} className="stat-divider" style={{width:'1px',height:'56px',background:'rgba(122,138,158,0.25)'}}/>}
              <div key={s.num} style={{textAlign:'center'}}>
                <div style={{fontWeight:600,fontSize:'clamp(34px,5vw,56px)',color:'#10131a'}}>{s.num}</div>
                <div style={{fontWeight:600,fontSize:'15px',color:'#7a8a9e',marginTop:'4px'}}>{s.label}</div>
              </div>
            </>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <div id="features" style={{padding:'80px clamp(20px,6vw,56px)',background:'#050505'}}>
        <div style={{maxWidth:'1120px',margin:'0 auto'}}>
          <div style={{fontSize:'13px',fontWeight:600,color:'#6366f1',textTransform:'uppercase',letterSpacing:'2px',marginBottom:'12px'}}>Features</div>
          <h2 style={{fontWeight:600,fontSize:'clamp(32px,4vw,52px)',color:'#fff',marginBottom:'48px',maxWidth:'500px'}}>Everything a trip needs</h2>
          <div className="features-grid">
            {[
              {bg:'#0f0f0f',border:'rgba(99,102,241,0.2)',glow:'rgba(99,102,241,0.08)',icon:'💳',title:'Track Every Expense',desc:'Log meals, hotels, transport in seconds. Everyone sees the running total in real time.'},
              {bg:'#0f0f0f',border:'rgba(99,102,241,0.2)',glow:'rgba(99,102,241,0.06)',icon:'⚡',title:'Auto-Split Instantly',desc:'Equal, custom, or percentage splits. SplitWiz does the math so nobody has to.'},
              {bg:'#0f0f0f',border:'rgba(99,102,241,0.2)',glow:'rgba(139,92,246,0.06)',icon:'🔐',title:'Bank-Level Security',desc:'Every expense is encrypted and protected. Your financial data stays private and secure, always.'},
              {bg:'#0f0f0f',border:'rgba(99,102,241,0.2)',glow:'rgba(99,102,241,0.06)',icon:'🤝',title:'Settle with One Tap',desc:'Send reminders and mark debts settled. No awkward money conversations.'},
            ].map(f=>(
              <div key={f.title} style={{background:f.bg,border:`1px solid ${f.border}`,borderRadius:'24px',padding:'36px',position:'relative',overflow:'hidden',transition:'transform .25s',cursor:'default'}}>
                <div style={{position:'absolute',inset:0,background:`radial-gradient(circle at 20% 20%, ${f.glow}, transparent 60%)`,pointerEvents:'none'}}/>
                <div style={{fontSize:'32px',marginBottom:'20px'}}>{f.icon}</div>
                <div style={{fontFamily:'Clash Display, sans-serif',fontWeight:600,fontSize:'20px',color:'#fff',marginBottom:'10px'}}>{f.title}</div>
                <div style={{fontSize:'14px',color:'#888',lineHeight:1.65}}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div id="how-it-works" style={{background:'#080810',padding:'100px clamp(20px,6vw,56px)'}}>
        <div style={{maxWidth:'1120px',margin:'0 auto',display:'flex',gap:'80px',alignItems:'center',flexWrap:'wrap'}} className="how-layout">
          <div style={{flex:'1',minWidth:'280px'}}>
            <div style={{fontSize:'13px',fontWeight:600,color:'#6366f1',textTransform:'uppercase',letterSpacing:'2px',marginBottom:'12px'}}>How It Works</div>
            <h2 style={{fontWeight:600,fontSize:'clamp(28px,4vw,44px)',color:'#fff',marginBottom:'48px'}}>Three steps to a stress-free trip</h2>
            <div className="how-steps">
              {[
                {n:'1',title:'Create a trip',desc:'Name your trip and add friends in seconds — no accounts required.'},
                {n:'2',title:'Log expenses on the go',desc:'Snap it, add the amount, tag who paid. SplitWiz remembers the rest.'},
                {n:'3',title:'Settle in one tap',desc:'SplitWiz works out the fewest payments needed to square everyone up.'},
              ].map(s=>(
                <div key={s.n} className="how-step">
                  <div className="step-num">{s.n}</div>
                  <div>
                    <div style={{fontWeight:700,fontSize:'17px',color:'#fff',marginBottom:'6px'}}>{s.title}</div>
                    <div style={{fontSize:'14px',color:'#666',lineHeight:1.6}}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Mini phone */}
          <div style={{flex:'1',minWidth:'240px',display:'flex',justifyContent:'center'}}>
            <div className="iphone" style={{width:'240px',height:'480px'}}>
              <div className="iphone-content">
                <div style={{padding:'48px 16px 20px',height:'100%',background:'#0d0d1f',color:'#fff'}}>
                  <div style={{fontWeight:700,fontSize:'14px',marginBottom:'14px'}}>🏖️ Bali Trip 2025</div>
                  {[{icon:'✈️',label:'Flights',by:'Sarah',amt:'$450'},
                    {icon:'🏨',label:'Hotel',by:'Marco',amt:'$620'},
                    {icon:'🍜',label:'Dinner',by:'Priya',amt:'$85'},
                    {icon:'🛵',label:'Scooter',by:'Sarah',amt:'$40'},
                  ].map(e=>(
                    <div key={e.label} style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                      <div style={{width:'28px',height:'28px',borderRadius:'8px',background:'rgba(99,102,241,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px'}}>{e.icon}</div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:'11px',color:'#ccc',fontWeight:600}}>{e.label}</div>
                        <div style={{fontSize:'10px',color:'#555'}}>Paid by {e.by}</div>
                      </div>
                      <div style={{fontSize:'12px',fontWeight:700,color:'#fff'}}>{e.amt}</div>
                    </div>
                  ))}
                  <div style={{marginTop:'14px',width:'100%',padding:'12px',background:'#6366f1',borderRadius:'12px',textAlign:'center',fontSize:'13px',fontWeight:700,cursor:'pointer'}}>Settle Up Now →</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* COMPARISON */}
      <div style={{padding:'100px clamp(20px,6vw,56px)',background:'#F8F9FC'}}>
        <div style={{maxWidth:'860px',margin:'0 auto'}}>
          <div style={{textAlign:'center',fontSize:'13px',fontWeight:600,color:'#6366f1',textTransform:'uppercase',letterSpacing:'2px',marginBottom:'12px'}}>Comparison</div>
          <h2 style={{textAlign:'center',fontWeight:600,fontSize:'clamp(28px,4vw,48px)',color:'#10131a',marginBottom:'12px'}}>SplitWiz vs the rest</h2>
          <p style={{textAlign:'center',color:'#7a8a9e',marginBottom:'48px'}}>Why groups are switching.</p>
          <div style={{borderRadius:'24px',overflow:'hidden',border:'1px solid rgba(122,138,158,0.15)',boxShadow:'0 20px 60px rgba(20,30,60,0.07)'}}>
            <table className="compare-table" style={{background:'#fff'}}>
              <thead>
                <tr style={{background:'#0a0a0a'}}>
                  <th style={{textAlign:'left',color:'#555',fontSize:'12px',textTransform:'uppercase',letterSpacing:'1px'}}>Feature</th>
                  <th style={{background:'#6366f1',color:'#fff'}}>SplitWiz</th>
                  <th style={{color:'#888'}}>Splitwise</th>
                  <th style={{color:'#888'}}>Spreadsheet</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Free forever','✓','✗','✓'],
                  ['No sign-up required','✓','✗','✓'],
                  ['Instant settle-up','✓','✓','✗'],
                  ['Smart split suggestions','✓','✗','✗'],
                  ['Multi-currency support','✓','✓','✗'],
                  ['Works offline','✓','✗','✗'],
                ].map(([feat,...vals])=>(
                  <tr key={feat}>
                    <td style={{fontWeight:600,color:'#2d3748'}}>{feat}</td>
                    {vals.map((v,i)=>(
                      <td key={i} style={{textAlign:'center'}} className={v==='✓'?'check':'cross'}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* TESTIMONIAL */}
      <div style={{padding:'100px clamp(20px,6vw,56px)',background:'#EEF2F7',textAlign:'center'}}>
        <div style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:'72px',height:'72px',borderRadius:'50%',background:'radial-gradient(circle,rgba(203,216,234,0.9),rgba(238,242,247,0.5))',border:'1.5px solid rgba(175,197,224,0.5)',boxShadow:'0 0 0 12px rgba(175,197,224,0.12)',fontSize:'14px',fontWeight:700,color:'#1a1f2e',marginBottom:'48px'}}>Review</div>
        <blockquote style={{maxWidth:'640px',margin:'0 auto 32px',fontSize:'clamp(20px,3vw,28px)',fontWeight:600,color:'#10131a',lineHeight:1.45,letterSpacing:'-0.5px',fontStyle:'italic'}}>
          <span style={{color:'#6366f1',fontSize:'48px',lineHeight:0,verticalAlign:'-14px',marginRight:'4px'}}>&ldquo;</span>
          We split a two-week trip across four currencies and never opened a spreadsheet once. Settling up at the airport took thirty seconds.
        </blockquote>
        <div style={{display:'flex',alignItems:'center',gap:'14px',justifyContent:'center'}}>
          <div style={{width:'48px',height:'48px',borderRadius:'50%',background:'linear-gradient(135deg,#6366f1,#818cf8)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',fontWeight:700,color:'#fff'}}>JM</div>
          <div style={{textAlign:'left'}}>
            <div style={{fontWeight:700,fontSize:'15px',color:'#10131a'}}>Jamie Moreno</div>
            <div style={{fontSize:'13px',color:'#7a8a9e'}}>Trip organizer, Lisbon &apos;25</div>
          </div>
        </div>
      </div>

      {/* PRICING */}
      <div id="pricing" style={{padding:'100px clamp(20px,6vw,56px)',background:'#F8F9FC',textAlign:'center'}}>
        <div style={{fontSize:'13px',fontWeight:600,color:'#6366f1',textTransform:'uppercase',letterSpacing:'2px',marginBottom:'12px'}}>Pricing</div>
        <h2 style={{fontWeight:600,fontSize:'clamp(28px,4vw,48px)',color:'#10131a',marginBottom:'12px'}}>Always free. Really.</h2>
        <div style={{maxWidth:'480px',margin:'48px auto 0',background:'#fff',borderRadius:'28px',padding:'48px',border:'1px solid rgba(122,138,158,0.15)',boxShadow:'0 30px 60px rgba(99,102,241,0.07)'}}>
          <div style={{fontSize:'13px',fontWeight:600,color:'#6366f1',marginBottom:'16px'}}>Free, forever</div>
          <div style={{fontSize:'64px',fontWeight:700,color:'#10131a',letterSpacing:'-3px',lineHeight:1}}>$0<span style={{fontSize:'18px',fontWeight:500,color:'#7a8a9e'}}>/forever</span></div>
          <div style={{fontSize:'14px',color:'#7a8a9e',margin:'16px 0 32px'}}>Everything you need. No trials, no upsells.</div>
          <div style={{textAlign:'left',marginBottom:'32px'}}>
            {['Unlimited trips & expenses','Unlimited friends & groups','Smart settle-up suggestions','Multi-currency support','No ads, ever'].map(f=>(
              <div key={f} style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px 0',borderBottom:'1px solid rgba(122,138,158,0.1)',fontSize:'15px',fontWeight:500,color:'#2d3748'}}>
                <span style={{color:'#22c55e',fontWeight:700}}>✓</span>{f}
              </div>
            ))}
          </div>
          <Link href="/signup" className="btn-pricing">Get started free →</Link>
        </div>
      </div>

      {/* FAQ */}
      <div style={{padding:'100px clamp(20px,6vw,56px)',background:'#F8F9FC'}}>
        <div style={{maxWidth:'760px',margin:'0 auto'}}>
          <div style={{textAlign:'center',fontSize:'13px',fontWeight:600,color:'#6366f1',textTransform:'uppercase',letterSpacing:'2px',marginBottom:'12px'}}>FAQ</div>
          <h2 style={{textAlign:'center',fontWeight:600,fontSize:'clamp(28px,4vw,44px)',color:'#10131a',marginBottom:'48px'}}>Frequently asked questions</h2>
          {[
            {q:'What exactly is SplitWiz?',a:'SplitWiz is a free app for tracking and splitting shared expenses on trips — who paid, who owes, and how to settle up, all in one place.'},
            {q:'Do I need to create an account?',a:'No. You can start a trip and invite friends by link without signing up. An account just lets you sync across devices.'},
            {q:'How does the splitting logic work?',a:'Split evenly, by exact amounts, or by percentage. SplitWiz then calculates the minimum number of payments needed to settle every balance.'},
            {q:'Is SplitWiz really free, forever?',a:'Yes — unlimited trips, expenses, and friends, with no ads and no premium tier. It always will be.'},
            {q:'Can I use SplitWiz without an internet connection?',a:'Yes. Add expenses offline and they sync automatically the next time you have a connection.'},
          ].map((faq,i)=>(
            <div key={i} className="faq-item" id={`faq-${i}`}>
              <div className="faq-question" role="button" tabIndex={0} aria-expanded="false">
                <h3>{faq.q}</h3>
                <div className="faq-icon">
                  <svg width="12" height="8" viewBox="0 0 12 8"><path d="M1 1l5 5 5-5" stroke="#6366f1" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              </div>
              <div className="faq-body"><p>{faq.a}</p></div>
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
            <span style={{position:'absolute',inset:'-20px',background:'#6366f1',opacity:0.25,filter:'blur(30px)',zIndex:-1}}/>
            Settle smartly.
          </span>
        </h2>
        <div style={{display:'flex',gap:'16px',justifyContent:'center',flexWrap:'wrap'}}>
          <Link href="/signup" className="btn-hero-white">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" fill="#0a0a0a"/></svg>
            Download for iOS
          </Link>
          <Link href="/signup" className="btn-hero-ghost">
            <svg width="16" height="18" viewBox="0 0 24 27" fill="none"><path d="M1.5 1.5L22.5 13.5L1.5 25.5V1.5Z" fill="rgba(255,255,255,0.8)"/></svg>
            Download for Android
          </Link>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{background:'#0a0a0a',borderTop:'1px solid rgba(255,255,255,0.08)',padding:'64px clamp(20px,6vw,56px) 32px'}}>
        <div className="footer-grid" style={{maxWidth:'1120px',margin:'0 auto',display:'grid',gridTemplateColumns:'1.4fr 1fr 1fr 1fr',gap:'40px'}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:'8px',fontFamily:'Clash Display, sans-serif',fontWeight:800,fontSize:'20px',color:'#fff',marginBottom:'10px'}}>
              <div style={{width:'26px',height:'26px',borderRadius:'7px',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <svg width="20" height="20" viewBox="0 0 34 34" fill="none"><path d="M17 2 L30 9.5 L30 24.5 L17 32 L4 24.5 L4 9.5 Z" fill="#0a0a0a"/><path d="M9 12 L13 22 L17 14 L21 22 L25 12" stroke="#6366f1" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
              </div>
              Split<span style={{color:'#818cf8',borderBottom:'2px solid #818cf8',paddingBottom:'1px'}}>Wiz</span>
            </div>
            <div style={{fontWeight:500,fontSize:'14px',color:'rgba(255,255,255,0.45)',maxWidth:'220px'}}>Split trips, not friendships.</div>
          </div>
          {[
            {title:'PRODUCT',links:[{l:'Features',h:'#features'},{l:'How it works',h:'#how-it-works'},{l:'Pricing',h:'#pricing'},{l:'Open App',h:'/dashboard'}]},
            {title:'COMPANY',links:[{l:'About',h:'/dashboard'},{l:'Blog',h:'/dashboard'},{l:'Careers',h:'/dashboard'},{l:'Contact',h:'/dashboard'}]},
            {title:'LEGAL',links:[{l:'Privacy',h:'/dashboard'},{l:'Terms',h:'/dashboard'},{l:'Cookies',h:'/dashboard'}]},
          ].map(col=>(
            <div key={col.title} style={{display:'flex',flexDirection:'column',gap:'12px'}}>
              <div style={{fontWeight:500,fontSize:'13px',color:'rgba(255,255,255,0.35)',marginBottom:'4px'}}>{col.title}</div>
              {col.links.map(lk=>(
                <Link key={lk.l} href={lk.h} style={{fontWeight:500,fontSize:'14px',color:'rgba(255,255,255,0.65)'}}>{lk.l}</Link>
              ))}
            </div>
          ))}
        </div>
        <div style={{maxWidth:'1120px',margin:'48px auto 0',paddingTop:'24px',borderTop:'1px solid rgba(255,255,255,0.08)',fontWeight:500,fontSize:'13px',color:'rgba(255,255,255,0.35)',textAlign:'center'}}>© 2026 SplitWiz. Made for travelers.</div>
      </div>
    </>
  );
}
