import React, { useState } from 'react';

const regions = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];
const experimentTypes = ['사전조사', 'A/B테스트', '가격책정', '사용성테스트', '브랜드인식'];

export default function ExperimentForm({ onSubmit, onBack, initialData }) { 
  const [form, setForm] = useState({ // ★ initialData가 있으면 그걸 초기값으로 설정!
    experiment_title: '',
    experiment_type: '사전조사',
    service_description: '',
    questions: [{ type: '주관식', content: '', options: [] }],
    images: [],
    n: 100,
    filters: { sex: '', age_min: 19, age_max: 99, province: '', occupation: '' },
    ...(initialData || {})
  });
  const [loading, setLoading] = useState(false);

  const updateField = (field, value) => setForm(prev => {
    const next = { ...prev, [field]: value };
    // A/B 테스트로 전환 시, 비교할 이미지를 넣을 빈 슬롯 2개를 기본으로 추가
    if (field === 'experiment_type' && value === 'A/B테스트' && (!prev.images || prev.images.length === 0)) {
      next.images = [{ label: 'A안', url: '' }, { label: 'B안', url: '' }];
    }
    return next;
  });
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

  const addImage = () => {
    setForm(prev => ({ ...prev, images: [...prev.images, { label: '', url: '' }] }));
  };

  const updateImageLabel = (idx, label) => {
    const updated = [...form.images];
    updated[idx] = { ...updated[idx], label };
    setForm(prev => ({ ...prev, images: updated }));
  };

  const removeImage = (idx) => {
    setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));
  };

  const handleImageFile = (idx, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target.result;
      setForm(prev => {
        const updated = [...prev.images];
        updated[idx] = { ...updated[idx], url };
        return { ...prev, images: updated };
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!form.experiment_title) return alert('실험 제목을 입력해주세요!');
    if (form.questions.some(q => !q.content)) return alert('모든 질문을 입력해주세요!');

    const validImages = form.images.filter(img => img.url);
    if (form.experiment_type === 'A/B테스트' && validImages.length < 2) {
      return alert('A/B 테스트를 위해 비교할 이미지를 2개 이상 업로드해주세요!');
    }

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
      images: validImages.map((img, idx) => ({
        image_id: idx,
        label: img.label || `이미지 ${idx + 1}`,
        url: img.url
      })),
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
      const apiBase = process.env.REACT_APP_API_URL || '/api';
      const response = await fetch(`${apiBase}/run-experiment`, {
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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;800&family=Inter:wght@500;700;800&display=swap');

        * { box-sizing: border-box; }

        .ef-root {
          min-height: 100vh;
          font-family: 'Noto Sans KR', sans-serif;
          color: #0f172a;
          padding-bottom: 80px;

          background-color: #f8fafc;
          background-image: 
            linear-gradient(to right, rgba(79, 70, 229, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(79, 70, 229, 0.03) 1px, transparent 1px);
          background-size: 32px 32px;
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

        /* 폼 컨테이너 */
        .ef-container {
          max-width: 760px;
          margin: 40px auto 0 auto;
          padding: 0 24px;
        }

        /* 헤더 타이틀 블록 */
        .ef-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 32px;
        }
        
        .ef-back-btn {
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
        .ef-back-btn:hover {
          background: #f1f5f9;
          color: #4f46e5;
          border-color: #cbd5e1;
        }
        .ef-header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.02em;
        }
        .ef-header p {
          margin: 3px 0 0 0;
          font-size: 14px;
          color: #64748b;
        }

        /* 화이트 카드 스타일 */
        .ef-card {
          background: #ffffff;
          padding: 28px;
          border-radius: 20px;
          border: 1px solid rgba(241, 245, 249, 0.9);
          box-shadow: 0 10px 25px rgba(15, 23, 42, 0.03);
          margin-bottom: 24px;
        }
        .ef-section-title {
          color: #0f172a;
          font-weight: 800;
          font-size: 17px;
          margin: 0 0 4px 0;
          letter-spacing: -0.01em;
        }
        .ef-section-desc {
          color: #64748b;
          font-size: 13px;
          margin: 0 0 24px 0;
        }

        /* 폼 입력 요소들 */
        .ef-label {
          font-weight: 700;
          font-size: 13.5px;
          color: #334155;
          margin-bottom: 8px;
          display: block;
        }
        .ef-input, .ef-select, .ef-textarea {
          width: 100%;
          padding: 12px 16px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          font-size: 14.5px;
          outline: none;
          background: #f8fafc;
          color: #0f172a;
          font-family: inherit;
          transition: all 0.2s ease;
        }
        .ef-input:focus, .ef-select:focus, .ef-textarea:focus {
          border-color: #4f46e5;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        /* 태그 선택 버튼 칩 */
        .ef-tag-container {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .ef-tag-btn {
          padding: 8px 18px;
          border-radius: 99px;
          border: 1px solid #e2e8f0;
          cursor: pointer;
          font-size: 13.5px;
          font-weight: 500;
          font-family: inherit;
          background: #ffffff;
          color: #475569;
          transition: all 0.2s ease;
        }
        .ef-tag-btn:hover {
          background: #f1f5f9;
          color: #0f172a;
        }
        .ef-tag-btn.active {
          background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
          color: #ffffff;
          border: none;
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
          font-weight: 600;
        }

        /* 개별 질문 아이템 블록 */
        .ef-q-box {
          background: #f8fafc;
          padding: 20px;
          border-radius: 14px;
          margin-bottom: 16px;
          border: 1px solid #e2e8f0;
        }
        .ef-q-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .ef-q-badge {
          font-size: 12px;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 6px;
        }
        .ef-q-badge.subjective { background: #e0e7ff; color: #4f46e5; }
        .ef-q-badge.objective { background: #f3e8ff; color: #7c3aed; }
        
        .ef-q-remove {
          background: none; border: none; color: #94a3b8;
          cursor: pointer; font-size: 20px; line-height: 1;
          transition: color 0.2s;
        }
        .ef-q-remove:hover { color: #ef4444; }

        .ef-add-q-btn {
          flex: 1; padding: 12px; border-radius: 10px;
          border: 1px dashed #cbd5e1; color: #475569;
          background: #ffffff; cursor: pointer; font-weight: 600;
          font-family: inherit; font-size: 13.5px;
          transition: all 0.2s;
        }
        .ef-add-q-btn:hover {
          border-color: #4f46e5;
          color: #4f46e5;
          background: #f5f3ff;
        }
        
        .ef-add-opt-btn {
          background: none; border: 1px dashed #cbd5e1;
          color: #64748b; padding: 6px 14px; border-radius: 8px;
          cursor: pointer; font-size: 13px; marginTop: 6px;
          font-weight: 500; transition: all 0.2s;
        }
        .ef-add-opt-btn:hover { border-color: #7c3aed; color: #7c3aed; }

        /* A/B 테스트 이미지 업로드 */
        .ef-img-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }
        .ef-img-box {
          position: relative;
          background: #f8fafc;
          padding: 16px;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
        }
        .ef-img-preview {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 140px;
          border-radius: 10px;
          border: 1px dashed #cbd5e1;
          background: #ffffff;
          color: #94a3b8;
          font-size: 13px;
          font-weight: 500;
          overflow: hidden;
          cursor: pointer;
          margin-bottom: 12px;
          transition: all 0.2s ease;
        }
        .ef-img-preview:hover { border-color: #4f46e5; color: #4f46e5; }
        .ef-img-preview img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .ef-img-remove {
          position: absolute;
          top: 10px; right: 10px;
          width: 26px; height: 26px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.9);
          border: none; border-radius: 50%;
          color: #94a3b8; cursor: pointer;
          font-size: 18px; line-height: 1;
          z-index: 1;
          transition: color 0.2s;
        }
        .ef-img-remove:hover { color: #ef4444; }

        /* 최하단 메인 제출 버튼 */
        .ef-submit-btn {
          width: 100%; padding: 18px;
          background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
          color: white; border: none; border-radius: 14px;
          font-size: 17px; font-weight: 700; 
          cursor: pointer; font-family: inherit;
          box-shadow: 0 10px 28px rgba(79, 70, 229, 0.3);
          transition: all 0.3s ease;
        }
        .ef-submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 16px 36px rgba(79, 70, 229, 0.45);
        }
        .ef-submit-btn:disabled {
          background: #cbd5e1;
          color: #94a3b8;
          cursor: not-allowed;
          box-shadow: none;
        }
      `}</style>

      <div className="ef-root">
        {/* 상단 네비게이션 */}
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

        {/* 메인 폼 바디 */}
        <div className="ef-container">
          <div className="ef-header">
            <button onClick={onBack} className="ef-back-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 20L8 12L16 4" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <div>
              <h1>실험 설정</h1>
              <p>가상 사용자 리서치 실험을 설정하세요</p>
            </div>
          </div>

          {/* 기본 정보 카드 */}
          <div className="ef-card">
            <h3 className="ef-section-title">기본 정보</h3>
            <p className="ef-section-desc">실험의 제목과 목적을 입력하세요</p>
            
            <div style={{ marginBottom: '20px' }}>
              <label className="ef-label">실험 제목</label>
              {/* ★ spellCheck={false} 반영 ★ */}
              <input spellCheck={false} className="ef-input" placeholder="예: 새로운 앱 기능에 대한 사용자 반응 조사"
                value={form.experiment_title} onChange={e => updateField('experiment_title', e.target.value)} />
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label className="ef-label">실험 목적</label>
              <div className="ef-tag-container">
                {experimentTypes.map(t => (
                  <button key={t} 
                    onClick={() => updateField('experiment_type', t)} 
                    className={`ef-tag-btn ${form.experiment_type === t ? 'active' : ''}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="ef-label">서비스 설명 (선택사항)</label>
              {/* ★ spellCheck={false} 반영 ★ */}
              <textarea spellCheck={false} className="ef-textarea" style={{ height: '90px', resize: 'vertical' }}
                placeholder="테스트하려는 서비스나 기능에 대해 간단히 설명해주세요"
                value={form.service_description} onChange={e => updateField('service_description', e.target.value)} />
            </div>
          </div>

          {/* 질문 설정 카드 */}
          <div className="ef-card">
            <h3 className="ef-section-title">질문 설정</h3>
            <p className="ef-section-desc">주관식 또는 객관식 질문을 추가하세요</p>
            
            {form.questions.map((q, idx) => (
              <div key={idx} className="ef-q-box">
                <div className="ef-q-header">
                  <span className={`ef-q-badge ${q.type === '주관식' ? 'subjective' : 'objective'}`}>{q.type}</span>
                  {form.questions.length > 1 && (
                    <button onClick={() => removeQuestion(idx)} className="ef-q-remove">×</button>
                  )}
                </div>
                
                {/* ★ spellCheck={false} 반영 ★ */}
                <input spellCheck={false} className="ef-input" style={{ background: '#fff' }}
                  placeholder={q.type === '주관식' ? '예) 가계부 앱 써본 적 있나요?' : '예) 월 얼마까지 낼 의향이 있나요?'}
                  value={q.content} onChange={e => updateQuestion(idx, 'content', e.target.value)} />
                
                {q.type === '객관식' && (
                  <div style={{ marginTop: '12px' }}>
                    {q.options.map((opt, oIdx) => (
                      /* ★ spellCheck={false} 반영 ★ */
                      <input spellCheck={false} key={oIdx} className="ef-input" style={{ marginBottom: '8px', background: '#fff' }}
                        placeholder={`선택지 ${oIdx + 1}`}
                        value={opt} onChange={e => updateOption(idx, oIdx, e.target.value)} />
                    ))}
                    <button onClick={() => addOption(idx)} className="ef-add-opt-btn">+ 선택지 추가</button>
                  </div>
                )}
              </div>
            ))}
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button onClick={() => addQuestion('주관식')} className="ef-add-q-btn">+ 주관식 질문</button>
              <button onClick={() => addQuestion('객관식')} className="ef-add-q-btn">+ 객관식 질문</button>
            </div>
          </div>

          {/* A/B 테스트 이미지 카드 */}
          {form.experiment_type === 'A/B테스트' && (
            <div className="ef-card">
              <h3 className="ef-section-title">A/B 테스트 이미지</h3>
              <p className="ef-section-desc">비교할 시안 이미지를 업로드하고 각각에 라벨을 지정하세요 (예: A안, B안)</p>

              <div className="ef-img-grid">
                {form.images.map((img, idx) => (
                  <div key={idx} className="ef-img-box">
                    {form.images.length > 1 && (
                      <button onClick={() => removeImage(idx)} className="ef-img-remove">×</button>
                    )}
                    <label className="ef-img-preview">
                      {img.url
                        ? <img src={img.url} alt={img.label || `이미지 ${idx + 1}`} />
                        : '클릭하여 이미지 선택'}
                      <input type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={e => handleImageFile(idx, e.target.files?.[0])} />
                    </label>
                    {/* ★ spellCheck={false} 반영 ★ */}
                    <input spellCheck={false} className="ef-input" style={{ background: '#fff' }}
                      placeholder={`라벨 (예: ${idx === 0 ? 'A안' : 'B안'})`}
                      value={img.label} onChange={e => updateImageLabel(idx, e.target.value)} />
                  </div>
                ))}
              </div>

              <button onClick={addImage} className="ef-add-q-btn" style={{ marginTop: '16px', width: '100%' }}>+ 이미지 추가</button>
            </div>
          )}

          {/* 페르소나 필터 카드 */}
          <div className="ef-card">
            <h3 className="ef-section-title">페르소나 필터</h3>
            <p className="ef-section-desc">응답받을 가상 사용자의 특성을 설정하세요 (선택사항)</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label className="ef-label">성별</label>
                <select className="ef-select" value={form.filters.sex} onChange={e => updateFilter('sex', e.target.value)}>
                  <option value="">전체</option>
                  <option value="남자">남자</option>
                  <option value="여자">여자</option>
                </select>
              </div>
              <div>
                <label className="ef-label">지역</label>
                <select className="ef-select" value={form.filters.province} onChange={e => updateFilter('province', e.target.value)}>
                  <option value="">전체</option>
                  {regions.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="ef-label">나이 범위</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input type="number" className="ef-input" style={{ width: '80px', textAlign: 'center' }} min={19} max={99}
                    value={form.filters.age_min} onChange={e => updateFilter('age_min', Number(e.target.value))} />
                  <span style={{ color: '#94a3b8', fontWeight: 'bold' }}>~</span>
                  <input type="number" className="ef-input" style={{ width: '80px', textAlign: 'center' }} min={19} max={99}
                    value={form.filters.age_max} onChange={e => updateFilter('age_max', Number(e.target.value))} />
                  <span style={{ color: '#64748b', fontSize: '14px' }}>세</span>
                </div>
              </div>
              <div>
                <label className="ef-label">직업 키워드 (선택사항)</label>
                {/* ★ spellCheck={false} 반영 ★ */}
                <input spellCheck={false} className="ef-input" placeholder="예: 개발자, 디자이너, 학생"
                  value={form.filters.occupation} onChange={e => updateFilter('occupation', e.target.value)} />
              </div>
            </div>
          </div>

          {/* 실험 규모 카드 */}
          <div className="ef-card">
            <h3 className="ef-section-title">실험 규모</h3>
            <p className="ef-section-desc">응답받을 페르소나 수를 설정하세요</p>
            
            <label className="ef-label" style={{ marginBottom: '12px' }}>
              샘플 크기: <span style={{ color: '#4f46e5', fontSize: '18px', fontWeight: '800' }}>{form.n}명</span>
            </label>
            <input type="range" min={10} max={100} step={10} value={form.n}
              onChange={e => updateField('n', Number(e.target.value))}
              style={{ width: '100%', accentColor: '#4f46e5', cursor: 'pointer' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', fontWeight: '500', marginTop: '6px' }}>
              <span>10명</span>
              <span>100명</span>
            </div>
          </div>

          {/* 버튼 */}
          <button onClick={handleSubmit} disabled={loading} className="ef-submit-btn">
            {loading ? '실험 패널 모집 및 가동 중...' : '실험 시작하기'}
          </button>
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