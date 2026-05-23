import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import ExperimentForm from './components/ExperimentForm';

function App() {
  const [experimentData, setExperimentData] = useState(null);

  if (!experimentData) {
    return <ExperimentForm onSubmit={setExperimentData} />;
  }

  return <Dashboard experimentData={experimentData} onBack={() => setExperimentData(null)} />;
}

export default App;