import React, { useState } from 'react';

const regions = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충청북', '충청남', '전라북', '전라남', '경상북', '경상남', '제주'];
const educations = ['초등학교', '중학교', '고등학교', '2~3년제 전문대학', '4년제 대학교', '대학원', '해당없음'];
const experimentTypes = ['사전조사', 'A/B테스트', '가격책정', '사용성테스트', '브랜드인식'];

export default function ExperimentForm({ onSubmit }) {
  const [form, setForm] = useState({
    experiment_title: '',
    experiment_type: '사전조사',
    service_description: '',
    questions: [{ type: '주관식', content: '', options: [] }],
    n: 100,
    filters: { sex: '', age_min: 19, age_max: 99, province: '', occupation: '', education_level: '' }
  });

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

  const handleSubmit = () => {
    if (!form.experiment_title) return alert('실험 제목을 입력해주세요!');
    if (form.questions.some(q => !q.content)) return alert('모든 질문을 입력해주세요!');
    onSubmit(form);
  };

  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #dde1e7', fontSize: '14px', boxSizing: 'border-box', outline: 'none' };
  const labelStyle = { fontWeight: '600', fontSize: '14px', color: '#2c3e50', marginBottom: '6px', display: 'block' };
  const cardStyle = { background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: '20px' };

  return (
    <div style={{ padding: '32px', fontFamily: 'sans-serif', background: '#f0f4f8', minHeight: '100vh', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ color: '#2c3e50', marginBottom: '8px' }}>새 실험 설정</h1>
      <p style={{ color: '#7f8c8d', marginBottom: '32px' }}>가상 사용자 리서치 실험을 설정하세요</p>

      {/* 기본 정보 */}
      <div style={cardStyle}>
        <h3 style={{ color: '#2c3e50', marginTop: 0, marginBottom: '20px' }}>실험 기본 정보</h3>
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>실험 제목 *</label>
          <input style={inputStyle} placeholder="예) 20대의 독서율 사전조사" value={form.experiment_title} onChange={e => updateField('experiment_title', e.target.value)} />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>실험 목적 *</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {experimentTypes.map(t => (
              <button key={t} onClick={() => updateField('experiment_type', t)}
                style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '13px',
                  background: form.experiment_type === t ? '#3498DB' : '#ecf0f1',
                  color: form.experiment_type === t ? 'white' : '#2c3e50', fontWeight: form.experiment_type === t ? '600' : '400' }}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={labelStyle}>서비스 설명 (선택)</label>
          <textarea style={{ ...inputStyle, height: '80px', resize: 'vertical' }} placeholder="예) 20-30대 타겟 가계부 앱" value={form.service_description} onChange={e => updateField('service_description', e.target.value)} />
        </div>
      </div>

      {/* 질문 */}
      <div style={cardStyle}>
        <h3 style={{ color: '#2c3e50', marginTop: 0, marginBottom: '20px' }}>질문</h3>
        {form.questions.map((q, idx) => (
          <div key={idx} style={{ background: '#f8f9fa', padding: '16px', borderRadius: '12px', marginBottom: '12px', border: '1px solid #e9ecef' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ background: q.type === '주관식' ? '#3498DB' : '#E74C3C', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>{q.type}</span>
              {form.questions.length > 1 && (
                <button onClick={() => removeQuestion(idx)} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '18px' }}>×</button>
              )}
            </div>
            <input style={inputStyle} placeholder={q.type === '주관식' ? '예) 가계부 앱 써본 적 있나요?' : '예) 월 얼마까지 낼 의향이 있나요?'}
              value={q.content} onChange={e => updateQuestion(idx, 'content', e.target.value)} />
            {q.type === '객관식' && (
              <div style={{ marginTop: '10px' }}>
                {q.options.map((opt, oIdx) => (
                  <input key={oIdx} style={{ ...inputStyle, marginBottom: '6px' }} placeholder={`선택지 ${oIdx + 1}`}
                    value={opt} onChange={e => updateOption(idx, oIdx, e.target.value)} />
                ))}
                <button onClick={() => addOption(idx)} style={{ background: 'none', border: '1px dashed #3498DB', color: '#3498DB', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', marginTop: '4px' }}>
                  + 선택지 추가
                </button>
              </div>
            )}
          </div>
        ))}
        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          <button onClick={() => addQuestion('주관식')} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px dashed #3498DB', color: '#3498DB', background: 'white', cursor: 'pointer', fontWeight: '600' }}>
            + 주관식 질문
          </button>
          <button onClick={() => addQuestion('객관식')} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px dashed #E74C3C', color: '#E74C3C', background: 'white', cursor: 'pointer', fontWeight: '600' }}>
            + 객관식 질문
          </button>
        </div>
      </div>

      {/* 페르소나 필터 */}
      <div style={cardStyle}>
        <h3 style={{ color: '#2c3e50', marginTop: 0, marginBottom: '20px' }}>페르소나 필터 (선택)</h3>
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
              <input type="number" style={{ ...inputStyle, width: '80px' }} min={19} max={99} value={form.filters.age_min} onChange={e => updateFilter('age_min', Number(e.target.value))} />
              <span style={{ color: '#7f8c8d' }}>~</span>
              <input type="number" style={{ ...inputStyle, width: '80px' }} min={19} max={99} value={form.filters.age_max} onChange={e => updateFilter('age_max', Number(e.target.value))} />
              <span style={{ color: '#7f8c8d' }}>세</span>
            </div>
          </div>
          <div>
            <label style={labelStyle}>직업 (키워드)</label>
            <input style={inputStyle} placeholder="예) 사무원" value={form.filters.occupation} onChange={e => updateFilter('occupation', e.target.value)} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>학력</label>
            <select style={inputStyle} value={form.filters.education_level} onChange={e => updateFilter('education_level', e.target.value)}>
              <option value="">전체</option>
              {educations.map(e => <option key={e}>{e}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* 실험 규모 */}
      <div style={cardStyle}>
        <h3 style={{ color: '#2c3e50', marginTop: 0, marginBottom: '20px' }}>실험 규모</h3>
        <label style={labelStyle}>페르소나 수: <strong style={{ color: '#3498DB' }}>{form.n}명</strong></label>
        <input type="range" min={10} max={100} step={10} value={form.n} onChange={e => updateField('n', Number(e.target.value))}
          style={{ width: '100%', accentColor: '#3498DB' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#7f8c8d' }}>
          <span>10명</span><span>100명</span>
        </div>
      </div>

      {/* 제출 버튼 */}
      <button onClick={handleSubmit}
        style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #3498DB, #2980b9)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 15px rgba(52,152,219,0.4)' }}>
        실험 시작하기
      </button>
    </div>
  );
}