import { useState, useEffect } from 'react';
import { LoginPage } from './components/auth/LoginPage';
import { SignupPage } from './components/auth/SignupPage';
import { Dashboard } from './components/Dashboard';

// Mock database
const ADMIN_CREDENTIALS = {
  email: 'admin@company.in',
  password: 'admin',
  name: 'Admin User'
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check session on mount
  useEffect(() => {
    const checkSession = () => {
      const session = localStorage.getItem('trackpro_session');
      if (session) {
        try {
          const sessionData = JSON.parse(session);
          // Check if session is valid and not expired
          if (sessionData.isAuthenticated && sessionData.email) {
            setIsAuthenticated(true);
          }
        } catch (error) {
          console.error('Invalid session data');
          localStorage.removeItem('trackpro_session');
        }
      }
      setIsLoading(false);
    };

    checkSession();
  }, []);

  const handleLogin = (email: string, password: string) => {
    // Check credentials against mock database
    if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
      const sessionData = {
        isAuthenticated: true,
        email: email,
        name: ADMIN_CREDENTIALS.name,
        loginTime: new Date().toISOString()
      };
      
      // Store session in localStorage
      localStorage.setItem('trackpro_session', JSON.stringify(sessionData));
      setIsAuthenticated(true);
    } else {
      alert('Invalid credentials. Use email: admin@company.in and password: admin');
    }
  };

  const handleSignup = (name: string, email: string, password: string) => {
    // For demo purposes, allow signup but use the admin credentials to login
    const sessionData = {
      isAuthenticated: true,
      email: email,
      name: name,
      loginTime: new Date().toISOString()
    };
    
    localStorage.setItem('trackpro_session', JSON.stringify(sessionData));
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    // Clear session from localStorage
    localStorage.removeItem('trackpro_session');
    setIsAuthenticated(false);
    setShowSignup(false);
  };

  // Show loading state while checking session
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (showSignup) {
      return (
        <SignupPage 
          onSignup={handleSignup}
          onSwitchToLogin={() => setShowSignup(false)}
        />
      );
    }
    return (
      <LoginPage 
        onLogin={handleLogin}
        onSwitchToSignup={() => setShowSignup(true)}
      />
    );
  }

  return <Dashboard onLogout={handleLogout} />;
}
