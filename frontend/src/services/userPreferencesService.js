const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const userPreferencesService = {
  // Get user preferences from backend
  getUserPreferences: async (email) => {
    try {
      const response = await fetch(`${API_URL}/user-preferences/${email}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user preferences');
      }

      const data = await response.json();
      return data.preferences;
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      throw error;
    }
  },

  // Get user's favourite genres from backend
  getUserGenres: async (email) => {
    try {
      const response = await fetch(`${API_URL}/favourites/${email}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user genres');
      }

      const data = await response.json();
      return data.favourite ? data.favourite.genres : [];
    } catch (error) {
      console.error('Error fetching user genres:', error);
      throw error;
    }
  },

  // Add completed book
  addCompletedBook: async (email, bookId, rating = null) => {
    try {
      const response = await fetch(`${API_URL}/user-preferences/${email}/completed-books`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ book_id: bookId, rating })
      });

      if (!response.ok) {
        throw new Error('Failed to save completed book');
      }

      const data = await response.json();
      return data.preferences;
    } catch (error) {
      console.error('Error saving completed book:', error);
      throw error;
    }
  },

  // Add completed movie
  addCompletedMovie: async (email, movieId, rating = null) => {
    try {
      const response = await fetch(`${API_URL}/user-preferences/${email}/completed-movies`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ movie_id: movieId, rating })
      });

      if (!response.ok) {
        throw new Error('Failed to save completed movie');
      }

      const data = await response.json();
      return data.preferences;
    } catch (error) {
      console.error('Error saving completed movie:', error);
      throw error;
    }
  },

  // Add favourite book
  addFavouriteBook: async (email, bookId) => {
    try {
      const response = await fetch(`${API_URL}/user-preferences/${email}/favourite-books`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ book_id: bookId })
      });

      if (!response.ok) {
        throw new Error('Failed to save favourite book');
      }

      const data = await response.json();
      return data.preferences;
    } catch (error) {
      console.error('Error saving favourite book:', error);
      throw error;
    }
  },

  // Add favourite movie
  addFavouriteMovie: async (email, movieId) => {
    try {
      const response = await fetch(`${API_URL}/user-preferences/${email}/favourite-movies`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ movie_id: movieId })
      });

      if (!response.ok) {
        throw new Error('Failed to save favourite movie');
      }

      const data = await response.json();
      return data.preferences;
    } catch (error) {
      console.error('Error saving favourite movie:', error);
      throw error;
    }
  },

  // Remove completed book
  removeCompletedBook: async (email, bookId) => {
    try {
      const response = await fetch(`${API_URL}/user-preferences/${email}/completed-books/${bookId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to remove completed book');
      }

      const data = await response.json();
      return data.preferences;
    } catch (error) {
      console.error('Error removing completed book:', error);
      throw error;
    }
  },

  // Remove completed movie
  removeCompletedMovie: async (email, movieId) => {
    try {
      const response = await fetch(`${API_URL}/user-preferences/${email}/completed-movies/${movieId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to remove completed movie');
      }

      const data = await response.json();
      return data.preferences;
    } catch (error) {
      console.error('Error removing completed movie:', error);
      throw error;
    }
  },

  // Remove favourite book
  removeFavouriteBook: async (email, bookId) => {
    try {
      const response = await fetch(`${API_URL}/user-preferences/${email}/favourite-books/${bookId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to remove favourite book');
      }

      const data = await response.json();
      return data.preferences;
    } catch (error) {
      console.error('Error removing favourite book:', error);
      throw error;
    }
  },

  // Remove favourite movie
  removeFavouriteMovie: async (email, movieId) => {
    try {
      const response = await fetch(`${API_URL}/user-preferences/${email}/favourite-movies/${movieId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to remove favourite movie');
      }

      const data = await response.json();
      return data.preferences;
    } catch (error) {
      console.error('Error removing favourite movie:', error);
      throw error;
    }
  },

  // Add completed book to user history
  addBookToHistory: async (email, bookName, rating = null) => {
    try {
      const response = await fetch(`${API_URL}/user-history/${email}/books`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: bookName, rating })
      });

      if (!response.ok) {
        throw new Error('Failed to add book to history');
      }

      const data = await response.json();
      return data.history;
    } catch (error) {
      console.error('Error adding book to history:', error);
      throw error;
    }
  },

  // Add completed movie to user history
  addMovieToHistory: async (email, movieName, rating = null) => {
    try {
      const response = await fetch(`${API_URL}/user-history/${email}/movies`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: movieName, rating })
      });

      if (!response.ok) {
        throw new Error('Failed to add movie to history');
      }

      const data = await response.json();
      return data.history;
    } catch (error) {
      console.error('Error adding movie to history:', error);
      throw error;
    }
  },

  // Remove book from user history
  removeBookFromHistory: async (email, bookName) => {
    try {
      const response = await fetch(`${API_URL}/user-history/${email}/books/${encodeURIComponent(bookName)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to remove book from history');
      }

      const data = await response.json();
      return data.history;
    } catch (error) {
      console.error('Error removing book from history:', error);
      throw error;
    }
  },

  // Remove movie from user history
  removeMovieFromHistory: async (email, movieName) => {
    try {
      const response = await fetch(`${API_URL}/user-history/${email}/movies/${encodeURIComponent(movieName)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to remove movie from history');
      }

      const data = await response.json();
      return data.history;
    } catch (error) {
      console.error('Error removing movie from history:', error);
      throw error;
    }
  }
};

export default userPreferencesService;
