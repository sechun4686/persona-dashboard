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

const INVALID_RESPONSES = new Set(['(응답 없음)', 'No response', '응답 없음', '']);

function parseApiResult(apiResult) {
  if (!apiResult || !apiResult.personas || !apiResult.responses) return null;
  const personaMap = {};
  apiResult.personas.forEach(p => { personaMap[p.persona_uuid] = p; });
  const rows = [];
  apiResult.responses.forEach((r, i) => {
    if (r.question_id !== 0) return;
    const resp = r.response || r.selected_option;
    // 유효 응답만 포함 — null/빈값/알려진 무효 문자열 제외
    if (!resp || INVALID_RESPONSES.has(resp.trim())) return;
    const persona = personaMap[r.persona_uuid] || {};
    rows.push({
      persona_id: r.persona_uuid?.slice(0, 8) || `P${String(i).padStart(3, '0')}`,
      age: persona.age || 0,
      gender: persona.sex === '여자' ? '여' : persona.sex === '남자' ? '남' : persona.sex || '?',
      region: persona.province || '?',
      occupation: persona.occupation || '?',
      response: resp,
      cluster: r.cluster !== null && r.cluster !== undefined ? r.cluster : 0,
      cluster_summary: r.cluster_summary || null,
    });
  });
  // apiResult가 존재하면 실제 데이터이므로 빈 배열이라도 반환 (dummyData 낙오 방지)
  return rows;
}

// ── color palette (purple theme complements) ──
const CLUSTER_COLORS = ['#4f46e5', '#7c3aed', '#2563eb', '#0891b2', '#059669'];
const CLUSTER_BG    = ['#e0e7ff', '#f3e8ff', '#dbeafe', '#cffafe', '#d1fae5'];

function groupByCluster(data) {
  const map = {};
  data.forEach(d => {
    // cluster_summary가 null이거나 없으면 cluster_id 기반 임시 이름 사용
    const key = d.cluster_summary || `의견 그룹 ${d.cluster + 1}`;
    if (!map[key]) map[key] = { name: key, cluster: d.cluster, items: [] };
    map[key].items.push(d);
  });
  return Object.values(map).sort((a, b) => b.items.length - a.items.length);
}

function extractFirstSentence(text) {
  if (!text) return '';
  const idx = text.search(/[.!?]\s/);
  if (idx > 10) return text.slice(0, idx + 1).trim();
  return text.length > 100 ? text.slice(0, 100) + '...' : text;
}

// Fallback: build executive summary from existing fields if backend doesn't provide it
function buildExecutiveSummary(apiResult, baseData) {
  if (apiResult?.executive_summary) return apiResult.executive_summary;
  const groups = groupByCluster(baseData);
  const total = baseData.length;
  const one_line_conclusion = apiResult?.overall_report
    ? extractFirstSentence(apiResult.overall_report)
    : `총 ${groups.length}개 군집에서 다양한 의견 패턴이 발견되었습니다.`;
  const key_findings = groups.slice(0, 3).map(g => {
    const pct = ((g.items.length / total) * 100).toFixed(0);
    const sample = g.items[0]?.response?.slice(0, 40) || '';
    return `'${g.name}'은(는) 패널의 ${pct}%를 차지하며 "${sample}..." 등의 응답 패턴을 보였습니다.`;
  });
  const recommended_actions = groups.slice(0, 3).map((g, i) => ({
    title: `'${g.name}' 세그먼트 심층 분석`,
    reason: `전체의 ${((g.items.length / total) * 100).toFixed(0)}%를 차지하는 핵심 페르소나 세그먼트입니다.`,
    priority: i === 0 ? 'High' : i === 1 ? 'Medium' : 'Low',
  }));
  return { one_line_conclusion, key_findings, recommended_actions };
}

// Fallback: build cluster cards from baseData if backend doesn't provide them
function buildClusterCards(apiResult, baseData) {
  if (apiResult?.cluster_cards) return apiResult.cluster_cards;
  const total = baseData.length;
  const groups = groupByCluster(baseData);
  return groups.map(g => {
    const isGeneric = /^군집\s*\d+$/.test(g.name.trim()) || /^cluster\s*\d+$/i.test(g.name.trim());
    const displayName = isGeneric ? `군집 ${g.cluster} — 주요 의견 그룹` : g.name;
    const rep = g.items[0];
    return {
      cluster_id: g.cluster,
      cluster_name: displayName,
      ratio: g.items.length / total,
      count: g.items.length,
      summary: `전체 응답의 ${((g.items.length / total) * 100).toFixed(0)}%를 구성하는 그룹입니다.`,
      keywords: apiResult?.cluster_keywords?.[g.cluster] || [],
      representative_quote: rep?.response || '',
      representative_persona: rep || null,
    };
  });
}

