import React, { useState } from 'react';
import { LoginScreen } from './LoginScreen';
import { RegisterScreen } from './RegisterScreen';

export const AuthScreen: React.FC = () => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  if (isRegisterMode) {
    return <RegisterScreen onNavigateToLogin={() => setIsRegisterMode(false)} />;
  }

  return <LoginScreen onNavigateToRegister={() => setIsRegisterMode(true)} />;
};
