import React, { useState } from 'react';

const regions = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];
const experimentTypes = ['사전조사', 'A/B테스트', '가격책정', '사용성테스트', '브랜드인식'];

export default function ExperimentForm({ onSubmit, onBack }) {
  const [form, setForm] = useState({
    experiment_title: '',
    experiment_type: '사전조사',
    service_description: '',
    questions: [{ type: '주관식', content: '', options: [] }],
    n: 100,
    filters: { sex: '', age_min: 19, age_max: 99, province: '', occupation: '' }
  });
  const [loading, setLoading] = useState(false);

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const updateFilter = (field, value) => setForm(prev => ({ ...prev, filters: { ...prev.filters, [field]: value } }));

  const addQuestion = (type) => {
    setForm(prev => ({
      ...prev,
      questions: [...prev.questions, { type, content: '', options: type === '객관식' ? ['', ''] : [] }]
    }));
  };

  const updateQuestion = (idx, field, value) => {
    const updated = [...form.questions];
    updated[idx] = { ...updated[idx], [field]: value };
    setForm(prev => ({ ...prev, questions: updated }));
  };

  const updateOption = (qIdx, oIdx, value) => {
    const updated = [...form.questions];
    updated[qIdx].options[oIdx] = value;
    setForm(prev => ({ ...prev, questions: updated }));
  };

  const addOption = (qIdx) => {
    const updated = [...form.questions];
    updated[qIdx].options.push('');
    setForm(prev => ({ ...prev, questions: updated }));
  };

  const removeQuestion = (idx) => {
    setForm(prev => ({ ...prev, questions: prev.questions.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = async () => {
    if (!form.experiment_title) return alert('실험 제목을 입력해주세요!');
    if (form.questions.some(q => !q.content)) return alert('모든 질문을 입력해주세요!');

    const payload = {
      experiment_title: form.experiment_title,
      experiment_type: form.experiment_type,
      service_description: form.service_description || null,
      questions: form.questions.map((q, idx) => ({
        question_id: idx,
        question_content: q.content,
        question_type: q.type,
        options: q.options || []
      })),
      images: [],
      filters: {
        sex: form.filters.sex || null,
        age_min: form.filters.age_min || null,
        age_max: form.filters.age_max || null,
        province: form.filters.province || null,
        occupation: form.filters.occupation || null,
      },
      n: form.n
    };

    setLoading(true);
    try {
      const response = await fetch('http://100.31.151.220:8000/run-experiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      onSubmit({ ...form, apiResult: result });
    } catch (err) {
      alert('서버 연결 실패: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: '8px',
    border: '1.5px solid #e2e8f0', fontSize: '14px',
    boxSizing: 'border-box', outline: 'none',
    background: '#fff', color: '#1e293b',
    fontFamily: 'Noto Sans KR, sans-serif',
  };
  const labelStyle = {
    fontWeight: '600', fontSize: '13px',
    color: '#475569', marginBottom: '6px', display: 'block'
  };
  const cardStyle = {
    background: 'white', padding: '24px',
    borderRadius: '16px',
    border: '1px solid #e8edf2',
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    marginBottom: '16px'
  };
  const sectionTitle = {
    color: '#1e293b', fontWeight: '700',
    fontSize: '15px', marginTop: 0, marginBottom: '4px'
  };
  const sectionDesc = {
    color: '#94a3b8', fontSize: '13px', marginBottom: '20px', marginTop: 0
  };

  return (
    <div style={{
      padding: '32px', fontFamily: 'Noto Sans KR, sans-serif',
      background: '#f5f7fa', minHeight: '100vh',
      maxWidth: '720px', margin: '0 auto'
    }}>
      {/* 뒤로가기 */}
      <button onClick={onBack} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: '#64748b', fontSize: '14px', marginBottom: '16px',
        display: 'flex', alignItems: 'center', gap: '6px', padding: 0,
      }}>
        ← 
      </button>

      <h1 style={{ color: '#1e293b', marginBottom: '4px', fontSize: '24px', fontWeight: '700' }}>실험 설정</h1>
      <p style={{ color: '#94a3b8', marginBottom: '28px', fontSize: '14px' }}>가상 사용자 리서치 실험을 설정하세요</p>

      {/* 기본 정보 */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>기본 정보</h3>
        <p style={sectionDesc}>실험의 제목과 목적을 입력하세요</p>
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>실험 제목</label>
          <input style={inputStyle} placeholder="예: 새로운 앱 기능에 대한 사용자 반응 조사"
            value={form.experiment_title} onChange={e => updateField('experiment_title', e.target.value)} />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>실험 목적</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {experimentTypes.map(t => (
              <button key={t} onClick={() => updateField('experiment_type', t)} style={{
                padding: '7px 16px', borderRadius: '20px', border: 'none',
                cursor: 'pointer', fontSize: '13px', fontWeight: '500',
                fontFamily: 'Noto Sans KR, sans-serif',
                background: form.experiment_type === t ? '#3b82f6' : '#f1f5f9',
                color: form.experiment_type === t ? 'white' : '#64748b',
              }}>{t}</button>
            ))}
          </div>
        </div>
        <div>
          <label style={labelStyle}>서비스 설명 (선택사항)</label>
          <textarea style={{ ...inputStyle, height: '80px', resize: 'vertical' }}
            placeholder="테스트하려는 서비스나 기능에 대해 간단히 설명해주세요"
            value={form.service_description} onChange={e => updateField('service_description', e.target.value)} />
        </div>
      </div>

      {/* 질문 설정 */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>질문 설정</h3>
        <p style={sectionDesc}>주관식 또는 객관식 질문을 추가하세요</p>
        {form.questions.map((q, idx) => (
          <div key={idx} style={{
            background: '#f8fafc', padding: '16px', borderRadius: '12px',
            marginBottom: '12px', border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{
                background: q.type === '주관식' ? '#eff6ff' : '#fef2f2',
                color: q.type === '주관식' ? '#3b82f6' : '#ef4444',
                padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600'
              }}>{q.type}</span>
              {form.questions.length > 1 && (
                <button onClick={() => removeQuestion(idx)} style={{
                  background: 'none', border: 'none', color: '#ef4444',
                  cursor: 'pointer', fontSize: '18px'
                }}>×</button>
              )}
            </div>
            <input style={inputStyle}
              placeholder={q.type === '주관식' ? '예) 가계부 앱 써본 적 있나요?' : '예) 월 얼마까지 낼 의향이 있나요?'}
              value={q.content} onChange={e => updateQuestion(idx, 'content', e.target.value)} />
            {q.type === '객관식' && (
              <div style={{ marginTop: '10px' }}>
                {q.options.map((opt, oIdx) => (
                  <input key={oIdx} style={{ ...inputStyle, marginBottom: '6px' }}
                    placeholder={`선택지 ${oIdx + 1}`}
                    value={opt} onChange={e => updateOption(idx, oIdx, e.target.value)} />
                ))}
                <button onClick={() => addOption(idx)} style={{
                  background: 'none', border: '1px dashed #3b82f6',
                  color: '#3b82f6', padding: '6px 14px', borderRadius: '8px',
                  cursor: 'pointer', fontSize: '13px', marginTop: '4px'
                }}>+ 선택지 추가</button>
              </div>
            )}
          </div>
        ))}
        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          <button onClick={() => addQuestion('주관식')} style={{
            flex: 1, padding: '10px', borderRadius: '10px',
            border: '1px dashed #3b82f6', color: '#3b82f6',
            background: 'white', cursor: 'pointer', fontWeight: '600',
            fontFamily: 'Noto Sans KR, sans-serif', fontSize: '13px'
          }}>+ 주관식 질문</button>
          <button onClick={() => addQuestion('객관식')} style={{
            flex: 1, padding: '10px', borderRadius: '10px',
            border: '1px dashed #ef4444', color: '#ef4444',
            background: 'white', cursor: 'pointer', fontWeight: '600',
            fontFamily: 'Noto Sans KR, sans-serif', fontSize: '13px'
          }}>+ 객관식 질문</button>
        </div>
      </div>

      {/* 페르소나 필터 */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>페르소나 필터</h3>
        <p style={sectionDesc}>응답받을 가상 사용자의 특성을 설정하세요 (선택사항)</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={labelStyle}>성별</label>
            <select style={inputStyle} value={form.filters.sex} onChange={e => updateFilter('sex', e.target.value)}>
              <option value="">전체</option>
              <option value="남자">남자</option>
              <option value="여자">여자</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>지역</label>
            <select style={inputStyle} value={form.filters.province} onChange={e => updateFilter('province', e.target.value)}>
              <option value="">전체</option>
              {regions.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>나이 범위</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input type="number" style={{ ...inputStyle, width: '70px' }} min={19} max={99}
                value={form.filters.age_min} onChange={e => updateFilter('age_min', Number(e.target.value))} />
              <span style={{ color: '#94a3b8' }}>~</span>
              <input type="number" style={{ ...inputStyle, width: '70px' }} min={19} max={99}
                value={form.filters.age_max} onChange={e => updateFilter('age_max', Number(e.target.value))} />
              <span style={{ color: '#94a3b8' }}>세</span>
            </div>
          </div>
          <div>
            <label style={labelStyle}>직업 키워드 (선택사항)</label>
            <input style={inputStyle} placeholder="예: 개발자, 디자이너, 학생"
              value={form.filters.occupation} onChange={e => updateFilter('occupation', e.target.value)} />
          </div>
        </div>
      </div>

      {/* 실험 규모 */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>실험 규모</h3>
        <p style={sectionDesc}>응답받을 페르소나 수를 설정하세요</p>
        <label style={labelStyle}>샘플 크기: <strong style={{ color: '#3b82f6' }}>{form.n}명</strong></label>
        <input type="range" min={10} max={100} step={10} value={form.n}
          onChange={e => updateField('n', Number(e.target.value))}
          style={{ width: '100%', accentColor: '#3b82f6' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
          <span>10명</span><span>100명</span>
        </div>
      </div>

      <button onClick={handleSubmit} disabled={loading} style={{
        width: '100%', padding: '16px',
        background: loading ? '#94a3b8' : '#3b82f6',
        color: 'white', border: 'none', borderRadius: '12px',
        fontSize: '16px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer',
        fontFamily: 'Noto Sans KR, sans-serif',
      }}>
        {loading ? '실험 진행 중...' : '실험 시작하기'}
      </button>
    </div>
  );
}