import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './GenreSelection.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller', 'Music', 'Biography', 'History', 'Animation', 'Documentary'
];

function GenreSelection({ setSelectedGenres }) {
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const toggleGenre = genre => {
    setSelected(prev =>
      prev.includes(genre)
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  const handleContinue = async () => {
    const email = localStorage.getItem('email');
    
    // Debug: Log all localStorage items
    console.log('LocalStorage contents:', {
      email: localStorage.getItem('email'),
      username: localStorage.getItem('username'),
      token: localStorage.getItem('token')
    });
    
    if (!email) {
      setError('User email not found. Please login again.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Save genres to MongoDB
      const response = await fetch(`${API_URL}/favourites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email,
          genres: selected
        })
      });

      const data = await response.json();

      if (data.success) {
        // Save to parent component state and localStorage
        setSelectedGenres(selected);
        localStorage.setItem('genresChosen', 'true');
        localStorage.setItem('favouriteGenres', JSON.stringify(selected));
        navigate('/dashboard');
      } else {
        setError(data.message || 'Failed to save favourite genres.');
      }
    } catch (err) {
      console.error('Error saving favourite genres:', err);
      setError('Failed to save favourite genres. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="genre-selection-container">
      <h2>Select Your Favorite Genres</h2>
      {error && (
        <div style={{ 
          color: '#ef4444', 
          background: '#fee', 
          padding: '12px', 
          borderRadius: '8px', 
          marginBottom: '16px',
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}
      <div className="genres-list">
        {GENRES.map(genre => (
          <div
            key={genre}
            className={`genre-item${selected.includes(genre) ? ' selected' : ''}`}
            onClick={() => toggleGenre(genre)}
          >
            {genre}
          </div>
        ))}
      </div>
      {selected.length > 0 && (
        <button 
          className="continue-btn" 
          onClick={handleContinue}
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Continue'}
        </button>
      )}
    </div>
  );
}

export default GenreSelection;
