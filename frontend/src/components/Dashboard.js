import React, { useState, useEffect } from 'react';
import './Dashboard.css';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function Dashboard({ selectedGenres = [] }) {
  const [historyBooks, setHistoryBooks] = useState([]);
  const [booksLoaded, setBooksLoaded] = useState(false);
  // Helper to fetch books
  // Shuffle array utility
  const shuffleArray = arr => arr.map(value => ({ value, sort: Math.random() })).sort((a, b) => a.sort - b.sort).map(({ value }) => value);

  const fetchBooks = React.useCallback(() => {
    setLoadingBooks(true);
    setBooksError('');
    fetch(`${API_URL}/books`)
      .then(res => res.json())
      .then(data => {
        const shuffled = shuffleArray(data.data || []);
        setBooks(shuffled.slice(0, 50));
        setLoadingBooks(false);
        setBooksLoaded(true);
      })
      .catch(err => {
        setBooksError('Failed to fetch books');
        setLoadingBooks(false);
      });
  }, []);

  const [completedBooks, setCompletedBooks] = useState(() => {
    const saved = localStorage.getItem('completedBooks');
    return saved ? JSON.parse(saved) : {};
  });
  const [ratingState, setRatingState] = useState({});
  const [favouriteBooks, setFavouriteBooks] = useState(() => {
    const saved = localStorage.getItem('favouriteBooks');
    return saved ? JSON.parse(saved) : [];
  });
  const [showFavPopup, setShowFavPopup] = useState(false);
  const [favPopupMsg, setFavPopupMsg] = useState('');
  const [activeSection, setActiveSection] = useState('movies');
  const [books, setBooks] = useState([]);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [booksError, setBooksError] = useState('');

  // Fetch watch history from backend
  useEffect(() => {
    const email = localStorage.getItem('email');
    if (activeSection === 'history' && email) {
      fetch(`${API_URL}/history/${email}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.histories)) {
            // Each history has book_id populated
            setHistoryBooks(data.histories.map(h => h.book_id));
          } else {
            setHistoryBooks([]);
          }
        })
        .catch(() => setHistoryBooks([]));
    }
  }, [activeSection]);

  // Helper to get completed books (from backend history)
  const completedBooksList = historyBooks;

  // Persist completedBooks and favouriteBooks to localStorage
  useEffect(() => {
    localStorage.setItem('completedBooks', JSON.stringify(completedBooks));
  }, [completedBooks]);

  useEffect(() => {
    localStorage.setItem('favouriteBooks', JSON.stringify(favouriteBooks));
  }, [favouriteBooks]);

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
  const email = localStorage.getItem('email') || '';

  useEffect(() => {
    if (activeSection === 'books' && !booksLoaded) {
      fetchBooks();
    }
  }, [activeSection, booksLoaded, fetchBooks]);

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
            className={activeSection === 'books' ? 'active' : ''} 
            onClick={() => setActiveSection('books')}
          >
            Books
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
        </nav>
      </aside>

      <main className="main-content">
        {activeSection === 'books' ? (
          <div>
            <div className="content-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h1>Recommended Books</h1>
              <button
                style={{ padding: '8px 20px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                onClick={fetchBooks}
                disabled={loadingBooks}
              >Refresh</button>
            </div>
            {loadingBooks ? (
              <p>Loading books...</p>
            ) : booksError ? (
              <p style={{ color: 'red' }}>{booksError}</p>
            ) : (
              <div className="movies-grid">
                {books.length > 0 ? books.map(book => {
                  const isCompleted = completedBooks[book._id] || false;
                  const rating = ratingState[book._id] || null;
                  const showRateNow = isCompleted && rating === null;
                  const showStars = showRateNow && ratingState[`${book._id}_selecting`] === true;
                  return (
                    <div key={book._id} className="movie-card">
                      {book.coverImg ? (
                        <img 
                          src={book.coverImg}
                          alt={book.title}
                          style={{ width: '100%', height: '225px', objectFit: 'cover', borderRadius: '8px 8px 0 0' }}
                          onError={e => { e.target.style.display = 'none'; }}
                        />
                      ) : null}
                      <div className="movie-info">
                        <h3>{book.title}</h3>
                        <p>{book.author}</p>
                        <p>{Array.isArray(book.genre) ? book.genre.join(', ') : book.genre}</p>
                        <div className="rating">★ {book.rating !== undefined ? book.rating : (book.avgrating || 0)}</div>
                        <div className="liked">👍 {book.likedPercent !== undefined ? book.likedPercent : (book.likedPercentage !== undefined ? book.likedPercentage : (book.likedpercent !== undefined ? book.likedpercent : 0))}% liked</div>
                        <p className="desc">{
                          book.description
                            ? book.description.split(' ').slice(0, 13).join(' ') + (book.description.split(' ').length > 13 ? '...' : '')
                            : ''
                        }</p>
                        <div style={{ margin: '10px 0' }}>
                          <label style={{ cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={isCompleted}
                              disabled={isCompleted}
                              onChange={e => {
                                setCompletedBooks(prev => ({ ...prev, [book._id]: e.target.checked }));
                                // Reset rating if unchecked
                                if (!e.target.checked) setRatingState(prev => ({ ...prev, [book._id]: null, [`${book._id}_selecting`]: false }));
                                if (e.target.checked) {
                                  // Add to historyBooks if not already present
                                  setHistoryBooks(prev => {
                                    if (prev.find(b => b._id === book._id)) return prev;
                                    const updated = [...prev, book];
                                    localStorage.setItem('historyBooks', JSON.stringify(updated));
                                    return updated;
                                  });
                                  // Send to backend
                                  fetch('http://localhost:5000/api/history', {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({
                                      name: username,
                                      email: email,
                                      book: book
                                    })
                                  })
                                  .then(res => res.json())
                                  .then(data => {
                                    // Optionally handle response
                                  })
                                  .catch(err => {
                                    // Optionally handle error
                                  });
                                  setFavPopupMsg(`${book.title} added to history`);
                                  setShowFavPopup(true);
                                  setTimeout(() => setShowFavPopup(false), 2000);
                                }
                              }}
                              style={{ marginRight: '8px' }}
                            />
                            Completed
                          </label>
                        </div>
                        {showRateNow && !showStars && (
                          <button
                            className="watch-button"
                            style={{ background: '#007bff', marginTop: '10px' }}
                            onClick={() => setRatingState(prev => ({ ...prev, [`${book._id}_selecting`]: true }))}
                          >Rate Now</button>
                        )}
                        {showStars && (
                          <div style={{ margin: '10px 0' }}>
                            {[1,2,3,4,5].map(star => (
                              <span
                                key={star}
                                style={{
                                  fontSize: '1.5rem',
                                  color: ratingState[book._id] >= star ? '#ffc107' : '#ccc',
                                  cursor: 'pointer',
                                  marginRight: '4px'
                                }}
                                onClick={() => {
                                  setRatingState(prev => ({ ...prev, [book._id]: star, [`${book._id}_selecting`]: false }));
                                }}
                              >★</span>
                            ))}
                          </div>
                        )}
                        {isCompleted && rating !== null && !showStars && (
                          <div style={{ margin: '10px 0', fontWeight: 'bold', color: '#007bff' }}>
                            Your rating: {rating} star{rating > 1 ? 's' : ''}
                          </div>
                        )}
                        <button
                          className="watch-button"
                          style={{ background: '#10b981', marginTop: '10px' }}
                          disabled={favouriteBooks.find(b => b._id === book._id)}
                          onClick={() => {
                            setFavPopupMsg(`${book.title} added to cart`);
                            setShowFavPopup(true);
                            setFavouriteBooks(prev => {
                              // Avoid duplicates
                              if (prev.find(b => b._id === book._id)) return prev;
                              return [...prev, book];
                            });
                            setTimeout(() => setShowFavPopup(false), 2000);
                          }}
                        >{favouriteBooks.find(b => b._id === book._id) ? 'Added to Favourites' : 'Add to Favourites'}</button>
                      </div>
                    </div>
                  );
                }) : <p>No books found.</p>}
        {showFavPopup && (
          <div style={{
            position: 'fixed',
            top: '32px',
            right: '32px',
            background: '#10b981',
            color: '#fff',
            padding: '16px 32px',
            borderRadius: '12px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
            zIndex: 9999,
            fontWeight: 600,
            fontSize: '1rem',
            transition: 'opacity 0.3s'
          }}>
            {favPopupMsg}
          </div>
        )}
              </div>
            )}
          </div>
        ) : activeSection === 'history' ? (
          <div>
            <div className="content-header">
              <h1>Watch History</h1>
            </div>
            <div className="movies-grid">
              {completedBooksList.length > 0 ? completedBooksList.map(book => (
                <div key={book._id} className="movie-card">
                  {book.coverImg ? (
                    <img 
                      src={book.coverImg}
                      alt={book.title}
                      style={{ width: '100%', height: '225px', objectFit: 'cover', borderRadius: '8px 8px 0 0' }}
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                  ) : null}
                  <div className="movie-info">
                    <h3>{book.title}</h3>
                    <p>{book.author}</p>
                    <p>{Array.isArray(book.genre) ? book.genre.join(', ') : book.genre}</p>
                    <div className="rating">★ {book.rating !== undefined ? book.rating : (book.avgrating || 0)}</div>
                    <div className="liked">👍 {book.likedPercent !== undefined ? book.likedPercent : (book.likedPercentage !== undefined ? book.likedPercentage : (book.likedpercent !== undefined ? book.likedpercent : 0))}% liked</div>
                    <p className="desc">{
                      book.description
                        ? book.description.split(' ').slice(0, 13).join(' ') + (book.description.split(' ').length > 13 ? '...' : '')
                        : ''
                    }</p>
                    <button
                      style={{ background: '#ef4444', color: '#fff', marginTop: '10px', padding: '8px 16px', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => {
                        if (window.confirm(`Remove ${book.title} from history?`)) {
                          setCompletedBooks(prev => ({ ...prev, [book._id]: false }));
                          setHistoryBooks(prev => {
                            const updated = prev.filter(b => b._id !== book._id);
                            localStorage.setItem('historyBooks', JSON.stringify(updated));
                            return updated;
                          });
                          setFavPopupMsg(`${book.title} removed from history`);
                          setShowFavPopup(true);
                          setTimeout(() => setShowFavPopup(false), 2000);
                        }
                      }}
                    >Remove from History</button>
                  </div>
                </div>
              )) : <p>No books in history yet.</p>}
            </div>
          </div>
        ) : activeSection === 'favorites' ? (
          <div>
            <div className="content-header">
              <h1>Your Favourite Books</h1>
            </div>
            <div className="movies-grid">
              {favouriteBooks.length > 0 ? favouriteBooks.map(book => (
                <div key={book._id} className="movie-card">
                  {book.coverImg ? (
                    <img 
                      src={book.coverImg}
                      alt={book.title}
                      style={{ width: '100%', height: '225px', objectFit: 'cover', borderRadius: '8px 8px 0 0' }}
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                  ) : null}
                  <div className="movie-info">
                    <h3>{book.title}</h3>
                    <p>{book.author}</p>
                    <p>{Array.isArray(book.genre) ? book.genre.join(', ') : book.genre}</p>
                    <div className="rating">★ {book.rating !== undefined ? book.rating : (book.avgrating || 0)}</div>
                    <div className="liked">👍 {book.likedPercent !== undefined ? book.likedPercent : (book.likedPercentage !== undefined ? book.likedPercentage : (book.likedpercent !== undefined ? book.likedpercent : 0))}% liked</div>
                    <p className="desc">{
                      book.description
                        ? book.description.split(' ').slice(0, 13).join(' ') + (book.description.split(' ').length > 13 ? '...' : '')
                        : ''
                    }</p>
                    <button
                      style={{ background: '#ef4444', color: '#fff', marginTop: '10px', padding: '8px 16px', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => {
                        setFavouriteBooks(prev => prev.filter(b => b._id !== book._id));
                      }}
                    >Remove from Favourites</button>
                  </div>
                </div>
              )) : <p>No favourite books yet.</p>}
            </div>
          </div>
        ) : activeSection === 'preferences' ? (
          <div className="preferences-container">
            <h2>Your Selected Genres</h2>
            <div className="selected-genres-list">
              {selectedGenres && selectedGenres.length > 0 ? (
                selectedGenres.map((genre, idx) => (
                  <div key={idx} className="selected-genre-item">{genre}</div>
                ))
              ) : (
                <p>No genres selected.</p>
              )}
            </div>
          </div>
  ) : (
          <>
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
          </>
        )}
      </main>
    </div>
  );
}

export default Dashboard;