import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts';

const COLORS = ['#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6'];

// 더미 데이터
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

export default function Dashboard() {
  const [genderFilter, setGenderFilter] = useState('전체');
  const [regionFilter, setRegionFilter] = useState('전체');

  const filtered = dummyData.filter(d =>
    (genderFilter === '전체' || d.gender === genderFilter) &&
    (regionFilter === '전체' || d.region === regionFilter)
  );

  // 군집별 카운트
  const clusterCounts = Object.values(
    filtered.reduce((acc, d) => {
      if (!acc[d.cluster_summary]) acc[d.cluster_summary] = { name: d.cluster_summary, count: 0 };
      acc[d.cluster_summary].count++;
      return acc;
    }, {})
  );

  // 성별 카운트
  const genderCounts = Object.values(
    filtered.reduce((acc, d) => {
      if (!acc[d.gender]) acc[d.gender] = { name: d.gender, value: 0 };
      acc[d.gender].value++;
      return acc;
    }, {})
  );

  const regions = ['전체', ...new Set(dummyData.map(d => d.region))];

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif', background: '#f8f9fa', minHeight: '100vh' }}>
      <h1 style={{ color: '#2c3e50', marginBottom: '8px' }}>가상 사용자 리서치 대시보드</h1>
      <p style={{ color: '#7f8c8d', marginBottom: '24px' }}>총 {filtered.length}명 페르소나 분석 결과</p>

      {/* 필터 */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
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
            {regions.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {/* 지표 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: '총 페르소나', value: filtered.length + '명' },
          { label: '군집 수', value: new Set(filtered.map(d => d.cluster)).size + '개' },
          { label: '평균 나이', value: (filtered.reduce((s, d) => s + d.age, 0) / filtered.length || 0).toFixed(1) + '세' },
          { label: '지역 수', value: new Set(filtered.map(d => d.region)).size + '개' },
        ].map(card => (
          <div key={card.label} style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' }}>
            <p style={{ color: '#7f8c8d', margin: '0 0 8px' }}>{card.label}</p>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#2c3e50', margin: 0 }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* 차트 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h3 style={{ color: '#2c3e50', marginTop: 0 }}>군집별 페르소나 수</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={clusterCounts}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3498DB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h3 style={{ color: '#2c3e50', marginTop: 0 }}>성별 분포</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={genderCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {genderCounts.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 응답 테이블 */}
      <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <h3 style={{ color: '#2c3e50', marginTop: 0 }}>📋 페르소나 응답 데이터</h3>
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
                <td style={{ padding: '12px' }}><span style={{ background: '#e8f4fd', color: '#2980b9', padding: '4px 10px', borderRadius: '12px', fontSize: '12px' }}>{d.cluster_summary}</span></td>
                <td style={{ padding: '12px', fontSize: '13px', color: '#636e72' }}>{d.response}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}