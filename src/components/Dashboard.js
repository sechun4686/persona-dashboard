import React, { useState, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts';

const COLORS = ['#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6'];

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
  const cardStyle = { background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' };

  return (
    <div ref={dashboardRef} style={{ padding: '24px', fontFamily: 'sans-serif', background: '#f8f9fa', minHeight: '100vh' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
        <button onClick={onBack}
          style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #dde1e7', background: 'white', cursor: 'pointer', fontSize: '14px', color: '#2c3e50' }}>
          뒤로가기
        </button>
        <h1 style={{ color: '#2c3e50', margin: 0 }}>가상 사용자 리서치 대시보드</h1>
      </div>

      {experimentData && (
        <div style={{ background: '#ebf5fb', border: '1px solid #aed6f1', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div><span style={{ fontSize: '12px', color: '#5d8aa8' }}>실험 제목</span><p style={{ margin: '2px 0', fontWeight: '700', color: '#2c3e50' }}>{experimentData.experiment_title}</p></div>
            <div><span style={{ fontSize: '12px', color: '#5d8aa8' }}>실험 목적</span><p style={{ margin: '2px 0', fontWeight: '600', color: '#2c3e50' }}>{experimentData.experiment_type}</p></div>
            <div><span style={{ fontSize: '12px', color: '#5d8aa8' }}>페르소나 수</span><p style={{ margin: '2px 0', fontWeight: '600', color: '#2c3e50' }}>{experimentData.n}명</p></div>
            {experimentData.filters?.sex && <div><span style={{ fontSize: '12px', color: '#5d8aa8' }}>성별</span><p style={{ margin: '2px 0', fontWeight: '600', color: '#2c3e50' }}>{experimentData.filters.sex}</p></div>}
            {experimentData.filters?.province && <div><span style={{ fontSize: '12px', color: '#5d8aa8' }}>지역</span><p style={{ margin: '2px 0', fontWeight: '600', color: '#2c3e50' }}>{experimentData.filters.province}</p></div>}
            <div><span style={{ fontSize: '12px', color: '#5d8aa8' }}>질문 수</span><p style={{ margin: '2px 0', fontWeight: '600', color: '#2c3e50' }}>{experimentData.questions?.length}개</p></div>
          </div>
          {experimentData.questions?.map((q, i) => (
            <div key={i} style={{ marginTop: '8px', fontSize: '13px', color: '#2c3e50' }}>
              <span style={{ background: q.type === '주관식' ? '#3498DB' : '#E74C3C', color: 'white', padding: '2px 8px', borderRadius: '8px', fontSize: '11px', marginRight: '8px' }}>{q.type}</span>
              {q.content}
            </div>
          ))}
          <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#e67e22' }}>현재 더미 데이터로 표시 중 — 실제 데이터 연동 후 업데이트 예정</p>
        </div>
      )}

      <p style={{ color: '#7f8c8d', marginBottom: '20px' }}>총 {filtered.length}명 페르소나 분석 결과</p>

      <div style={{ ...cardStyle, display: 'flex', gap: '16px', marginBottom: '20px' }}>
        <div>
          <label style={{ fontWeight: 'bold', marginRight: '8px' }}>성별:</label>
          {['전체', '남', '여'].map(g => (
            <button key={g} onClick={() => setGenderFilter(g)}
              style={{ marginRight: '8px', padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                background: genderFilter === g ? '#3498DB' : '#ecf0f1', color: genderFilter === g ? 'white' : '#2c3e50' }}>
              {g}
            </button>
          ))}
        </div>
        <div>
          <label style={{ fontWeight: 'bold', marginRight: '8px' }}>지역:</label>
          <select value={regionFilter} onChange={e => setRegionFilter(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #ddd' }}>
            {allRegions.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
        {[
          { label: '총 페르소나', value: filtered.length + '명' },
          { label: '군집 수', value: new Set(filtered.map(d => d.cluster)).size + '개' },
          { label: '평균 나이', value: (filtered.reduce((s, d) => s + d.age, 0) / filtered.length || 0).toFixed(1) + '세' },
          { label: '지역 수', value: new Set(filtered.map(d => d.region)).size + '개' },
        ].map(card => (
          <div key={card.label} style={{ ...cardStyle, textAlign: 'center' }}>
            <p style={{ color: '#7f8c8d', margin: '0 0 8px' }}>{card.label}</p>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#2c3e50', margin: 0 }}>{card.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        <div style={cardStyle}>
          <h3 style={{ color: '#2c3e50', marginTop: 0 }}>군집별 페르소나 수</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={clusterCounts}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#3498DB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={cardStyle}>
          <h3 style={{ color: '#2c3e50', marginTop: 0 }}>성별 분포</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={genderCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {genderCounts.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ ...cardStyle, marginBottom: '20px', overflowX: 'auto' }}>
        <h3 style={{ color: '#2c3e50', marginTop: 0 }}>지역 × 군집 히트맵</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr>
              <th style={{ padding: '8px', background: '#f8f9fa', borderBottom: '2px solid #dee2e6', textAlign: 'left' }}>지역</th>
              {clusters.map(c => (
                <th key={c} style={{ padding: '8px', background: '#f8f9fa', borderBottom: '2px solid #dee2e6', textAlign: 'center', fontSize: '11px' }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {heatmapData.map((row, i) => (
              <tr key={i}>
                <td style={{ padding: '8px', fontWeight: '600', color: '#2c3e50', borderBottom: '1px solid #f0f0f0' }}>{row.region}</td>
                {clusters.map(c => {
                  const val = row[c] || 0;
                  const opacity = val === 0 ? 0.05 : val / 3;
                  return (
                    <td key={c} style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #f0f0f0',
                      background: `rgba(52, 152, 219, ${opacity})`, fontWeight: val > 0 ? '600' : '400', color: val > 0 ? '#2c3e50' : '#bdc3c7' }}>
                      {val}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ ...cardStyle, overflowX: 'auto', marginBottom: '20px' }}>
        <h3 style={{ color: '#2c3e50', marginTop: 0 }}>페르소나 응답 데이터</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              {['ID', '나이', '성별', '지역', '군집', '응답'].map(h => (
                <th key={h} style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', color: '#495057' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((d, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #dee2e6' }}>
                <td style={{ padding: '12px' }}>{d.persona_id}</td>
                <td style={{ padding: '12px' }}>{d.age}</td>
                <td style={{ padding: '12px' }}>{d.gender}</td>
                <td style={{ padding: '12px' }}>{d.region}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{ background: '#e8f4fd', color: '#2980b9', padding: '4px 10px', borderRadius: '12px', fontSize: '12px' }}>{d.cluster_summary}</span>
                </td>
                <td style={{ padding: '12px', fontSize: '13px', color: '#636e72' }}>{d.response}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button onClick={downloadPNG}
          style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: '#3498DB', color: 'white', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
          PNG 다운로드
        </button>
        <button onClick={downloadPDF}
          style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: '#2ECC71', color: 'white', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
          PDF 다운로드
        </button>
      </div>

    </div>
  );
}