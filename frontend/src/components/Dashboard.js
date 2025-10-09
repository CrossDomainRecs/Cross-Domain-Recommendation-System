import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import userPreferencesService from '../services/userPreferencesService';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function Dashboard({ selectedGenres = [] }) {
  const [historyBooks, setHistoryBooks] = useState([]);
  const [booksLoaded, setBooksLoaded] = useState(false);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [genresLoaded, setGenresLoaded] = useState(false);
  const [currentGenres, setCurrentGenres] = useState(selectedGenres);

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
  const [completedBooks, setCompletedBooks] = useState({});
  const [ratingState, setRatingState] = useState({});
  const [favouriteBooks, setFavouriteBooks] = useState([]);
  // Movies favourites and completed states (mirroring Books section behavior)
  const [favouriteMovies, setFavouriteMovies] = useState([]);
  const [completedMovies, setCompletedMovies] = useState({});
  const [showFavPopup, setShowFavPopup] = useState(false);
  const [favPopupMsg, setFavPopupMsg] = useState('');
  const [activeSection, setActiveSection] = useState('movies');

  const [books, setBooks] = useState([]);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [booksError, setBooksError] = useState('');

  // Movies state and fetch
  const [movies, setMovies] = useState([]);
  const [loadingMovies, setLoadingMovies] = useState(false);
  const [moviesError, setMoviesError] = useState('');
  const [moviesLoaded, setMoviesLoaded] = useState(false);

  const fetchMovies = React.useCallback(() => {
    setLoadingMovies(true);
    setMoviesError('');
    fetch(`${API_URL}/movies`)
      .then(res => res.json())
      .then(data => {
        const shuffled = shuffleArray(data.data || []);
        setMovies(shuffled.slice(0, 50));
        setLoadingMovies(false);
      })
      .catch(() => {
        setMoviesError('Failed to fetch movies');
        setLoadingMovies(false);
      });
  }, []);

  useEffect(() => {
    if (activeSection === 'movies' && !moviesLoaded) {
      fetchMovies();
      setMoviesLoaded(true);
    }
  }, [activeSection, fetchMovies, moviesLoaded]);

  const username = localStorage.getItem('username') || 'User';
  const email = localStorage.getItem('email') || '';

  // Fetch user preferences from backend
  useEffect(() => {
    if (email && !preferencesLoaded) {
      userPreferencesService.getUserPreferences(email)
        .then(preferences => {
          console.log('Loaded preferences:', preferences);

          // Initialize state from backend data
          const completedBooksMap = {};
          preferences.completed_books?.forEach(cb => {
            const book = cb.book_id;
            if (book && book._id) {
              completedBooksMap[book._id] = {
                completed: true,
                rating: cb.rating,
                bookData: book // Store the full book object
              };
            }
          });
          setCompletedBooks(completedBooksMap);

          const favouriteBooksList = preferences.favourite_books?.map(fb => {
            const book = fb.book_id;
            return book && book._id ? {
              _id: book._id,
              title: book.title || 'Unknown Title',
              author: book.author || 'Unknown Author',
              coverImg: book.coverImg || '',
              genre: book.genre || '',
              rating: book.rating || 0,
              description: book.description || ''
            } : null;
          }).filter(Boolean) || [];
          setFavouriteBooks(favouriteBooksList);

          const completedMoviesMap = {};
          preferences.completed_movies?.forEach(cm => {
            const movie = cm.movie_id;
            if (movie && movie._id) {
              completedMoviesMap[movie._id] = {
                completed: true,
                rating: cm.rating,
                movieData: movie // Store the full movie object
              };
            }
          });
          setCompletedMovies(completedMoviesMap);

          const favouriteMoviesList = preferences.favourite_movies?.map(fm => {
            const movie = fm.movie_id;
            return movie && movie._id ? {
              _id: movie._id,
              title: movie.title || movie.Title || 'Unknown Title',
              Poster_Url: movie.Poster_Url || '',
              Vote_Average: movie.Vote_Average || 0,
              Overview: movie.Overview || '',
              description: movie.description || ''
            } : null;
          }).filter(Boolean) || [];
          setFavouriteMovies(favouriteMoviesList);

          setPreferencesLoaded(true);
        })
        .catch(error => {
          console.error('Error loading user preferences:', error);
          // Initialize empty state on error
          setCompletedBooks({});
          setFavouriteBooks([]);
          setCompletedMovies({});
          setFavouriteMovies([]);
          setPreferencesLoaded(true);
        });
    }
  }, [email, preferencesLoaded]);

  // Fetch genres from backend if not available in props
  useEffect(() => {
    if (email && currentGenres.length === 0 && !genresLoaded) {
      userPreferencesService.getUserGenres(email)
        .then(genres => {
          if (genres && genres.length > 0) {
            setCurrentGenres(genres);
          }
          setGenresLoaded(true);
        })
        .catch(error => {
          console.error('Error loading user genres:', error);
          setGenresLoaded(true);
        });
    } else if (currentGenres.length > 0) {
      setGenresLoaded(true);
    }
  }, [email, currentGenres.length, genresLoaded]);

  useEffect(() => {
    if (activeSection === 'books' && !booksLoaded) {
      fetchBooks();
    }
  }, [activeSection, booksLoaded, fetchBooks]);

  // Helper to get completed books (from backend history)
  const completedBooksList = historyBooks;

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
        {activeSection === 'movies' ? (
          <div>
            <div className="content-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h1>Recommended Movies</h1>
              <button
                style={{ padding: '8px 20px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                onClick={fetchMovies}
                disabled={loadingMovies}
              >Refresh</button>
            </div>
            {loadingMovies ? (
              <p>Loading movies...</p>
            ) : moviesError ? (
              <p style={{ color: 'red' }}>{moviesError}</p>
            ) : (
              <div className="movies-grid">
                {movies.length > 0 ? movies.map(movie => (
                  <div key={movie._id} className="movie-card">
                    {movie.Poster_Url ? (
                      <img
                        src={movie.Poster_Url}
                        alt={movie.title || movie.Title}
                        style={{ width: '100%', height: '225px', objectFit: 'cover', borderRadius: '8px 8px 0 0' }}
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                    ) : null}
                    <div className="movie-info">
                      <h3>{movie.title || movie.Title}</h3>
                      <div className="rating">★ {movie.Vote_Average !== undefined ? movie.Vote_Average : (movie.avg_rating || movie.avgrating || 0)}</div>
                      <p className="desc">{
                        movie.Overview
                          ? movie.Overview.split(' ').slice(0, 20).join(' ') + (movie.Overview.split(' ').length > 20 ? '...' : '')
                          : (movie.description ? movie.description.split(' ').slice(0, 20).join(' ') + (movie.description.split(' ').length > 20 ? '...' : '') : '')
                      }</p>
                      {(() => {
                        const id = movie._id;
                        const isCompleted = (completedMovies[id] && completedMovies[id].completed) || false;
                        const isFavourited = !!favouriteMovies.find(m => m._id === id);
                        const rating = ratingState[id] || null;
                        const showRateNow = isCompleted && rating === null;
                        const showStars = showRateNow && ratingState[`${id}_selecting`] === true;
                        return (
                          <>
                            <div style={{ margin: '10px 0' }}>
                              <label style={{ cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={isCompleted}
                                  disabled={isCompleted}
                                  onChange={async e => {
                                    const newCompletedState = e.target.checked;
                                    setCompletedMovies(prev => ({
                                      ...prev,
                                      [id]: newCompletedState ? {
                                        completed: true,
                                        rating: null,
                                        movieData: movie
                                      } : false
                                    }));

                                    if (newCompletedState) {
                                      try {
                                        // Save to backend
                                        await userPreferencesService.addCompletedMovie(email, id);
                                        // Best-effort: add to custom history (do not revert UI on failure)
                                        try {
                                          await userPreferencesService.addMovieToHistory(email, movie.title || movie.Title);
                                        } catch (err) {
                                          console.warn('Non-critical: failed to add movie to custom history', err);
                                        }

                                        setFavPopupMsg(`${movie.title || movie.Title} marked as completed`);
                                        setShowFavPopup(true);
                                        setTimeout(() => setShowFavPopup(false), 2000);
                                      } catch (error) {
                                        console.error('Error saving completed movie:', error);
                                        // Revert state if save failed
                                        setCompletedMovies(prev => ({ ...prev, [id]: false }));
                                      }
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
                                onClick={() => setRatingState(prev => ({ ...prev, [`${id}_selecting`]: true }))}
                              >Rate Now</button>
                            )}
                            {showStars && (
                              <div style={{ margin: '10px 0' }}>
                                {[1,2,3,4,5].map(star => (
                                  <span
                                    key={star}
                                    style={{
                                      fontSize: '1.5rem',
                                      color: ratingState[id] >= star ? '#ffc107' : '#ccc',
                                      cursor: 'pointer',
                                      marginRight: '4px'
                                    }}
                                    onClick={() => {
                                      setRatingState(prev => ({ ...prev, [id]: star, [`${id}_selecting`]: false }));
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
                              disabled={isFavourited}
                              onClick={async () => {
                                try {
                                  // Save to backend
                                  await userPreferencesService.addFavouriteMovie(email, id);

                                  setFavPopupMsg(`${movie.title || movie.Title} added to favourites`);
                                  setShowFavPopup(true);

                                  // Update local state - ensure consistent structure
                                  setFavouriteMovies(prev => {
                                    if (prev.find(m => m._id === id)) return prev;
                                    // Transform movie object to match stored structure
                                    const favouriteMovie = {
                                      _id: movie._id,
                                      title: movie.title || movie.Title || 'Unknown Title',
                                      Poster_Url: movie.Poster_Url || '',
                                      Vote_Average: movie.Vote_Average || 0,
                                      Overview: movie.Overview || '',
                                      description: movie.description || ''
                                    };
                                    return [...prev, favouriteMovie];
                                  });

                                  setTimeout(() => setShowFavPopup(false), 2000);
                                } catch (error) {
                                  console.error('Error saving favourite movie:', error);
                                  setFavPopupMsg('Failed to add to favourites');
                                  setShowFavPopup(true);
                                  setTimeout(() => setShowFavPopup(false), 2000);
                                }
                              }}
                            >{isFavourited ? 'Added to Favourites' : 'Add to Favourites'}</button>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )) : <p>No movies found.</p>}
              </div>
            )}
          </div>
        ) : activeSection === 'books' ? (
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
                  const isCompleted = (completedBooks[book._id] && completedBooks[book._id].completed) || false;
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
                              onChange={async e => {
                                const newCompletedState = e.target.checked;
                                setCompletedBooks(prev => ({
                                  ...prev,
                                  [book._id]: newCompletedState ? {
                                    completed: true,
                                    rating: null,
                                    bookData: book
                                  } : false
                                }));

                                // Reset rating if unchecked
                                if (!newCompletedState) {
                                  setRatingState(prev => ({ ...prev, [book._id]: null, [`${book._id}_selecting`]: false }));
                                }

                                if (newCompletedState) {
                                  try {
                                    // Save to backend
                                    await userPreferencesService.addCompletedBook(email, book._id);

                                    // Add to historyBooks if not already present (local UI only)
                                    setHistoryBooks(prev => {
                                      if (prev.find(b => b._id === book._id)) return prev;
                                      const updated = [...prev, book];
                                      return updated;
                                    });

                                    // Best-effort history writes (do not revert UI on failure)
                                    try {
                                      await userPreferencesService.addBookToHistory(email, book.title);
                                    } catch (err) {
                                      console.warn('Non-critical: failed to add book to custom history', err);
                                    }

                                    setFavPopupMsg(`${book.title} marked as completed`);
                                    setShowFavPopup(true);
                                    setTimeout(() => setShowFavPopup(false), 2000);
                                  } catch (error) {
                                    console.error('Error saving completed book:', error);
                                    // Revert state if save failed
                                    setCompletedBooks(prev => ({ ...prev, [book._id]: false }));
                                  }
                                } else {
                                  try {
                                    // Remove from backend
                                    await userPreferencesService.removeCompletedBook(email, book._id);

                                    // Remove from historyBooks (local UI only)
                                    setHistoryBooks(prev => prev.filter(b => b._id !== book._id));

                                    // Best-effort history removal (do not revert UI on failure)
                                    try {
                                      await userPreferencesService.removeBookFromHistory(email, book.title);
                                    } catch (err) {
                                      console.warn('Non-critical: failed to remove book from custom history', err);
                                    }

                                    setFavPopupMsg(`${book.title} removed from completed`);
                                    setShowFavPopup(true);
                                    setTimeout(() => setShowFavPopup(false), 2000);
                                  } catch (error) {
                                    console.error('Error removing completed book:', error);
                                    // Revert state if remove failed - should revert to completed state
                                    setCompletedBooks(prev => ({ ...prev, [book._id]: { completed: true, rating: null, bookData: book } }));
                                  }
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
                          onClick={async () => {
                            try {
                              // Save to backend
                              await userPreferencesService.addFavouriteBook(email, book._id);

                              setFavPopupMsg(`${book.title} added to favourites`);
                              setShowFavPopup(true);

                              // Update local state - ensure consistent structure
                              setFavouriteBooks(prev => {
                                // Avoid duplicates
                                if (prev.find(b => b._id === book._id)) return prev;
                                // Transform book object to match stored structure
                                const favouriteBook = {
                                  _id: book._id,
                                  title: book.title || 'Unknown Title',
                                  author: book.author || 'Unknown Author',
                                  coverImg: book.coverImg || '',
                                  genre: book.genre || '',
                                  rating: book.rating || 0,
                                  description: book.description || ''
                                };
                                return [...prev, favouriteBook];
                              });

                              setTimeout(() => setShowFavPopup(false), 2000);
                            } catch (error) {
                              console.error('Error saving favourite book:', error);
                              setFavPopupMsg('Failed to add to favourites');
                              setShowFavPopup(true);
                              setTimeout(() => setShowFavPopup(false), 2000);
                            }
                          }}
                        >
                          {favouriteBooks.find(b => b._id === book._id) ? 'Added to Favourites' : 'Add to Favourites'}
                        </button>
                      </div>
                    </div>
                  );
                }) : <p>No books found.</p>}
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
                      onClick={async () => {
                        if (window.confirm(`Remove ${book.title} from history?`)) {
                          try {
                            // Remove from backend
                            await userPreferencesService.removeCompletedBook(email, book._id);

                            // Remove from user history
                            await userPreferencesService.removeBookFromHistory(email, book.title);

                            setCompletedBooks(prev => ({ ...prev, [book._id]: false }));
                            setHistoryBooks(prev => {
                              const updated = prev.filter(b => b._id !== book._id);
                              return updated;
                            });
                            setFavPopupMsg(`${book.title} removed from history`);
                            setShowFavPopup(true);
                            setTimeout(() => setShowFavPopup(false), 2000);
                          } catch (error) {
                            console.error('Error removing book from history:', error);
                            setFavPopupMsg('Failed to remove from history');
                            setShowFavPopup(true);
                            setTimeout(() => setShowFavPopup(false), 2000);
                          }
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
              <h1>Your Favourites</h1>
            </div>

            {/* Favourite Books Section */}
            <div style={{ marginBottom: '40px' }}>
              <h2 style={{ color: '#333', marginBottom: '20px', fontSize: '1.5rem' }}>Books</h2>
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
                        onClick={async () => {
                          try {
                            // Remove from backend
                            await userPreferencesService.removeFavouriteBook(email, book._id);

                            // Update local state
                            setFavouriteBooks(prev => prev.filter(b => b._id !== book._id));

                            setFavPopupMsg(`${book.title} removed from favourites`);
                            setShowFavPopup(true);
                            setTimeout(() => setShowFavPopup(false), 2000);
                          } catch (error) {
                            console.error('Error removing favourite book:', error);
                            setFavPopupMsg('Failed to remove from favourites');
                            setShowFavPopup(true);
                            setTimeout(() => setShowFavPopup(false), 2000);
                          }
                        }}
                      >Remove from Favourites</button>
                    </div>
                  </div>
                )) : <p style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>No favourite books yet.</p>}
              </div>
            </div>

            {/* Favourite Movies Section */}
            <div>
              <h2 style={{ color: '#333', marginBottom: '20px', fontSize: '1.5rem' }}>Movies</h2>
              <div className="movies-grid">
                {favouriteMovies.length > 0 ? favouriteMovies.map(movie => (
                  <div key={movie._id} className="movie-card">
                    {movie.Poster_Url ? (
                      <img
                        src={movie.Poster_Url}
                        alt={movie.title}
                        style={{ width: '100%', height: '225px', objectFit: 'cover', borderRadius: '8px 8px 0 0' }}
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                    ) : null}
                    <div className="movie-info">
                      <h3>{movie.title}</h3>
                      <div className="rating">★ {movie.Vote_Average !== undefined ? movie.Vote_Average : (movie.avg_rating || movie.avgrating || 0)}</div>
                      <p className="desc">{
                        movie.Overview
                          ? movie.Overview.split(' ').slice(0, 20).join(' ') + (movie.Overview.split(' ').length > 20 ? '...' : '')
                          : (movie.description ? movie.description.split(' ').slice(0, 20).join(' ') + (movie.description.split(' ').length > 20 ? '...' : '') : '')
                      }</p>
                      <button
                        style={{ background: '#ef4444', color: '#fff', marginTop: '10px', padding: '8px 16px', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                        onClick={async () => {
                          try {
                            // Remove from backend
                            await userPreferencesService.removeFavouriteMovie(email, movie._id);

                            // Update local state
                            setFavouriteMovies(prev => prev.filter(m => m._id !== movie._id));

                            setFavPopupMsg(`${movie.title} removed from favourites`);
                            setShowFavPopup(true);
                            setTimeout(() => setShowFavPopup(false), 2000);
                          } catch (error) {
                            console.error('Error removing favourite movie:', error);
                            setFavPopupMsg('Failed to remove from favourites');
                            setShowFavPopup(true);
                            setTimeout(() => setShowFavPopup(false), 2000);
                          }
                        }}
                      >Remove from Favourites</button>
                    </div>
                  </div>
                )) : <p style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>No favourite movies yet.</p>}
              </div>
            </div>
          </div>
        ) : activeSection === 'preferences' ? (
          <div className="preferences-container">
            <h2>Your Selected Genres</h2>
            <div className="selected-genres-list">
              {currentGenres && currentGenres.length > 0 ? (
                currentGenres.map((genre, idx) => (
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
          </>
        )}
      </main>
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
  );
}

export default Dashboard;