// Fallback: explain cluster formation if backend doesn't provide it
function buildWhyClusters(apiResult, clusterCards) {
  if (apiResult?.why_these_clusters) return apiResult.why_these_clusters;
  const names = clusterCards.map(c => `'${c.cluster_name}'`).join(', ');
  return `응답은 ${names} 등의 의견 그룹으로 자동 분류되었습니다. K-means 클러스터링이 응답 임베딩 벡터의 유사도를 기반으로 그룹을 형성한 결과이며, 각 군집은 공통된 경험·태도를 공유하는 가상 패널 세그먼트를 대표합니다.`;
}

function getSemanticInterpretation(score) {
  if (score === null || score === undefined) return '분석 데이터가 없습니다.';
  if (score < 30) return '응답들이 비교적 유사한 주제 안에서 세부 의견으로 나뉘었습니다.';
  if (score < 60) return '중간 수준 — 일부 이질적인 의견 그룹이 존재합니다.';
  return '응답들이 서로 다른 의미 영역에 넓게 분포했습니다.';
}

function getEntropyInterpretation(score) {
  if (score === null || score === undefined) return '분석 데이터가 없습니다.';
  if (score === 0) return '군집이 1개이므로 분산 없음 (단일 의견 집중).';
  if (score < 40) return '특정 군집에 의견이 집중되어 있습니다.';
  if (score < 70) return '군집 간 의견 분포가 다소 불균형합니다.';
  return '군집 간 의견이 비교적 균형 있게 분포했습니다.';
}

function priorityStyle(p) {
  if (p === 'High' || p === '높음') return { bg: '#fee2e2', color: '#dc2626' };
  if (p === 'Medium' || p === '중간') return { bg: '#fef3c7', color: '#d97706' };
  return { bg: '#d1fae5', color: '#059669' };
}

