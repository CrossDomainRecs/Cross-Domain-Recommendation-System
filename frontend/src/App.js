import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import SignUp from './components/SignUp';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';
import ProtectedRoute from './components/ProtectedRoute';
import GenreSelection from './components/GenreSelection';
import './App.css';

function App() {
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [genresChosen, setGenresChosen] = useState(false);

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={
            <ProtectedRoute adminOnly={true}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/genre-selection" element={
            <GenreSelection setSelectedGenres={genres => { setSelectedGenres(genres); setGenresChosen(true); }} />
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard selectedGenres={selectedGenres} />
            </ProtectedRoute>
          } />
          <Route path="/" element={
            <Navigate to={isAdmin ? "/admin/dashboard" : (genresChosen ? "/dashboard" : "/genre-selection")} />
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
