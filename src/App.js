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
    return <ExperimentForm
      onSubmit={(data) => { setExperimentData(data); setPage('dashboard'); }}
      onBack={() => setPage('landing')}
    />;
  }

  return <Dashboard experimentData={experimentData} onBack={() => setPage('landing')} />;
}

export default App;