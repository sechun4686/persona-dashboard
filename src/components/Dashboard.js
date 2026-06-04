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

// API 결과를 대시보드 형식으로 변환
function parseApiResult(apiResult) {
  if (!apiResult || !apiResult.personas || !apiResult.responses) return null;

  const personaMap = {};
  apiResult.personas.forEach(p => {
    personaMap[p.persona_uuid] = p;
  });

  const rows = [];
  apiResult.responses.forEach((r, i) => {
    if (!r.response && !r.selected_option) return;
    const persona = personaMap[r.persona_uuid] || {};
    rows.push({
      persona_id: r.persona_uuid?.slice(0, 8) || `P${String(i).padStart(3, '0')}`,
      age: persona.age || 0,
      gender: persona.sex === '여자' ? '여' : persona.sex === '남자' ? '남' : persona.sex || '?',
      region: persona.province || '?',
      occupation: persona.occupation || '?',
      response: r.response || r.selected_option || '',
      cluster: 0,
      cluster_summary: '분석 대기중',
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

  // API 결과 있으면 실제 데이터, 없으면 더미
  const apiParsed = experimentData?.apiResult ? parseApiResult(experimentData.apiResult) : null;
  const baseData = apiParsed || dummyData;
  const isRealData = !!apiParsed;

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

  const cardStyle = {
    background: 'white', padding: '20px', borderRadius: '12px',
    border: '1px solid #ebebeb',
  };

  const inputStyle = {
    padding: '6px 12px', borderRadius: '8px',
    border: '1px solid #ddd', fontSize: '13px', outline: 'none',
    fontFamily: 'Noto Sans KR, sans-serif', color: '#111',
  };

  return (
    <div ref={dashboardRef} style={{
      padding: '28px', fontFamily: 'Noto Sans KR, sans-serif',
      background: '#ffffff', minHeight: '100vh',
      maxWidth: '1100px', margin: '0 auto',
    }}>

      {/* 상단 헤더 */}
      <div style={{
        background: 'white', borderRadius: '16px',
        border: '1px solid #ebebeb', padding: '20px 24px',
        marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button onClick={onBack} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#111', fontSize: '18px', padding: 0, lineHeight: 1
            }}>←</button>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#111' }}>
              {experimentData?.experiment_title || '실험 결과'}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={downloadPNG} style={{
              padding: '8px 16px', borderRadius: '8px',
              border: '1px solid #ddd', background: 'white',
              color: '#111', cursor: 'pointer', fontSize: '13px',
              fontFamily: 'Noto Sans KR, sans-serif', fontWeight: '500',
            }}>↓ PNG</button>
            <button onClick={downloadPDF} style={{
              padding: '8px 16px', borderRadius: '8px',
              border: '1px solid #ddd', background: 'white',
              color: '#111', cursor: 'pointer', fontSize: '13px',
              fontFamily: 'Noto Sans KR, sans-serif', fontWeight: '500',
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
              background: '#f5f5f5', color: '#555',
              padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500'
            }}>{tag}</span>
          ))}
          {!isRealData && (
            <span style={{
              background: '#fff3cd', color: '#856404',
              padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500'
            }}>더미 데이터</span>
          )}
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
            <p style={{ color: '#999', margin: '0 0 6px', fontSize: '12px' }}>{card.label}</p>
            <p style={{ fontSize: '24px', fontWeight: '700', color: '#111', margin: 0 }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* 필터 */}
      <div style={{ ...cardStyle, display: 'flex', gap: '20px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#111' }}>성별</span>
          {['전체', '남', '여'].map(g => (
            <button key={g} onClick={() => setGenderFilter(g)} style={{
              padding: '5px 14px', borderRadius: '20px',
              border: genderFilter === g ? 'none' : '1px solid #ddd',
              cursor: 'pointer', fontSize: '13px',
              fontFamily: 'Noto Sans KR, sans-serif',
              background: genderFilter === g ? '#111' : '#fff',
              color: genderFilter === g ? 'white' : '#555',
              fontWeight: genderFilter === g ? '600' : '400',
            }}>{g}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#111' }}>지역</span>
          <select value={regionFilter} onChange={e => setRegionFilter(e.target.value)} style={inputStyle}>
            {allRegions.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {/* 차트 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        <div style={cardStyle}>
          <h3 style={{ color: '#111', marginTop: 0, fontSize: '15px', fontWeight: '700' }}>군집별 응답자 수</h3>
          <p style={{ color: '#999', fontSize: '12px', marginTop: '-12px', marginBottom: '16px' }}>각 군집에 속한 페르소나 수를 나타냅니다</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={clusterCounts}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#999' }} />
              <YAxis tick={{ fontSize: 11, fill: '#999' }} />
              <Tooltip />
              <Bar dataKey="count" fill="#111" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={cardStyle}>
          <h3 style={{ color: '#111', marginTop: 0, fontSize: '15px', fontWeight: '700' }}>성별 분포</h3>
          <p style={{ color: '#999', fontSize: '12px', marginTop: '-12px', marginBottom: '16px' }}>응답자의 성별 비율</p>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={genderCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {genderCounts.map((_, i) => <Cell key={i} fill={['#111', '#888'][i % 2]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 히트맵 */}
      <div style={{ ...cardStyle, marginBottom: '20px', overflowX: 'auto' }}>
        <h3 style={{ color: '#111', marginTop: 0, fontSize: '15px', fontWeight: '700' }}>지역 × 군집 분포</h3>
        <p style={{ color: '#999', fontSize: '12px', marginTop: '-12px', marginBottom: '16px' }}>각 지역별 군집 분포를 보여주는 히트맵</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr>
              <th style={{ padding: '8px', background: '#f8f8f8', borderBottom: '2px solid #ebebeb', textAlign: 'left', color: '#555' }}>지역</th>
              {clusters.map(c => (
                <th key={c} style={{ padding: '8px', background: '#f8f8f8', borderBottom: '2px solid #ebebeb', textAlign: 'center', fontSize: '11px', color: '#555' }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {heatmapData.map((row, i) => (
              <tr key={i}>
                <td style={{ padding: '8px', fontWeight: '600', color: '#111', borderBottom: '1px solid #f5f5f5' }}>{row.region}</td>
                {clusters.map(c => {
                  const val = row[c] || 0;
                  const opacity = val === 0 ? 0.05 : val / 3;
                  return (
                    <td key={c} style={{
                      padding: '8px', textAlign: 'center', borderBottom: '1px solid #f5f5f5',
                      background: `rgba(0, 0, 0, ${opacity})`,
                      fontWeight: val > 0 ? '600' : '400',
                      color: val > 0 ? '#111' : '#ccc'
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
        <h3 style={{ color: '#111', marginTop: 0, fontSize: '15px', fontWeight: '700' }}>페르소나 응답 데이터</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f8f8' }}>
              {['ID', '나이', '성별', '지역', '군집', '응답'].map(h => (
                <th key={h} style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ebebeb', color: '#555', fontSize: '13px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((d, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f5f5f5' }}>
                <td style={{ padding: '12px', fontSize: '13px', color: '#999' }}>{d.persona_id}</td>
                <td style={{ padding: '12px', fontSize: '13px', color: '#111' }}>{d.age}</td>
                <td style={{ padding: '12px', fontSize: '13px', color: '#111' }}>{d.gender}</td>
                <td style={{ padding: '12px', fontSize: '13px', color: '#111' }}>{d.region}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{
                    background: '#f5f5f5', color: '#111',
                    padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '500'
                  }}>{d.cluster_summary}</span>
                </td>
                <td style={{ padding: '12px', fontSize: '13px', color: '#555' }}>{d.response}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}