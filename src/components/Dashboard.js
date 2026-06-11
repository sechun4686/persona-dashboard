import React, { useState, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts';

const dummyData = [
  { persona_id: 'P001', age: 25, gender: '여', region: '서울', occupation: '사무원', response: '저는 새로운 제품이 출시되면 바로 구매하는 편이에요.', cluster: 3, cluster_summary: '리서치형 소비자' },
  { persona_id: 'P002', age: 32, gender: '남', region: '경기', occupation: '개발자', response: '가격 대비 성능을 꼼꼼히 따져보고 구매합니다.', cluster: 3, cluster_summary: '리서치형 소비자' },
  { persona_id: 'P003', age: 28, gender: '여', region: '부산', occupation: '디자이너', response: '유튜브를 하루에 3시간 이상 봐요.', cluster: 2, cluster_summary: '디지털 몰입형 미니멀콘' },
  { persona_id: 'P004', age: 45, gender: '남', region: '서울', occupation: '교사', response: '가족과 함께하는 시간이 가장 중요해요.', cluster: 0, cluster_summary: '관계중시 입소문족' },
  { persona_id: 'P005', age: 22, gender: '여', region: '인천', occupation: '학생', response: '넷플릭스 드라마를 몰아보는 걸 좋아해요.', cluster: 2, cluster_summary: '디지털 몰입형 미니멀콘' },
  { persona_id: 'P006', age: 38, gender: '남', region: '대구', occupation: '자영업', response: '친구들과 자주 만나요.', cluster: 0, cluster_summary: '관계중시 입소문족' },
  { persona_id: 'P007', age: 29, gender: '여', region: '경기', occupation: '간호사', response: '식단 관리를 철저히 해요.', cluster: 1, cluster_summary: '건강환경형 식단가이드' },
  { persona_id: 'P008', age: 51, gender: '남', region: '서울', occupation: '관리자', response: '브랜드보다는 후기를 먼저 봐요.', cluster: 3, cluster_summary: '리서치형 소비자' },
  { persona_id: 'P009', age: 24, gender: '여', region: '부산', occupation: '학생', response: '채식을 지향해요.', cluster: 1, cluster_summary: '건강환경형 식단가이드' },
  { persona_id: 'P010', age: 35, gender: '남', region: '서울', occupation: '개발자', response: '뉴스는 포털 앱으로만 봐요.', cluster: 2, cluster_summary: '디지털 몰입형 미니멀콘' },
];

function parseApiResult(apiResult) {
  if (!apiResult || !apiResult.personas || !apiResult.responses) return null;

  const personaMap = {};
  apiResult.personas.forEach(p => {
    personaMap[p.persona_uuid] = p;
  });

  const rows = [];

  apiResult.responses.forEach((r, i) => {
    if (r.question_id !== 0) return;
    if (!r.response && !r.selected_option) return;
    const persona = personaMap[r.persona_uuid] || {};
    rows.push({
      persona_id: r.persona_uuid?.slice(0, 8) || `P${String(i).padStart(3, '0')}`,
      age: persona.age || 0,
      gender: persona.sex === '여자' ? '여' : persona.sex === '남자' ? '남' : persona.sex || '?',
      region: persona.province || '?',
      occupation: persona.occupation || '?',
      response: r.response || r.selected_option || '',
      cluster: r.cluster !== null && r.cluster !== undefined ? r.cluster : 0,
      cluster_summary: r.cluster_summary || '분석 대기중',
    });
  });

  return rows.length > 0 ? rows : null;
}

export default function Dashboard({ experimentData, onBack }) {
  const dashboardRef = useRef(null);
  const [genderFilter, setGenderFilter] = useState('전체');
  const [regionFilter, setRegionFilter] = useState('전체');

  const downloadPNG = async () => {
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(dashboardRef.current, {
      scale: 2,
      useCORS: true,
      scrollY: 0,
      windowWidth: dashboardRef.current.scrollWidth,
      windowHeight: dashboardRef.current.scrollHeight,
    });
    const link = document.createElement('a');
    link.download = 'dashboard.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const downloadPDF = async () => {
    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF } = await import('jspdf');
    const canvas = await html2canvas(dashboardRef.current, {
      scale: 2,
      useCORS: true,
      scrollY: 0,
      windowWidth: dashboardRef.current.scrollWidth,
      windowHeight: dashboardRef.current.scrollHeight,
    });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = imgWidth / pdfWidth;
    const totalHeight = imgHeight / ratio;
    let position = 0;

    while (position < totalHeight) {
      pdf.addImage(imgData, 'PNG', 0, -position, pdfWidth, totalHeight);
      position += pdfHeight;
      if (position < totalHeight) {
        pdf.addPage();
      }
    }
    pdf.save('dashboard.pdf');
  };

  const apiParsed = experimentData?.apiResult ? parseApiResult(experimentData.apiResult) : null;
  const baseData = apiParsed || dummyData;
  const isRealData = !!apiParsed;
  const overallReport = experimentData?.apiResult?.overall_report;

  const filtered = baseData.filter(d =>
    (genderFilter === '전체' || d.gender === genderFilter) &&
    (regionFilter === '전체' || d.region === regionFilter)
  );

  const clusterCounts = Object.values(
    filtered.reduce((acc, d) => {
      if (!acc[d.cluster_summary]) acc[d.cluster_summary] = { name: d.cluster_summary, count: 0 };
      acc[d.cluster_summary].count++;
      return acc;
    }, {})
  );

  const genderCounts = Object.values(
    filtered.reduce((acc, d) => {
      if (!acc[d.gender]) acc[d.gender] = { name: d.gender, value: 0 };
      acc[d.gender].value++;
      return acc;
    }, {})
  );

  const regions = [...new Set(baseData.map(d => d.region))];
  const clusters = [...new Set(baseData.map(d => d.cluster_summary))];
  const heatmapData = regions.map(region => {
    const row = { region };
    clusters.forEach(cluster => {
      row[cluster] = filtered.filter(d => d.region === region && d.cluster_summary === cluster).length;
    });
    return row;
  });

  const allRegions = ['전체', ...new Set(baseData.map(d => d.region))];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;800&family=Inter:wght@500;700;800&display=swap');

        * { box-sizing: border-box; }

        .db-root {
          min-height: 100vh;
          font-family: 'Noto Sans KR', sans-serif;
          color: #0f172a;
          padding-bottom: 100px;
          background-color: #f8fafc;
          background-image: 
            linear-gradient(to right, rgba(79, 70, 229, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(79, 70, 229, 0.03) 1px, transparent 1px);
          background-size: 32px 32px;
        }

        .lp-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 48px;
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(241, 245, 249, 0.8);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .lp-nav-left {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
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

        .db-container {
          max-width: 1140px;
          margin: 40px auto 0 auto;
          padding: 0 24px;
        }

        .db-header-card {
          background: #ffffff;
          border-radius: 20px;
          border: 1px solid rgba(241, 245, 249, 0.9);
          padding: 24px 28px;
          margin-bottom: 24px;
          box-shadow: 0 10px 25px rgba(15, 23, 42, 0.02);
        }
        .db-title-block {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .db-title-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        .db-back-btn {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #475569;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          transition: all 0.2s ease;
        }
        .db-back-btn:hover {
          background: #f1f5f9;
          color: #4f46e5;
          border-color: #cbd5e1;
        }
        .db-title-left h1 {
          margin: 0; font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em;
        }
        
        .db-export-btn {
          padding: 9px 18px; border-radius: 10px;
          border: 1px solid #e2e8f0; background: #ffffff;
          color: #475569; cursor: pointer; font-size: 13.5px;
          font-family: inherit; font-weight: 600;
          transition: all 0.2s ease;
          display: inline-flex; align-items: center; gap: 6px;
        }
        .db-export-btn:hover {
          background: #f8fafc; color: #0f172a; border-color: #cbd5e1;
        }

        .db-badge {
          background: #f1f5f9; color: #475569;
          padding: 5px 14px; border-radius: 99px; font-size: 12.5px; font-weight: 600;
        }
        .db-badge.primary { background: #e0e7ff; color: #4f46e5; }
        .db-badge.warning { background: #fff3cd; color: #856404; }

        .db-card {
          background: #ffffff; padding: 26px; border-radius: 20px;
          border: 1px solid rgba(241, 245, 249, 0.9);
          box-shadow: 0 10px 25px rgba(15, 23, 42, 0.03);
        }
        .db-card h3 {
          color: #0f172a; margin: 0 0 4px 0; font-size: 16px; font-weight: 800; letter-spacing: -0.01em;
        }
        .db-card-desc {
          color: #64748b; font-size: 13px; margin: 0 0 24px 0;
        }

        .db-metrics-grid {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px;
        }
        .db-metric-item {
          background: #ffffff; border-radius: 18px; padding: 20px; text-align: center;
          border: 1px solid rgba(241, 245, 249, 0.9);
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.02);
        }
        .db-metric-label { color: #64748b; margin: 0 0 6px 0; font-size: 13px; font-weight: 500; }
        .db-metric-value { font-size: 26px; font-weight: 800; color: #4f46e5; margin: 0; letter-spacing: -0.02em; }

        .db-filter-bar {
          background: #ffffff; padding: 18px 24px; border-radius: 16px;
          border: 1px solid rgba(241, 245, 249, 0.9);
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.02);
          display: flex; gap: 28px; margin-bottom: 24px; align-items: center; flex-wrap: wrap;
        }
        .db-filter-group { display: flex; align-items: center; gap: 10px; }
        .db-filter-label { font-size: 13.5px; font-weight: 700; color: #334155; }
        
        .db-chip-btn {
          padding: 6px 16px; border-radius: 99px; border: 1px solid #e2e8f0;
          cursor: pointer; font-size: 13px; font-weight: 500; font-family: inherit;
          background: #ffffff; color: #475569; transition: all 0.2s ease;
        }
        .db-chip-btn:hover { background: #f1f5f9; }
        .db-chip-btn.active {
          background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
          color: #ffffff; border: none; font-weight: 600;
          box-shadow: 0 4px 10px rgba(79, 70, 229, 0.2);
        }

        .db-select {
          padding: 6px 16px; border-radius: 10px; border: 1px solid #e2e8f0;
          font-size: 13.5px; outline: none; background: #f8fafc; color: #0f172a;
          font-family: inherit; transition: all 0.2s;
        }
        .db-select:focus { border-color: #4f46e5; background: #fff; }

        .db-charts-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;
        }

        .db-table-wrapper { background: #ffffff; overflow-x: auto; margin-bottom: 24px; }
        .db-table { width: 100%; border-collapse: collapse; font-size: 14px; text-align: left; }
        .db-table th {
          padding: 14px 16px; background: #f8fafc; border-bottom: 2px solid #e2e8f0;
          color: #475569; font-weight: 700; font-size: 13px;
        }
        .db-table td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; color: #334155; }
        
        .db-cluster-pill {
          background: #f5f3ff; color: #7c3aed; padding: 4px 10px;
          border-radius: 8px; font-size: 12.5px; font-weight: 600; display: inline-block;
        }

        @media (max-width: 900px) {
          .db-metrics-grid { grid-template-columns: repeat(2, 1fr); }
          .db-charts-grid { grid-template-columns: 1fr; }
          .lp-nav { padding: 20px 24px; }
        }
      `}</style>

      <div className="db-root">
        {/* 네비게이션 */}
        <nav className="lp-nav">
          <div className="lp-nav-left" onClick={onBack}>
            <Logo size={42} />
            <div className="lp-logo-text">
              <span className="lp-logo-title">K-Persona Lab</span>
              <span className="lp-logo-sub">for virtual user research</span>
            </div>
          </div>
          <div className="lp-nav-right">
            <span className="lp-nav-item" onClick={onBack}>홈</span>
            <span className="lp-nav-item" style={{ color: '#4f46e5', fontWeight: '700' }}>실험하기</span>
          </div>
        </nav>

        {/* 대시보드 스페이스 */}
        <div className="db-container" ref={dashboardRef}>
          
          {/* 헤더 보드 */}
          <div className="db-header-card">
            <div className="db-title-block">
              <div className="db-title-left">
                <button onClick={onBack} className="db-back-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 20L8 12L16 4" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <h1>{experimentData?.experiment_title || '실험 결과 분석 대시보드'}</h1>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={downloadPNG} className="db-export-btn">↓ PNG 저장</button>
                <button onClick={downloadPDF} className="db-export-btn">↓ PDF 인쇄</button>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {experimentData?.experiment_type && (
                <span className="db-badge interstate primary">{experimentData.experiment_type}</span>
              )}
              <span className="db-badge">응답자 {filtered.length}명</span>
              <span className="db-badge">군집 {new Set(filtered.map(d => d.cluster_summary)).size}개</span>
              {!isRealData && <span className="db-badge warning">시뮬레이션 데이터</span>}
            </div>
          </div>

          {/* AI 리포트 요약 블록 */}
          {overallReport && (
            <div className="db-card" style={{
              marginBottom: '24px',
              background: 'linear-gradient(135deg, #f5f3ff 0%, #ffffff 100%)',
              borderLeft: '5px solid #7c3aed',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{
                  background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)', 
                  color: '#fff', fontSize: '11px',
                  padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold'
                }}>AI INSIGHT</span>
                <h3 style={{ fontSize: '16px', fontWeight: '800' }}>전체 종합 리포트 요약</h3>
              </div>
              <p style={{ margin: 0, fontSize: '14.5px', color: '#334155', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                {overallReport}
              </p>
            </div>
          )}

          {/* 4열 스코어보드 */}
          <div className="db-metrics-grid">
            {[
              { label: '총 페르소나 패널', value: filtered.length + ' 명' },
              { label: '매핑된 소셜 군집', value: new Set(filtered.map(d => d.cluster_summary)).size + ' 개' },
              { label: '패널 평균 나이', value: (filtered.reduce((s, d) => s + d.age, 0) / (filtered.length || 1)).toFixed(1) + ' 세' },
              { label: '커버리지 지역 수', value: new Set(filtered.map(d => d.region)).size + ' 개' },
            ].map((card, idx) => (
              <div key={idx} className="db-metric-item">
                <p className="db-metric-label">{card.label}</p>
                <p className="db-metric-value">{card.value}</p>
              </div>
            ))}
          </div>

          {/* 필터 컨트롤러 */}
          <div className="db-filter-bar">
            <div className="db-filter-group">
              <span className="db-filter-label">성별 필터</span>
              {['전체', '남', '여'].map(g => (
                <button key={g} onClick={() => setGenderFilter(g)} 
                  className={`db-chip-btn ${genderFilter === g ? 'active' : ''}`}>
                  {g}
                </button>
              ))}
            </div>
            <div className="db-filter-group">
              <span className="db-filter-label">지역 세부 필터</span>
              <select value={regionFilter} onChange={e => setRegionFilter(e.target.value)} className="db-select">
                {allRegions.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {/* 시각화 2열 구조 */}
          <div className="db-charts-grid">
            {/* 바 차트 */}
            <div className="db-card">
              <h3>군집별 가상 응답자 분포</h3>
              <p className="db-card-desc">각 가상 페르소나 모델의 클러스터 편제 규모를 계측합니다</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={clusterCounts} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 원형(파이) 차트 - ★ 검은색 버그 완벽 수정 ★ */}
            <div className="db-card">
              <h3>리서치 패널 성별 분포</h3>
              <p className="db-card-desc">조건에 맞춰 로딩된 가상 오디언스의 성별 파이 비율</p>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie 
                    data={genderCounts} 
                    dataKey="value" 
                    nameKey="name" 
                    cx="50%" 
                    cy="50%" 
                    outerRadius={85}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {/* 성별 텍스트 매칭을 통해 남성은 인디고, 여성은 보라색 확정 부여 */}
                    {genderCounts.map((entry, i) => (
                      <Cell 
                        key={i} 
                        fill={entry.name === '남' ? '#4f46e5' : '#7c3aed'} 
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 히트맵 매트릭스 */}
          <div className="db-card" style={{ marginBottom: '24px' }}>
            <h3>지역 × 군집 교차 분포 (Heatmap)</h3>
            <p className="db-card-desc">지역과 소셜 페르소나 군집 간의 가중치 밀도 분석 행렬</p>
            <div className="db-table-wrapper" style={{ margin: 0 }}>
              <table className="db-table">
                <thead>
                  <tr>
                    <th style={{ width: '120px' }}>지역구분</th>
                    {clusters.map(c => <th key={c} style={{ textAlign: 'center' }}>{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {heatmapData.map((row, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: '700', color: '#0f172a' }}>{row.region}</td>
                      {clusters.map(c => {
                        const val = row[c] || 0;
                        const opacity = val === 0 ? 0.02 : Math.min(val / 3, 1);
                        return (
                          <td key={c} style={{
                            textAlign: 'center',
                            background: `rgba(79, 70, 229, ${opacity})`,
                            fontWeight: val > 0 ? '700' : '400',
                            color: val > 0 ? '#4f46e5' : '#cbd5e1'
                          }}>{val}</td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 상세 데이터 원장 */}
          <div className="db-card">
            <h3>페르소나별 상세 응답 데이터</h3>
            <p className="db-card-desc">리서치에 참여한 가상 객체별 인구통계학적 지표 및 원본 텍스트 데이터</p>
            <div className="db-table-wrapper" style={{ margin: 0 }}>
              <table className="db-table">
                <thead>
                  <tr>
                    {['패널 ID', '나이', '성별', '지역', '소셜 군집 매핑', '리서치 서베이 핵심 답변'].map(h => <th key={h}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((d, i) => (
                    <tr key={i}>
                      <td style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{d.persona_id}</td>
                      <td style={{ fontWeight: '600' }}>{d.age}세</td>
                      <td>{d.gender}</td>
                      <td>{d.region}</td>
                      <td>
                        <span className="db-cluster-pill">{d.cluster_summary}</span>
                      </td>
                      <td style={{ color: '#475569', maxWidth: '400px', lineHeight: '1.5' }}>{d.response}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

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