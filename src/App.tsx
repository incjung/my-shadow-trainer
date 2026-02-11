import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Analytics from './pages/Analytics';
import './App.css';

const Navigation = () => {
  const location = useLocation();
  return (
    <nav className="main-nav">
      <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
        🏠 Player
      </Link>
      <Link to="/analytics" className={`nav-link ${location.pathname === '/analytics' ? 'active' : ''}`}>
        📊 Analytics
      </Link>
    </nav>
  );
};

function App() {
  return (
    <Router>
      <div className="app-container">
        <h1>🎵 Bun Audio Study</h1>
        <Navigation />

        <div className="content-area">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/analytics" element={<Analytics />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
