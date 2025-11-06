import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
// 전역 스타일
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter> {/* 전체 앱을 BrowserRouter로 감싸기 */}
      <App />
    </BrowserRouter>
  </React.StrictMode>
);