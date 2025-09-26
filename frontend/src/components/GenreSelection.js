import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './GenreSelection.css';

const GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller', 'Music', 'Biography', 'History', 'Animation', 'Documentary'
];

function GenreSelection({ setSelectedGenres }) {
  const [selected, setSelected] = useState([]);
  const navigate = useNavigate();

  const toggleGenre = genre => {
    setSelected(prev =>
      prev.includes(genre)
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  const handleContinue = () => {
    setSelectedGenres(selected);
    navigate('/dashboard');
  };

  return (
    <div className="genre-selection-container">
      <h2>Select Your Favorite Genres</h2>
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
        <button className="continue-btn" onClick={handleContinue}>
          Continue
        </button>
      )}
    </div>
  );
}

export default GenreSelection;
