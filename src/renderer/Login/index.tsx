import React, { useState } from 'react';
import './index.css';
// import {Link} from 'react-router-dom';

// eslint-disable-next-line react/function-component-definition
const LoginPage: React.FC = () => {
  // Estados para armazenar os valores de email e senha
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  // Função de handle do clique no botão de login
  const handleLogin = () => {
    console.log('Tentativa de login:', email, password);

    // Simular o envio dos dados via a API de preload
    window.api.sendLogin(email, password);
  };

  return (
    <div className="login-container">
      <h1>LOGIN</h1>
      <input
        type="text"
        id="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        id="password"
        placeholder="Senha"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <a href="/">Forgot password</a>
      {/* eslint-disable-next-line react/button-has-type */}
      <button onClick={handleLogin}>Sign-in</button>
      {/* eslint-disable-next-line react/button-has-type */}
      <button>Sign-up</button>
    </div>
  );
};

export default LoginPage;
