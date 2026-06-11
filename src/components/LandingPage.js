import React from 'react';

const LandingPage = ({ onStart }) => {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;800&family=Inter:wght@500;700;800&display=swap');

        * { box-sizing: border-box; }

        .lp-root {
          min-height: 100vh;
          background: radial-gradient(100% 100% at 50% 0%, rgba(243, 244, 255, 0.8) 0%, #f8fafc 100%);
          font-family: 'Noto Sans KR', sans-serif;
          position: relative;
          overflow: hidden;
        }

        /* 상단 네비게이션 */
        .lp-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 48px;
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(241, 245, 249, 0.8);
          position: relative;
          z-index: 10;
        }
        .lp-nav-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .lp-logo-text {
          display: flex;
          flex-direction: column;
          line-height: 1.1;
        }
        .lp-logo-title {
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.02em;
        }
        .lp-logo-sub {
          font-size: 10px;
          color: #64748b;
          font-weight: 500;
        }
        .lp-nav-right {
          display: flex;
          align-items: center;
          gap: 32px;
        }
        .lp-nav-item {
          font-size: 14px;
          font-weight: 500;
          color: #475569;
          cursor: pointer;
          transition: color 0.2s ease;
        }
        .lp-nav-item:hover { color: #4f46e5; }
        
        .lp-nav-btn {
          font-size: 14px;
          font-weight: 600;
          color: #4f46e5;
          background: #eeebff;
          padding: 8px 16px;
          border-radius: 99px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .lp-nav-btn:hover {
          background: #4f46e5;
          color: #fff;
        }

        /* ★ 메인 히어로 섹션 여백 조정 ★ */
        .lp-hero {
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 1200px;
          margin: 0 auto;
          /* 기존 상단 padding 100px -> 150px로 늘려 전체적으로 위치를 내림 */
          padding: 150px 48px 120px 48px;
          gap: 64px;
          position: relative;
          z-index: 2;
        }
        
        .lp-hero-left { 
          flex: 1.1; 
          max-width: 560px; 
        }

        .lp-hello {
          font-family: 'Inter', sans-serif;
          font-size: 15px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0 0 12px 0;
        }
        
        .lp-title {
          font-size: 42px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 24px 0;
          line-height: 1.3;
          letter-spacing: -0.02em;
        }
        
        .lp-desc {
          font-size: 17px;
          color: #475569;
          line-height: 1.75;
          margin: 0 0 40px 0;
        }
        
        .lp-btn {
          font-family: 'Noto Sans KR', sans-serif;
          font-size: 17px;
          font-weight: 700;
          color: #fff;
          background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
          border: none;
          border-radius: 999px;
          padding: 18px 54px;
          cursor: pointer;
          box-shadow: 0 10px 28px rgba(79, 70, 229, 0.3);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .lp-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 16px 36px rgba(79, 70, 229, 0.45);
        }

        .lp-hero-right {
          flex: 0.9;
          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;
        }

        /* ★ 배경 유기적 그래픽(Blob) 위치 보정 ★ */
        .lp-blob-container {
          position: absolute;
          z-index: 1;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }
        .lp-blob-1 {
          position: absolute;
          width: 320px;
          height: 320px;
          /* 콘텐츠가 내려간 만큼 그라데이션 광채도 자연스럽게 맞춰 올라가 보이도록 top 조정 */
          top: -60px;
          right: -40px;
          background: radial-gradient(circle, rgba(124, 58, 237, 0.15) 0%, rgba(255,255,255,0) 70%);
          filter: blur(30px);
        }
        .lp-blob-2 {
          position: absolute;
          width: 350px;
          height: 350px;
          bottom: -50px;
          left: -20px;
          background: radial-gradient(circle, rgba(79, 70, 229, 0.15) 0%, rgba(255,255,255,0) 70%);
          filter: blur(40px);
        }

        @media (max-width: 960px) {
          /* 모바일 반응형에서도 상단 여백을 확보하도록 수정 */
          .lp-hero { flex-direction: column; text-align: center; padding: 100px 24px 60px 24px; gap: 40px; }
          .lp-hero-right { margin-top: 20px; width: 100%; }
          .lp-title { font-size: 34px; }
          .lp-desc { font-size: 15px; }
        }
      `}</style>

      <div className="lp-root">
        {/* 네비게이션 */}
        <nav className="lp-nav">
          <div className="lp-nav-left">
            <Logo size={42} />
            <div className="lp-logo-text">
              <span className="lp-logo-title">K-Persona Lab</span>
              <span className="lp-logo-sub">for virtual user research</span>
            </div>
          </div>
          <div className="lp-nav-right">
            <span className="lp-nav-item">홈</span>
            <span className="lp-nav-btn" onClick={onStart}>실험하기</span>
          </div>
        </nav>

        {/* 본문 히어로 영역 */}
        <div className="lp-hero">
          <div className="lp-hero-left">
            <p className="lp-hello">Virtual User Panel Platform</p>
            <h1 className="lp-title">가상 사용자로<br />리서치를 시작하세요.</h1>
            <p className="lp-desc">
              700만 한국 합성 페르소나 데이터로<br />
              실제 사용자 모집 없이 빠르고 정확한 리서치를 경험해 보세요.
            </p>
            <button className="lp-btn" onClick={onStart}>실험 시작하기</button>
          </div>
          
          <div className="lp-hero-right">
            <div className="lp-blob-container">
              <div className="lp-blob-1" />
              <div className="lp-blob-2" />
            </div>
            <HeroIllustration />
          </div>
        </div>
      </div>
    </>
  );
};

const Logo = ({ size = 42 }) => (
  <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
    <circle cx="22" cy="22" r="20" stroke="#4f46e5" strokeWidth="2.5" fill="#f5f3ff"/>
    <path d="M16 13 V31 M16 22 L29 13 M16 22 L29 31" stroke="#4f46e5" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="29" cy="13" r="3" fill="#7c3aed"/>
    <circle cx="29" cy="31" r="3" fill="#7c3aed"/>
    <circle cx="16" cy="22" r="3" fill="#4f46e5"/>
    <circle cx="16" cy="13" r="3" fill="#4f46e5"/>
    <circle cx="16" cy="31" r="3" fill="#4f46e5"/>
  </svg>
);

const HeroIllustration = () => (
  <svg width="460" height="400" viewBox="0 0 460 400" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: 'relative', zIndex: 2 }}>
    <g filter="url(#dashboard-shadow)">
      <rect x="30" y="40" width="320" height="240" rx="20" fill="#ffffff" />
      <rect x="30" y="40" width="320" height="240" rx="20" fill="url(#card-bg-gradient)" opacity="0.4" />
      <circle cx="70" cy="75" r="14" fill="#e0e7ff"/>
      <rect x="96" y="66" width="110" height="8" rx="4" fill="#e2e8f0"/>
      <rect x="96" y="80" width="70" height="6" rx="3" fill="#f1f5f9"/>

      <rect x="65" y="150" width="24" height="80" rx="6" fill="#c7d2fe"/>
      <rect x="97" y="120" width="24" height="110" rx="6" fill="#818cf8"/>
      <rect x="129" y="165" width="24" height="65" rx="6" fill="#c7d2fe"/>
      <rect x="161" y="135" width="24" height="95" rx="6" fill="#4f46e5"/>

      <circle cx="265" cy="165" r="44" fill="none" stroke="#f1f5f9" strokeWidth="14"/>
      <circle cx="265" cy="165" r="44" fill="none" stroke="#7c3aed" strokeWidth="14"
        strokeDasharray="160 276" strokeLinecap="round" transform="rotate(-110 265 165)"/>
    </g>

    <g filter="url(#profile-shadow)">
      <rect x="210" y="140" width="200" height="210" rx="22" fill="#ffffff" stroke="#f1f5f9" strokeWidth="1"/>
      <circle cx="310" cy="195" r="32" fill="#f5f3ff" />
      
      <circle cx="310" cy="187" r="12" fill="#818cf8"/>
      <path d="M290 220 Q310 200 330 220 Z" fill="#818cf8"/>
      
      <rect x="245" y="250" width="130" height="9" rx="4.5" fill="#e2e8f0"/>
      <rect x="245" y="268" width="90" height="7" rx="3.5" fill="#f1f5f9"/>
      
      <rect x="240" y="292" width="140" height="32" rx="10" fill="#f3f4f6"/>
      <rect x="255" y="303" width="70" height="10" rx="5" fill="#94a3b8"/>
    </g>

    <circle cx="25" cy="320" r="8" fill="#7c3aed" opacity="0.4"/>
    <circle cx="430" cy="90" r="11" fill="#4f46e5" opacity="0.3"/>
    <circle cx="410" cy="150" r="6" fill="#7c3aed" opacity="0.5"/>

    <defs>
      <filter id="dashboard-shadow" x="10" y="25" width="370" height="290" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feDropShadow dx="0" dy="12" stdDeviation="16" floodColor="#0f172a" floodOpacity="0.06" />
      </filter>
      <filter id="profile-shadow" x="185" y="120" width="250" height="260" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feDropShadow dx="4" dy="20" stdDeviation="20" floodColor="#4f46e5" floodOpacity="0.12" />
      </filter>
      <linearGradient id="card-bg-gradient" x1="30" y1="40" x2="350" y2="280" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#f5f3ff" />
        <stop offset="100%" stopColor="#ffffff" />
      </linearGradient>
    </defs>
  </svg>
);

export default LandingPage;