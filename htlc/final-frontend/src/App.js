import { useState } from 'react';
import './App.css';
import Landing from './Landing';
import DeadManSwitch from './DeadManSwitch';

function App() {
  const [currentPage, setCurrentPage] = useState('landing');

  return (
    <div className="App">
      {currentPage === 'landing' ? (
        <Landing onGetStarted={() => setCurrentPage('deadman')} />
      ) : (
        <DeadManSwitch />
      )}
    </div>
  );
}

export default App;
