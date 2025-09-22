import React, { useState } from 'react';
import './Dashboard.css';

function Dashboard() {
  const [activeSection, setActiveSection] = useState('movies');

  // Sample movie data (replace with actual API calls later)
  const sampleMovies = [
    {
      id: 1,
      title: "Inception",
      genre: "Sci-Fi",
      rating: 4.8,
      imageUrl: "https://via.placeholder.com/150x225"
    },
    {
      id: 2,
      title: "The Shawshank Redemption",
      genre: "Drama",
      rating: 4.9,
      imageUrl: "https://via.placeholder.com/150x225"
    },
    {
      id: 3,
      title: "The Dark Knight",
      genre: "Action",
      rating: 4.7,
      imageUrl: "https://via.placeholder.com/150x225"
    },
    {
      id: 4,
      title: "Pulp Fiction",
      genre: "Crime",
      rating: 4.6,
      imageUrl: "https://via.placeholder.com/150x225"
    },
    {
      id: 5,
      title: "Forrest Gump",
      genre: "Drama",
      rating: 4.8,
      imageUrl: "https://via.placeholder.com/150x225"
    },
    {
      id: 6,
      title: "The Matrix",
      genre: "Sci-Fi",
      rating: 4.7,
      imageUrl: "https://via.placeholder.com/150x225"
    }
  ];

  const username = localStorage.getItem('username') || 'User';

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Movie Recommender</h2>
          <p>Welcome, {username}!</p>
        </div>
        <nav className="sidebar-nav">
          <button 
            className={activeSection === 'movies' ? 'active' : ''} 
            onClick={() => setActiveSection('movies')}
          >
            Movies
          </button>
          <button 
            className={activeSection === 'favorites' ? 'active' : ''} 
            onClick={() => setActiveSection('favorites')}
          >
            Favorites
          </button>
          <button 
            className={activeSection === 'history' ? 'active' : ''} 
            onClick={() => setActiveSection('history')}
          >
            Watch History
          </button>
          <button 
            className={activeSection === 'preferences' ? 'active' : ''} 
            onClick={() => setActiveSection('preferences')}
          >
            Preferences
          </button>
        </nav>
        <button 
          className="logout-button" 
          onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            window.location.href = '/login';
          }}
        >
          Logout
        </button>
      </aside>

      <main className="main-content">
        <div className="content-header">
          <h1>Recommended Movies</h1>
          <div className="filter-section">
            <select defaultValue="all">
              <option value="all">All Genres</option>
              <option value="action">Action</option>
              <option value="comedy">Comedy</option>
              <option value="drama">Drama</option>
              <option value="scifi">Sci-Fi</option>
            </select>
            <select defaultValue="rating">
              <option value="rating">Sort by Rating</option>
              <option value="name">Sort by Name</option>
              <option value="recent">Sort by Recent</option>
            </select>
          </div>
        </div>

        <div className="movies-grid">
          {sampleMovies.map(movie => (
            <div key={movie.id} className="movie-card">
              {movie.imageUrl ? (
                <img 
                  src={movie.imageUrl} 
                  alt={movie.title}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className="no-image-placeholder" style={{ display: !movie.imageUrl ? 'flex' : 'none' }}>
                <span className="movie-title-placeholder">{movie.title}</span>
                <span>No Image Available</span>
              </div>
              <div className="movie-info">
                <h3>{movie.title}</h3>
                <p>{movie.genre}</p>
                <div className="rating">★ {movie.rating}</div>
                <button className="watch-button">Rate Now</button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;