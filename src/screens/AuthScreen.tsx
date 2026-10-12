import React, { useState } from 'react';
import { WelcomeScreen } from './WelcomeScreen';
import { LoginScreen } from './LoginScreen';
import { RegisterScreen } from './RegisterScreen';

export type AuthMode = 'welcome' | 'login' | 'register';

export const AuthScreen: React.FC = () => {
  const [authMode, setAuthMode] = useState<AuthMode>('welcome');

  if (authMode === 'login') {
    return (
      <LoginScreen
        onNavigateToRegister={() => setAuthMode('register')}
        onBackToWelcome={() => setAuthMode('welcome')}
      />
    );
  }

  if (authMode === 'register') {
    return (
      <RegisterScreen
        onNavigateToLogin={() => setAuthMode('login')}
        onBackToWelcome={() => setAuthMode('welcome')}
      />
    );
  }

  return (
    <WelcomeScreen
      onStartJourney={() => setAuthMode('register')}
      onNavigateToLogin={() => setAuthMode('login')}
    />
  );
};