export default function Dashboard({ experimentData, onBack }) {
  const dashboardRef = useRef(null);
  const [genderFilter, setGenderFilter] = useState('전체');
  const [regionFilter, setRegionFilter] = useState('전체');
  const [reportExpanded, setReportExpanded] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [tableSearch, setTableSearch] = useState('');
  const [clusterFilter, setClusterFilter] = useState('전체');

  const downloadPNG = async () => {
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(dashboardRef.current, {
      scale: 2, useCORS: true, scrollY: 0,
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
      scale: 2, useCORS: true, scrollY: 0,
      windowWidth: dashboardRef.current.scrollWidth,
      windowHeight: dashboardRef.current.scrollHeight,
    });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const ratio = canvas.width / pdfWidth;
    const totalHeight = canvas.height / ratio;
    let position = 0;
    while (position < totalHeight) {
      pdf.addImage(imgData, 'PNG', 0, -position, pdfWidth, totalHeight);
      position += pdfHeight;
      if (position < totalHeight) pdf.addPage();
    }
    pdf.save('dashboard.pdf');
  };

  const apiParsed = experimentData?.apiResult ? parseApiResult(experimentData.apiResult) : null;
  const isRealData = apiParsed !== null;
  // 실제 실험 결과가 있으면 빈 배열이라도 dummyData로 낙오하지 않음
  const baseData = isRealData ? (apiParsed.length > 0 ? apiParsed : []) : dummyData;
  const overallReport = experimentData?.apiResult?.overall_report;
  const diversityMetrics = experimentData?.apiResult?.diversity_metrics || {};
  const experimentStats = isRealData ? {
    n_requested:       experimentData.apiResult?.n_requested       ?? null,
    valid_response_count:  experimentData.apiResult?.valid_response_count  ?? null,
    failed_response_count: experimentData.apiResult?.failed_response_count ?? null,
    retry_count:       experimentData.apiResult?.retry_count       ?? null,
    replacement_count: experimentData.apiResult?.replacement_count ?? null,
  } : null;

  // Derived / fallback data — safe with old result JSON
  const executiveSummary = buildExecutiveSummary(experimentData?.apiResult, baseData);
  const clusterCards    = buildClusterCards(experimentData?.apiResult, baseData);
  const whyClusters     = buildWhyClusters(experimentData?.apiResult, clusterCards);

  // Demographic filters (affect charts + heatmap)
  const filtered = baseData.filter(d =>
    (genderFilter === '전체' || d.gender === genderFilter) &&
    (regionFilter === '전체' || d.region === regionFilter)
  );

  // Table filters (cluster + keyword search, applied on top of demographic filters)
  const tableData = filtered.filter(d =>
    (clusterFilter === '전체' || (d.cluster_summary && d.cluster_summary === clusterFilter)) &&
    (!tableSearch || d.response.includes(tableSearch) || d.persona_id.includes(tableSearch) || d.occupation.includes(tableSearch))
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

  const regions = [...new Set(baseData.map(d => d.region).filter(Boolean))];
  const clusters = [...new Set(baseData.map(d => d.cluster_summary).filter(Boolean))];
  const heatmapData = regions.map(region => {
    const row = { region };
    clusters.forEach(cluster => {
      row[cluster] = filtered.filter(d => d.region === region && d.cluster_summary === cluster).length;
    });
    return row;
  });

  const allRegions  = ['전체', ...new Set(baseData.map(d => d.region).filter(Boolean))];
  const allClusters = ['전체', ...new Set(baseData.map(d => d.cluster_summary).filter(Boolean))];

  const toggleRow = (idx) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

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
            linear-gradient(to right, rgba(79,70,229,0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(79,70,229,0.03) 1px, transparent 1px);
          background-size: 32px 32px;
        }

        /* ── Nav ── */
        .lp-nav {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 48px;
          background: rgba(255,255,255,0.6);
          backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(241,245,249,0.8);
          position: sticky; top: 0; z-index: 100;
        }
        .lp-nav-left { display: flex; align-items: center; gap: 12px; cursor: pointer; }
        .lp-logo-text { display: flex; flex-direction: column; line-height: 1.1; }
        .lp-logo-title { font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
        .lp-logo-sub   { font-size: 10px; color: #64748b; font-weight: 500; }
        .lp-nav-right  { display: flex; align-items: center; gap: 32px; }
        .lp-nav-item   { font-size: 14px; font-weight: 500; color: #475569; cursor: pointer; transition: color 0.2s; }
        .lp-nav-item:hover { color: #4f46e5; }

        .db-container { max-width: 1140px; margin: 40px auto 0 auto; padding: 0 24px; }

        /* ── Generic card ── */
        .db-card {
          background: #ffffff; padding: 26px; border-radius: 20px;
          border: 1px solid rgba(241,245,249,0.9);
          box-shadow: 0 10px 25px rgba(15,23,42,0.03);
        }
        .db-card h3 { color: #0f172a; margin: 0 0 4px 0; font-size: 16px; font-weight: 800; letter-spacing: -0.01em; }
        .db-card-desc { color: #64748b; font-size: 13px; margin: 0 0 20px 0; }
        .db-section-label {
          font-size: 10.5px; font-weight: 700; letter-spacing: 0.12em;
          text-transform: uppercase; color: #7c3aed; margin: 0 0 8px 0;
        }

        /* ── Header card ── */
        .db-header-card {
          background: #ffffff; border-radius: 20px;
          border: 1px solid rgba(241,245,249,0.9);
          padding: 24px 28px; margin-bottom: 24px;
          box-shadow: 0 10px 25px rgba(15,23,42,0.02);
        }
        .db-title-block { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .db-title-left  { display: flex; align-items: center; gap: 16px; }
        .db-back-btn {
          background: #ffffff; border: 1px solid #e2e8f0; border-radius: 50%;
          width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: #475569; box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          transition: all 0.2s ease;
        }
        .db-back-btn:hover { background: #f1f5f9; color: #4f46e5; border-color: #cbd5e1; }
        .db-title-left h1 { margin: 0; font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
        .db-export-btn {
          padding: 9px 18px; border-radius: 10px; border: 1px solid #e2e8f0; background: #ffffff;
          color: #475569; cursor: pointer; font-size: 13.5px; font-family: inherit; font-weight: 600;
          transition: all 0.2s ease; display: inline-flex; align-items: center; gap: 6px;
        }
        .db-export-btn:hover { background: #f8fafc; color: #0f172a; border-color: #cbd5e1; }
        .db-badge { background: #f1f5f9; color: #475569; padding: 5px 14px; border-radius: 99px; font-size: 12.5px; font-weight: 600; }
        .db-badge.primary { background: #e0e7ff; color: #4f46e5; }
        .db-badge.warning { background: #fff3cd; color: #856404; }

        /* ── A/B 테스트 이미지 미리보기 ── */
        .db-ab-images { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 16px; }
        .db-ab-image-item { width: 140px; }
        .db-ab-image-item img {
          width: 100%; height: 100px; object-fit: contain;
          background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;
        }
        .db-ab-image-label { margin-top: 6px; font-size: 12.5px; font-weight: 700; color: #475569; text-align: center; }

        /* ── Executive Summary ── */
        .es-card {
          background: linear-gradient(135deg, #f5f3ff 0%, #ffffff 100%);
          border: 1px solid rgba(124,58,237,0.18);
          border-radius: 20px; padding: 28px; margin-bottom: 24px;
          box-shadow: 0 10px 28px rgba(124,58,237,0.06);
        }
        .es-header { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
        .es-ai-badge {
          background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
          color: #fff; font-size: 10.5px; font-weight: 700; padding: 4px 11px;
          border-radius: 7px; letter-spacing: 0.06em;
        }
        .es-header h3 { margin: 0; font-size: 17px; font-weight: 800; color: #0f172a; }
        .es-conclusion {
          background: rgba(79,70,229,0.06); border-left: 4px solid #7c3aed;
          border-radius: 0 12px 12px 0; padding: 13px 18px; margin-bottom: 22px;
          font-size: 15px; font-weight: 600; color: #1e1b4b; line-height: 1.65;
        }
        .es-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .es-col-title { font-size: 11px; font-weight: 800; color: #94a3b8; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.1em; }
        .es-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
        .es-list li { display: flex; gap: 10px; align-items: flex-start; font-size: 13.5px; color: #334155; line-height: 1.55; }
        .es-num {
          min-width: 22px; height: 22px; background: #e0e7ff; color: #4f46e5;
          border-radius: 50%; font-size: 11px; font-weight: 800;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px;
        }
        .es-num.action { background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); color: #fff; }

        /* ── Metrics ── */
        .db-metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
        .db-metric-item {
          background: #ffffff; border-radius: 18px; padding: 22px;
          border: 1px solid rgba(241,245,249,0.9);
          box-shadow: 0 8px 20px rgba(15,23,42,0.02);
          display: flex; flex-direction: column;
        }
        .db-metric-label  { color: #64748b; margin: 0 0 6px 0; font-size: 13.5px; font-weight: 600; }
        .db-metric-value  { font-size: 26px; font-weight: 800; color: #4f46e5; margin: 0 0 6px 0; letter-spacing: -0.02em; }
        .db-metric-interp { color: #94a3b8; font-size: 11.5px; margin: 0; line-height: 1.45; }
        .db-metric-item.highlight {
          background: linear-gradient(135deg, #f5f3ff 0%, #ffffff 100%);
          border-color: rgba(124,58,237,0.22);
        }
        .db-metric-item.highlight .db-metric-value {
          background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }

        /* ── Cluster Cards ── */
        .cc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
        .cc-card {
          background: #ffffff; border-radius: 18px; padding: 20px;
          border: 1px solid rgba(241,245,249,0.9);
          border-top: 4px solid transparent;
          box-shadow: 0 8px 20px rgba(15,23,42,0.02);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .cc-card:hover { transform: translateY(-2px); box-shadow: 0 14px 30px rgba(15,23,42,0.07); }
        .cc-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .cc-name  { font-size: 14.5px; font-weight: 800; color: #0f172a; }
        .cc-ratio { font-size: 12px; font-weight: 700; padding: 3px 11px; border-radius: 99px; white-space: nowrap; }
        .cc-summary { font-size: 13px; color: #475569; line-height: 1.6; margin-bottom: 10px; }
        .cc-keywords { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 12px; }
        .cc-keyword { font-size: 11.5px; font-weight: 600; padding: 3px 9px; border-radius: 6px; }
        .cc-quote {
          background: #f8fafc; border-left: 3px solid #e2e8f0;
          border-radius: 0 10px 10px 0; padding: 11px 14px;
          font-size: 13px; color: #334155; line-height: 1.65; font-style: italic;
        }
        .cc-quote-meta { font-size: 11px; color: #94a3b8; margin-top: 6px; font-style: normal; }

        /* ── Why clusters ── */
        .why-box {
          background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px;
          padding: 16px 20px; font-size: 13.5px; color: #475569; line-height: 1.7;
        }
        .why-box strong { color: #0f172a; }

        /* ── Recommended Next Actions ── */
        .na-list { display: flex; flex-direction: column; gap: 12px; }
        .na-item {
          display: flex; gap: 16px; align-items: flex-start;
          background: #f8fafc; border-radius: 14px; padding: 16px 18px; border: 1px solid #f1f5f9;
        }
        .na-num {
          min-width: 28px; height: 28px; border-radius: 50%;
          background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
          color: #fff; font-size: 12px; font-weight: 800;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px;
        }
        .na-content { flex: 1; }
        .na-title  { font-size: 14.5px; font-weight: 700; color: #0f172a; margin: 0 0 4px 0; }
        .na-reason { font-size: 13px; color: #475569; margin: 0; line-height: 1.55; }
        .na-priority { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 99px; white-space: nowrap; margin-top: 2px; }

        /* ── Charts ── */
        .db-charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }

        /* ── Filter bar ── */
        .db-filter-bar {
          background: #ffffff; padding: 18px 24px; border-radius: 16px;
          border: 1px solid rgba(241,245,249,0.9);
          box-shadow: 0 8px 20px rgba(15,23,42,0.02);
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
          box-shadow: 0 4px 10px rgba(79,70,229,0.2);
        }
        .db-select {
          padding: 6px 16px; border-radius: 10px; border: 1px solid #e2e8f0;
          font-size: 13.5px; outline: none; background: #f8fafc; color: #0f172a;
          font-family: inherit; transition: all 0.2s;
        }
        .db-select:focus { border-color: #4f46e5; background: #fff; }

        /* ── Heatmap / table shared ── */
        .db-table-wrapper { overflow-x: auto; }
        .db-table { width: 100%; border-collapse: collapse; font-size: 14px; text-align: left; }
        .db-table th { padding: 14px 16px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #475569; font-weight: 700; font-size: 13px; }
        .db-table td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; color: #334155; }
        .db-cluster-pill { background: #f5f3ff; color: #7c3aed; padding: 4px 10px; border-radius: 8px; font-size: 12.5px; font-weight: 600; display: inline-block; }

        /* ── Representative Quote cards ── */
        .qc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
        .qc-card {
          background: #ffffff; border-radius: 16px; padding: 20px;
          border: 1px solid rgba(241,245,249,0.9);
          box-shadow: 0 6px 16px rgba(15,23,42,0.03);
          position: relative; overflow: hidden;
        }
        .qc-card::before {
          content: '"'; position: absolute; top: 8px; right: 14px;
          font-size: 64px; font-family: Georgia, serif;
          color: rgba(79,70,229,0.07); line-height: 1; pointer-events: none;
        }
        .qc-cluster-tag { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 6px; margin-bottom: 10px; display: inline-block; }
        .qc-quote { font-size: 13.5px; color: #334155; line-height: 1.7; font-style: italic; margin-bottom: 10px; }
        .qc-meta  { font-size: 11.5px; color: #94a3b8; }

        /* ── AI Report collapse ── */
        .report-card {
          background: linear-gradient(135deg, #f5f3ff 0%, #ffffff 100%);
          border: 1px solid rgba(124,58,237,0.18); border-left: 5px solid #7c3aed;
          border-radius: 20px; padding: 24px 28px; margin-bottom: 24px;
        }
        .report-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
        .report-body { font-size: 14.5px; color: #334155; line-height: 1.8; white-space: pre-wrap; }
        .report-toggle-btn {
          margin-top: 12px; background: none; border: 1px solid #ddd6fe;
          border-radius: 8px; padding: 7px 16px; font-size: 13px; font-weight: 600;
          color: #7c3aed; cursor: pointer; font-family: inherit; transition: all 0.2s;
        }
        .report-toggle-btn:hover { background: #f5f3ff; border-color: #7c3aed; }

        /* ── Table search bar ── */
        .tb-toolbar {
          display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 14px;
        }
        .tb-search {
          flex: 1; min-width: 160px; padding: 9px 14px; border-radius: 10px;
          border: 1px solid #e2e8f0; font-size: 13.5px; outline: none;
          background: #f8fafc; font-family: inherit; color: #0f172a; transition: all 0.2s;
        }
        .tb-search:focus { border-color: #4f46e5; background: #fff; box-shadow: 0 0 0 3px rgba(79,70,229,0.08); }
        .tb-expand-btn {
          background: none; border: none; color: #7c3aed; cursor: pointer;
          font-size: 12px; font-weight: 600; font-family: inherit;
          padding: 2px 6px; border-radius: 4px; transition: background 0.15s; white-space: nowrap;
        }
        .tb-expand-btn:hover { background: #f5f3ff; }
        .tb-preview {
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
          overflow: hidden; color: #475569; line-height: 1.5; max-width: 340px;
        }

        @media (max-width: 900px) {
          .db-metrics-grid { grid-template-columns: 1fr 1fr; }
          .db-charts-grid  { grid-template-columns: 1fr; }
          .es-cols         { grid-template-columns: 1fr; }
          .cc-grid         { grid-template-columns: 1fr; }
          .qc-grid         { grid-template-columns: 1fr; }
          .lp-nav          { padding: 20px 24px; }
        }
        @media (max-width: 600px) {
          .db-metrics-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="db-root">

        {/* ── Navigation ── */}
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

        <div className="db-container" ref={dashboardRef}>

          {/* ─────────────────── 1. HEADER ─────────────────── */}
          <div className="db-header-card">
            <div className="db-title-block">
              <div className="db-title-left">
                <button onClick={onBack} className="db-back-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
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
                <span className="db-badge primary">{experimentData.experiment_type}</span>
              )}
              <span className="db-badge">
                유효 응답 {isRealData ? (experimentStats?.valid_response_count ?? baseData.length) : baseData.length}
                {experimentStats?.n_requested !== null && experimentStats?.n_requested !== undefined
                  ? ` / 요청 ${experimentStats.n_requested}명` : '명'}
              </span>
              <span className="db-badge">
                군집 {diversityMetrics?.cluster_count !== null && diversityMetrics?.cluster_count !== undefined
                  ? diversityMetrics.cluster_count
                  : new Set(baseData.map(d => d.cluster_summary).filter(Boolean)).size}개
              </span>
              {!isRealData && <span className="db-badge warning">시뮬레이션 데이터</span>}
            </div>
            {/* 실험 실행 통계 (실제 데이터일 때만 표시) */}
            {isRealData && experimentStats && (
              <div style={{
                display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '12px',
                padding: '10px 14px', background: '#f8fafc', borderRadius: '10px',
                border: '1px solid #f1f5f9', fontSize: '12.5px',
              }}>
                {[
                  { label: '요청', value: experimentStats.n_requested, unit: '명' },
                  { label: '유효', value: experimentStats.valid_response_count, unit: '명', color: '#059669' },
                  { label: '실패', value: experimentStats.failed_response_count, unit: '명', color: experimentStats.failed_response_count > 0 ? '#dc2626' : '#94a3b8' },
                  { label: '재시도', value: experimentStats.retry_count, unit: '회' },
                  { label: '대체 페르소나', value: experimentStats.replacement_count, unit: '명' },
                ].map(({ label, value, unit, color }) => (
                  value !== null && value !== undefined && (
                    <span key={label} style={{ color: color || '#475569', fontWeight: '600' }}>
                      {label}&nbsp;<strong style={{ color: color || '#0f172a' }}>{value}{unit}</strong>
                    </span>
                  )
                ))}
              </div>
            )}

            {experimentData?.images?.some(img => img.url) && (
              <div className="db-ab-images">
                {experimentData.images.filter(img => img.url).map((img, idx) => (
                  <div key={idx} className="db-ab-image-item">
                    <img src={img.url} alt={img.label || `이미지 ${idx + 1}`} />
                    <p className="db-ab-image-label">{img.label || `이미지 ${idx + 1}`}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ─────────────────── 2. EXECUTIVE SUMMARY ─────────────────── */}
          <div className="es-card">
            <div className="es-header">
              <span className="es-ai-badge">EXECUTIVE SUMMARY</span>
              <h3>실험 핵심 요약</h3>
            </div>

            <div className="es-conclusion">{executiveSummary.one_line_conclusion}</div>

            <div className="es-cols">
              <div>
                <p className="es-col-title">핵심 발견</p>
                <ul className="es-list">
                  {executiveSummary.key_findings?.map((f, i) => (
                    <li key={i}>
                      <span className="es-num">{i + 1}</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="es-col-title">추천 후속 액션</p>
                <ul className="es-list">
                  {executiveSummary.recommended_actions?.map((a, i) => (
                    <li key={i}>
                      <span className="es-num action">{i + 1}</span>
                      <span>{typeof a === 'string' ? a : a.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* ─────────────────── 3. METRICS ─────────────────── */}
          <div className="db-metrics-grid">
            <div className="db-metric-item">
              <p className="db-metric-label">유효 응답 패널</p>
              <p className="db-metric-value">{filtered.length} 명</p>
              <p className="db-metric-interp">
                {experimentStats?.n_requested !== null && experimentStats?.n_requested !== undefined
                  ? `요청 ${experimentStats.n_requested}명 중 유효 응답 수입니다.`
                  : '가상 패널이 포함한 응답자 수입니다.'}
              </p>
            </div>
            <div className="db-metric-item">
              <p className="db-metric-label">매핑된 소셜 군집</p>
              <p className="db-metric-value">
                {diversityMetrics?.cluster_count !== null && diversityMetrics?.cluster_count !== undefined
                  ? diversityMetrics.cluster_count
                  : new Set(filtered.map(d => d.cluster_summary).filter(Boolean)).size} 개
              </p>
              <p className="db-metric-interp">K-means로 분류된 의견 그룹의 수입니다.</p>
            </div>
            <div className="db-metric-item">
              <p className="db-metric-label">패널 평균 나이</p>
              <p className="db-metric-value">
                {filtered.length > 0
                  ? (filtered.reduce((s, d) => s + d.age, 0) / filtered.length).toFixed(1)
                  : '—'} 세
              </p>
              <p className="db-metric-interp">현재 필터 조건 내 가상 패널의 평균 연령입니다.</p>
            </div>
            <div className="db-metric-item highlight">
              <p className="db-metric-label">의미적 응답 다양성 (Semantic)</p>
              <p className="db-metric-value">
                {diversityMetrics?.semantic_diversity_score !== null && diversityMetrics?.semantic_diversity_score !== undefined
                  ? `${diversityMetrics.semantic_diversity_score}%`
                  : '—'}
              </p>
              <p className="db-metric-interp">{getSemanticInterpretation(diversityMetrics?.semantic_diversity_score ?? null)}</p>
            </div>
            <div className="db-metric-item highlight">
              <p className="db-metric-label">의견 분산 균등도 (Entropy)</p>
              <p className="db-metric-value">
                {diversityMetrics?.opinion_distribution_score !== null && diversityMetrics?.opinion_distribution_score !== undefined
                  ? `${diversityMetrics.opinion_distribution_score}%`
                  : '—'}
              </p>
              <p className="db-metric-interp">{getEntropyInterpretation(diversityMetrics?.opinion_distribution_score ?? null)}</p>
            </div>
            <div className="db-metric-item">
              <p className="db-metric-label">커버리지 지역 수</p>
              <p className="db-metric-value">{new Set(filtered.map(d => d.region)).size} 개</p>
              <p className="db-metric-interp">가상 패널이 포함한 지역 수입니다.</p>
            </div>
          </div>

          {/* ─────────────────── 4. CLUSTER CARDS + WHY ─────────────────── */}
          <div className="db-card" style={{ marginBottom: '24px' }}>
            <p className="db-section-label">Opinion Cluster Summary</p>
            <h3>군집별 핵심 요약</h3>
            <p className="db-card-desc">각 의견 군집의 특성과 대표 응답을 확인하세요</p>
            <div className="cc-grid">
              {clusterCards.map((c, i) => {
                const color = CLUSTER_COLORS[i % CLUSTER_COLORS.length];
                const bg    = CLUSTER_BG[i % CLUSTER_BG.length];
                const meta  = c.representative_persona;
                return (
                  <div key={c.cluster_id} className="cc-card" style={{ borderTopColor: color }}>
                    <div className="cc-header">
                      <span className="cc-name">{c.cluster_name}</span>
                      <span className="cc-ratio" style={{ background: bg, color }}>
                        {(c.ratio * 100).toFixed(0)}% · {c.count}명
                      </span>
                    </div>
                    {c.summary && <p className="cc-summary">{c.summary}</p>}
                    {c.keywords?.length > 0 && (
                      <div className="cc-keywords">
                        {c.keywords.map((kw, ki) => (
                          <span key={ki} className="cc-keyword" style={{ background: bg, color }}>#{kw}</span>
                        ))}
                      </div>
                    )}
                    {c.representative_quote && (
                      <div className="cc-quote">
                        "{c.representative_quote.length > 120
                          ? c.representative_quote.slice(0, 120) + '...'
                          : c.representative_quote}"
                        {meta && (
                          <div className="cc-quote-meta">
                            {meta.age}세 · {meta.gender} · {meta.region}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="why-box" style={{ marginTop: '20px' }}>
              <strong>Why these clusters?&nbsp;&nbsp;</strong>
              {whyClusters}
            </div>
          </div>

          {/* ─────────────────── 5. NEXT ACTIONS ─────────────────── */}
          {executiveSummary.recommended_actions?.length > 0 && (
            <div className="db-card" style={{ marginBottom: '24px' }}>
              <p className="db-section-label">Recommended Next Actions</p>
              <h3>후속 진행 제안</h3>
              <p className="db-card-desc">분석 결과를 제품·UX 액션으로 전환하세요</p>
              <div className="na-list">
                {executiveSummary.recommended_actions.map((a, i) => {
                  const action = typeof a === 'string' ? { title: a, reason: '', priority: 'Medium' } : a;
                  const ps = priorityStyle(action.priority);
                  return (
                    <div key={i} className="na-item">
                      <span className="na-num">{i + 1}</span>
                      <div className="na-content">
                        <p className="na-title">{action.title}</p>
                        {action.reason && <p className="na-reason">{action.reason}</p>}
                      </div>
                      {action.priority && (
                        <span className="na-priority" style={{ background: ps.bg, color: ps.color }}>
                          {action.priority}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─────────────────── 6. DEMOGRAPHIC FILTERS + CHARTS ─────────────────── */}
          <div className="db-filter-bar">
            <div className="db-filter-group">
              <span className="db-filter-label">성별 필터</span>
              {['전체', '남', '여'].map(g => (
                <button key={g} onClick={() => setGenderFilter(g)}
                  className={`db-chip-btn ${genderFilter === g ? 'active' : ''}`}>{g}</button>
              ))}
            </div>
            <div className="db-filter-group">
              <span className="db-filter-label">지역</span>
              <select value={regionFilter} onChange={e => setRegionFilter(e.target.value)} className="db-select">
                {allRegions.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div className="db-charts-grid">
            <div className="db-card">
              <h3>군집별 응답자 분포</h3>
              <p className="db-card-desc">가상 페르소나의 클러스터별 규모</p>
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
            <div className="db-card">
              <h3>리서치 패널 성별 분포</h3>
              <p className="db-card-desc">가상 오디언스의 성별 비율</p>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={genderCounts} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={85}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {genderCounts.map((entry, i) => (
                      <Cell key={i} fill={entry.name === '남' ? '#4f46e5' : '#7c3aed'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ─────────────────── 7. HEATMAP ─────────────────── */}
          <div className="db-card" style={{ marginBottom: '24px' }}>
            <h3>지역 × 군집 교차 분포 (Heatmap)</h3>
            <p className="db-card-desc">지역과 소셜 페르소나 군집 간의 밀도 분석 행렬</p>
            <div className="db-table-wrapper">
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
                            background: `rgba(79,70,229,${opacity})`,
                            fontWeight: val > 0 ? '700' : '400',
                            color: val === 0 ? '#cbd5e1' : val >= 2 ? '#ffffff' : '#4f46e5',
                          }}>{val}</td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ─────────────────── 8. REPRESENTATIVE QUOTES ─────────────────── */}
          <div className="db-card" style={{ marginBottom: '24px' }}>
            <p className="db-section-label">Representative Voices</p>
            <h3>군집별 대표 응답</h3>
            <p className="db-card-desc">각 의견 군집을 대표하는 가상 패널의 목소리</p>
            <div className="qc-grid">
              {clusterCards.map((c, i) => {
                const color = CLUSTER_COLORS[i % CLUSTER_COLORS.length];
                const bg    = CLUSTER_BG[i % CLUSTER_BG.length];
                const meta  = c.representative_persona;
                return (
                  <div key={c.cluster_id} className="qc-card">
                    <span className="qc-cluster-tag" style={{ background: bg, color }}>{c.cluster_name}</span>
                    <p className="qc-quote">
                      "{c.representative_quote?.length > 160
                        ? c.representative_quote.slice(0, 160) + '...'
                        : c.representative_quote || ''}"
                    </p>
                    {meta && (
                      <p className="qc-meta">{meta.age}세 · {meta.gender} · {meta.region} · {meta.occupation}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─────────────────── 9. AI REPORT (COLLAPSED) ─────────────────── */}
          {overallReport && (
            <div className="report-card">
              <div className="report-header">
                <span style={{
                  background: 'linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%)',
                  color: '#fff', fontSize: '11px', padding: '4px 10px',
                  borderRadius: '6px', fontWeight: 'bold',
                }}>AI INSIGHT</span>
                <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0 }}>전체 종합 리포트</h3>
              </div>
              <div style={{
                maxHeight: reportExpanded ? 'none' : '70px',
                overflow: 'hidden',
                maskImage: reportExpanded ? 'none' : 'linear-gradient(to bottom, black 40%, transparent 100%)',
                WebkitMaskImage: reportExpanded ? 'none' : 'linear-gradient(to bottom, black 40%, transparent 100%)',
              }}>
                <p className="report-body">{overallReport}</p>
              </div>
              <button className="report-toggle-btn" onClick={() => setReportExpanded(e => !e)}>
                {reportExpanded ? '▲ 접기' : '▼ 전체 리포트 보기'}
              </button>
            </div>
          )}

          {/* ─────────────────── 10. RESPONSE TABLE ─────────────────── */}
          <div className="db-card">
            <h3>페르소나별 상세 응답 데이터</h3>
            <p className="db-card-desc">리서치에 참여한 가상 객체별 인구통계 및 원본 텍스트 데이터</p>

            {/* Table-specific filters: keyword search + cluster dropdown */}
            <div className="tb-toolbar">
              <input
                className="tb-search"
                placeholder="응답 키워드 또는 ID 검색..."
                value={tableSearch}
                onChange={e => setTableSearch(e.target.value)}
              />
              <select value={clusterFilter} onChange={e => setClusterFilter(e.target.value)} className="db-select">
                {allClusters.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div className="db-table-wrapper">
              <table className="db-table">
                <thead>
                  <tr>
                    {['패널 ID', '나이', '성별', '지역', '소셜 군집', '응답'].map(h => <th key={h}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((d, i) => {
                    const expanded = expandedRows.has(i);
                    return (
                      <tr key={i}>
                        <td style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{d.persona_id}</td>
                        <td style={{ fontWeight: '600' }}>{d.age}세</td>
                        <td>{d.gender}</td>
                        <td>{d.region}</td>
                        <td>
                          {d.cluster_summary
                            ? <span className="db-cluster-pill">{d.cluster_summary}</span>
                            : <span style={{ color: '#94a3b8', fontSize: '12px' }}>군집 {d.cluster + 1}</span>}
                        </td>
                        <td>
                          {expanded
                            ? <span style={{ color: '#475569', lineHeight: '1.5' }}>{d.response}</span>
                            : <div className="tb-preview">{d.response}</div>
                          }
                          {d.response?.length > 50 && (
                            <button className="tb-expand-btn" onClick={() => toggleRow(i)}>
                              {expanded ? '접기' : '자세히 보기'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {tableData.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>
                        검색 결과가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p style={{ margin: '10px 0 0 0', fontSize: '12.5px', color: '#94a3b8', textAlign: 'right' }}>
              {tableData.length}개 응답 표시 중
              {experimentStats?.valid_response_count !== null && experimentStats?.valid_response_count !== undefined
                ? ` (유효 ${experimentStats.valid_response_count}명 / 요청 ${experimentStats.n_requested}명)`
                : ` (전체 ${baseData.length}개)`}
            </p>
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
