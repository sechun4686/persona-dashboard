import React from 'react';

const LandingPage = ({ onStart }) => {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Noto+Sans+KR:wght@400;500;700&family=Inria+Serif:ital,wght@0,400;0,700;1,400&display=swap');

        .landing-wrap {
          min-height: 100vh;
          background-image: url('/bg.png');
          background-size: cover;
          background-position: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 60px 40px 0 40px;
          position: relative;
          overflow: hidden;
        }

        .landing-title {
          font-family: 'Noto Sans KR', sans-serif;
          font-weight: 700;
          font-size: 56px;
          color: #ffffff;
          line-height: 1.2;
          margin: 0 0 12px 0;
          letter-spacing: -0.02em;
        }

        .landing-subtitle {
          font-family: 'Inria Serif', serif;
          font-weight: 400;
          font-size: 18px;
          color: #6b7280;
          margin: 0 0 36px 0;
          letter-spacing: 0.01em;
        }

        .landing-btn {
          font-family: 'Noto Sans KR', sans-serif;
          font-weight: 500;
          font-size: 16px;
          color: #1a1a2e;
          background: rgba(255,255,255,0.85);
          border: 1.5px solid rgba(100,100,150,0.2);
          border-radius: 999px;
          padding: 14px 36px;
          cursor: pointer;
          margin-bottom: 40px;
          backdrop-filter: blur(8px);
          transition: all 0.2s;
        }

        .landing-btn:hover {
          background: rgba(255,255,255,1);
          transform: translateY(-1px);
        }

        .landing-desc {
          font-family: 'Noto Sans KR', sans-serif;
          font-weight: 400;
          font-size: 14px;
          color: #6b7280;
          line-height: 1.8;
          margin: 0 0 40px 0;
        }

        .landing-card-wrap {
          display: flex;
          gap: 16px;
          justify-content: center;
          flex-wrap: wrap;
          margin-bottom: 48px;
        }

        .landing-card {
          background: rgba(255,255,255,0.7);
          border: 1px solid rgba(255,255,255,0.9);
          border-radius: 16px;
          padding: 20px 24px;
          min-width: 160px;
          backdrop-filter: blur(12px);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }

        .landing-card-title {
          font-family: 'Noto Sans KR', sans-serif;
          font-weight: 500;
          font-size: 13px;
          color: #1a1a2e;
        }

        .landing-card-desc {
          font-family: 'Inter', sans-serif;
          font-weight: 400;
          font-size: 11px;
          color: #9ca3af;
          text-align: center;
          line-height: 1.5;
        }

        .landing-mockup {
          width: 90%;
          max-width: 900px;
          border-radius: 20px 20px 0 0;
          overflow: hidden;
          box-shadow: 0 -12px 48px rgba(100,100,150,0.12);
        }

        .landing-mockup img {
          width: 100%;
          display: block;
        }
      `}</style>

      <div className="landing-wrap">
        <h1 className="landing-title">가상 사용자 리서치 플랫폼</h1>
        <p className="landing-subtitle">Using Korean Synthetic Personas</p>

        <button className="landing-btn" onClick={onStart}>
          ▷ 실험 시작하기
        </button>

        <p className="landing-desc">
          700만 한국 합성 페르소나 데이터로<br />
          실제 사용자 모집 없이 빠르고 정확한 리서치를
        </p>

        <div className="landing-card-wrap">
          {[
            { title: '빠른 리서치', desc: '몇 분 안에 수백 명\n응답 수집' },
            { title: '정밀한 타겟팅', desc: '성별·나이·지역·직업\n필터 지원' },
            { title: '자동 분석', desc: 'AI 군집화 및\n인사이트 도출' },
          ].map((f, i) => (
            <div key={i} className="landing-card">
              <span className="landing-card-title">{f.title}</span>
              <span className="landing-card-desc">
                {f.desc.split('\n').map((t, j) => <span key={j}>{t}<br /></span>)}
              </span>
            </div>
          ))}
        </div>

        <div className="landing-mockup">
          <img src="/mockup.png" alt="결과 예시" />
        </div>
      </div>
    </>
  );
};

export default LandingPage;