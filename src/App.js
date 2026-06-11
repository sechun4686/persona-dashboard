import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import ExperimentForm from './components/ExperimentForm';

function App() {
  const [page, setPage] = useState('landing');
  const [experimentData, setExperimentData] = useState(null);

  if (page === 'landing') {
    return <LandingPage onStart={() => setPage('form')} />;
  }

  if (page === 'form') {
    return (
      <ExperimentForm
        initialData={experimentData} // ★ 1. 기존에 저장된 입력 데이터를 폼의 초기값으로 쏴주기!
        onSubmit={(data) => { 
          setExperimentData(data); 
          setPage('dashboard'); 
        }}
        onBack={() => setPage('landing')}
      />
    );
  }

  /* ★ 2. 결과 창(Dashboard)에서 뒤로 갈 때 'landing'이 아니라 'form'으로 가도록 페이지 수정! */
  return <Dashboard experimentData={experimentData} onBack={() => setPage('form')} />;
}

export default App;