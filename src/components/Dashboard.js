import React, { useState, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts';

const COLORS = ['#7C3AED', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

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

export default function Dashboard({ experimentData, onBack }) {
  const dashboardRef = useRef(null);
  const [genderFilter, setGenderFilter] = useState('전체');
  const [regionFilter, setRegionFilter] = useState('전체');

  const downloadPNG = async () => {
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(dashboardRef.current);
    const link = document.createElement('a');
    link.download = 'dashboard.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  const downloadPDF = async () => {
    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF } = await import('jspdf');
    const canvas = await html2canvas(dashboardRef.current);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('l', 'mm', 'a4');
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, width, height);
    pdf.save('dashboard.pdf');
  };

  const filtered = dummyData.filter(d =>
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

  const regions = [...new Set(dummyData.map(d => d.region))];
  const clusters = [...new Set(dummyData.map(d => d.cluster_summary))];
  const heatmapData = regions.map(region => {
    const row = { region };
    clusters.forEach(cluster => {
      row[cluster] = filtered.filter(d => d.region === region && d.cluster_summary === cluster).length;
    });
    return row;
  });

  const allRegions = ['전체', ...new Set(dummyData.map(d => d.region))];

  const cardStyle = {
    background: 'white', padding: '20px', borderRadius: '12px',
    border: '1px solid #e8edf2', boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
  };

  const inputStyle = {
    padding: '6px 12px', borderRadius: '8px',
    border: '1.5px solid #e2e8f0', fontSize: '13px', outline: 'none',
    fontFamily: 'Noto Sans KR, sans-serif',
  };

  return (
    <div ref={dashboardRef} style={{
      padding: '28px', fontFamily: 'Noto Sans KR, sans-serif',
      background: '#f5f7fa', minHeight: '100vh'
    }}>

      {/* 상단 헤더 */}
      <div style={{
        background: 'white', borderRadius: '16px',
        border: '1px solid #e8edf2', padding: '20px 24px',
        marginBottom: '20px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button onClick={onBack} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#64748b', fontSize: '18px', padding: 0, lineHeight: 1
            }}>←</button>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>
              {experimentData?.experiment_title || '실험 결과'}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={downloadPNG} style={{
              padding: '8px 16px', borderRadius: '8px',
              border: '1px solid #e2e8f0', background: 'white',
              color: '#475569', cursor: 'pointer', fontSize: '13px',
              fontFamily: 'Noto Sans KR, sans-serif', fontWeight: '500',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}>↓ PNG</button>
            <button onClick={downloadPDF} style={{
              padding: '8px 16px', borderRadius: '8px',
              border: '1px solid #e2e8f0', background: 'white',
              color: '#475569', cursor: 'pointer', fontSize: '13px',
              fontFamily: 'Noto Sans KR, sans-serif', fontWeight: '500',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}>↓ PDF</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            experimentData?.experiment_type,
            `응답자 ${experimentData?.n || filtered.length}명`,
            `군집 ${new Set(filtered.map(d => d.cluster)).size}개`
          ].filter(Boolean).map((tag, i) => (
            <span key={i} style={{
              background: '#f1f5f9', color: '#475569',
              padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500'
            }}>{tag}</span>
          ))}
        </div>
      </div>

      {/* 지표 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: '총 페르소나', value: filtered.length + '명' },
          { label: '군집 수', value: new Set(filtered.map(d => d.cluster)).size + '개' },
          { label: '평균 나이', value: (filtered.reduce((s, d) => s + d.age, 0) / (filtered.length || 1)).toFixed(1) + '세' },
          { label: '지역 수', value: new Set(filtered.map(d => d.region)).size + '개' },
        ].map(card => (
          <div key={card.label} style={{ ...cardStyle, textAlign: 'center', padding: '16px' }}>
            <p style={{ color: '#94a3b8', margin: '0 0 6px', fontSize: '12px' }}>{card.label}</p>
            <p style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', margin: 0 }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* 필터 */}
      <div style={{ ...cardStyle, display: 'flex', gap: '20px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>성별</span>
          {['전체', '남', '여'].map(g => (
            <button key={g} onClick={() => setGenderFilter(g)} style={{
              padding: '5px 14px', borderRadius: '20px', border: 'none',
              cursor: 'pointer', fontSize: '13px',
              fontFamily: 'Noto Sans KR, sans-serif',
              background: genderFilter === g ? '#3b82f6' : '#f1f5f9',
              color: genderFilter === g ? 'white' : '#64748b',
              fontWeight: genderFilter === g ? '600' : '400',
            }}>{g}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>지역</span>
          <select value={regionFilter} onChange={e => setRegionFilter(e.target.value)} style={inputStyle}>
            {allRegions.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {/* 차트 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        <div style={cardStyle}>
          <h3 style={{ color: '#1e293b', marginTop: 0, fontSize: '15px', fontWeight: '700' }}>군집별 응답자 수</h3>
          <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '-12px', marginBottom: '16px' }}>각 군집에 속한 페르소나 수를 나타냅니다</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={clusterCounts}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip />
              <Bar dataKey="count" fill="#8b87e0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={cardStyle}>
          <h3 style={{ color: '#1e293b', marginTop: 0, fontSize: '15px', fontWeight: '700' }}>성별 분포</h3>
          <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '-12px', marginBottom: '16px' }}>응답자의 성별 비율</p>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={genderCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {genderCounts.map((_, i) => <Cell key={i} fill={['#3b82f6', '#ec4899'][i % 2]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 히트맵 */}
      <div style={{ ...cardStyle, marginBottom: '20px', overflowX: 'auto' }}>
        <h3 style={{ color: '#1e293b', marginTop: 0, fontSize: '15px', fontWeight: '700' }}>지역 × 군집 분포</h3>
        <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '-12px', marginBottom: '16px' }}>각 지역별 군집 분포를 보여주는 히트맵</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr>
              <th style={{ padding: '8px', background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>지역</th>
              {clusters.map(c => (
                <th key={c} style={{ padding: '8px', background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'center', fontSize: '11px', color: '#475569' }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {heatmapData.map((row, i) => (
              <tr key={i}>
                <td style={{ padding: '8px', fontWeight: '600', color: '#1e293b', borderBottom: '1px solid #f1f5f9' }}>{row.region}</td>
                {clusters.map(c => {
                  const val = row[c] || 0;
                  const opacity = val === 0 ? 0.05 : val / 3;
                  return (
                    <td key={c} style={{
                      padding: '8px', textAlign: 'center', borderBottom: '1px solid #f1f5f9',
                      background: `rgba(59, 130, 246, ${opacity})`,
                      fontWeight: val > 0 ? '600' : '400',
                      color: val > 0 ? '#1e293b' : '#cbd5e1'
                    }}>{val}</td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 응답 테이블 */}
      <div style={{ ...cardStyle, overflowX: 'auto', marginBottom: '20px' }}>
        <h3 style={{ color: '#1e293b', marginTop: 0, fontSize: '15px', fontWeight: '700' }}>페르소나 응답 데이터</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['ID', '나이', '성별', '지역', '군집', '응답'].map(h => (
                <th key={h} style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '13px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((d, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px', fontSize: '13px', color: '#64748b' }}>{d.persona_id}</td>
                <td style={{ padding: '12px', fontSize: '13px' }}>{d.age}</td>
                <td style={{ padding: '12px', fontSize: '13px' }}>{d.gender}</td>
                <td style={{ padding: '12px', fontSize: '13px' }}>{d.region}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{
                    background: '#eff6ff', color: '#3b82f6',
                    padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '500'
                  }}>{d.cluster_summary}</span>
                </td>
                <td style={{ padding: '12px', fontSize: '13px', color: '#64748b' }}>{d.response}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}