import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { DataProvider } from './context/DataContext.jsx';
import { ModalProvider } from './context/ModalContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <DataProvider>
        <ModalProvider>
          <App />
        </ModalProvider>
      </DataProvider>
    </AuthProvider>
  </React.StrictMode>,
);
