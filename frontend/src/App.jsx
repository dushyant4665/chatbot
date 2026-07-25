import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import Chat from './pages/Chat.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import { getToken } from './lib/session.js';

function PrivateRoute({ children }) {
  return getToken() ? children : <Navigate to="/" replace />;
}

function PublicRoute({ children }) {
  return getToken() ? <Navigate to="/home" replace /> : children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/home" element={<PrivateRoute><Chat simpleMode /></PrivateRoute>} />
        <Route path="/simple-chat" element={<PrivateRoute><Chat simpleMode /></PrivateRoute>} />
        <Route path="/simple-chat/:chatId" element={<PrivateRoute><Chat simpleMode /></PrivateRoute>} />
        <Route path="/chat/:chatId" element={<PrivateRoute><Chat /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
