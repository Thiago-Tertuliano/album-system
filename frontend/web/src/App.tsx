import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import HomePage from './pages/HomePage';
import EditionPage from './pages/EditionPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminEditionsPage from './pages/AdminEditionsPage';
import AdminEditionNewPage from './pages/AdminEditionNewPage';
import AdminEditionEditPage from './pages/AdminEditionEditPage';
import BottomNav from './components/BottomNav';
import BackButtonHandler from './components/BackButtonHandler';

const isCollectorApp = import.meta.env.VITE_APP_MODE === 'collector';

function AnimatedRoutes() {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState('fadeIn');

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      setTransitionStage('fadeOut');
    }
  }, [location, displayLocation]);

  return (
    <div
      className={`route-transition ${transitionStage}`}
      onAnimationEnd={() => {
        if (transitionStage === 'fadeOut') {
          setDisplayLocation(location);
          setTransitionStage('fadeIn');
        }
      }}
    >
      <Routes location={displayLocation}>
        <Route path="/" element={<HomePage />} />
        <Route path="/edition/:slug" element={<EditionPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        {!isCollectorApp ? (
          <>
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin/editions" element={<AdminEditionsPage />} />
            <Route path="/admin/editions/new" element={<AdminEditionNewPage />} />
            <Route path="/admin/editions/:id/edit" element={<AdminEditionEditPage />} />
          </>
        ) : null}
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <div className="layout">
      <BackButtonHandler />

      <main className="main">
        <AnimatedRoutes />
      </main>

      <BottomNav />
    </div>
  );
}
