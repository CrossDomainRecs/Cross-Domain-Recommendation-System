import React, { useState, useEffect } from 'react';
import './AdminDashboard.css';
import authService from '../services/authService';

function AdminDashboard() {
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({
    username: '',
    email: '',
    role: ''
  });
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRecommendations: 0,
    activeUsers: 0,
    genreDistribution: {}
  });

  const [users, setUsers] = useState([]);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch user and recommendation statistics
        const analyticsResponse = await fetch('http://localhost:5000/api/recommendations/admin/analytics', {
          headers: authService.getAuthHeaders()
        });
        
        if (!analyticsResponse.ok) {
          if (analyticsResponse.status === 401 || analyticsResponse.status === 403) {
            throw new Error('UNAUTHORIZED');
          }
          throw new Error('Failed to fetch analytics');
        }
        
        const analyticsData = await analyticsResponse.json();
        
        if (!analyticsData.success) {
          throw new Error(analyticsData.error?.message || 'Failed to fetch analytics');
        }
        
        const stats = analyticsData.data.analytics;
        setStats(stats);
        
        // Fetch user list using auth service
        const usersList = await authService.getAllUsers();
        setUsers(usersList);
        console.log('AdminDashboard data loaded successfully');
        
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setError(error.message);
        
        if (error.message === 'UNAUTHORIZED') {
          // Handle unauthorized access
          localStorage.removeItem('token');
          localStorage.removeItem('isAdmin');
          window.location.href = '/admin/login';
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('isAdmin');
    window.location.href = '/admin/login';
  };

  return (
    <div className="admin-dashboard">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h2>Admin Panel</h2>
        </div>
        <nav className="admin-nav">
          <button 
            className={selectedTab === 'overview' ? 'active' : ''} 
            onClick={() => setSelectedTab('overview')}
          >
            Overview
          </button>
          <button 
            className={selectedTab === 'users' ? 'active' : ''} 
            onClick={() => setSelectedTab('users')}
          >
            User Management
          </button>
          <button 
            className={selectedTab === 'recommendations' ? 'active' : ''} 
            onClick={() => setSelectedTab('recommendations')}
          >
            Recommendations
          </button>
          <button 
            className={selectedTab === 'settings' ? 'active' : ''} 
            onClick={() => setSelectedTab('settings')}
          >
            Settings
          </button>
        </nav>
        <button className="admin-logout-button" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      <main className="admin-main">
        {isLoading ? (
          <div className="loading-spinner">Loading...</div>
        ) : (
          <div>
            {selectedTab === 'overview' && (
              <div className="overview-section">
                <h1>Dashboard Overview</h1>
                <div className="stats-grid">
                  <div className="stat-card">
                    <h3>Total Users</h3>
                    <p className="stat-number">{stats.totalUsers}</p>
                    <p className="stat-label">Registered Users</p>
                  </div>
                  <div className="stat-card">
                    <h3>Active Users</h3>
                    <p className="stat-number">{stats.activeUsers}</p>
                    <p className="stat-label">Last 30 Days</p>
                  </div>
                  <div className="stat-card">
                    <h3>Recommendations</h3>
                    <p className="stat-number">{stats.totalRecommendations}</p>
                    <p className="stat-label">Total Generated</p>
                  </div>
                </div>

                <div className="chart-section">
                  <div className="chart-card">
                    <h3>Genre Distribution</h3>
                    <div className="genre-bars">
                      {Object.entries(stats.genreDistribution || {}).map(([genre, value]) => (
                        <div key={genre} className="genre-bar-container">
                          <div className="genre-label">{genre}</div>
                          <div className="genre-bar-wrapper">
                            <div 
                              className="genre-bar" 
                              style={{ width: `${value}%` }}
                            ></div>
                            <span className="genre-value">{value}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedTab === 'users' && (
              <div className="users-section">
                <h1>User Management</h1>
                {error && (
                  <div className="error-message">
                    {error}
                  </div>
                )}
                {editingUser && (
                  <div className="edit-user-modal">
                    <div className="modal-content">
                      <h2>Edit User</h2>
                      <form onSubmit={async (e) => {
                        e.preventDefault();
                        try {
                          await authService.updateUser(editingUser.id, editFormData);
                          // Refresh user list
                          const updatedUsers = await authService.getAllUsers();
                          setUsers(updatedUsers);
                          setEditingUser(null);
                        } catch (error) {
                          setError(error.message);
                        }
                      }}>
                        <div className="form-group">
                          <label>Username</label>
                          <input
                            type="text"
                            value={editFormData.username}
                            onChange={(e) => setEditFormData({
                              ...editFormData,
                              username: e.target.value
                            })}
                          />
                        </div>
                        <div className="form-group">
                          <label>Email</label>
                          <input
                            type="email"
                            value={editFormData.email}
                            onChange={(e) => setEditFormData({
                              ...editFormData,
                              email: e.target.value
                            })}
                          />
                        </div>
                        <div className="form-group">
                          <label>Role</label>
                          <select
                            value={editFormData.role}
                            onChange={(e) => setEditFormData({
                              ...editFormData,
                              role: e.target.value
                            })}
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                        <div className="modal-buttons">
                          <button type="submit" className="save-button">Save</button>
                          <button 
                            type="button" 
                            className="cancel-button"
                            onClick={() => setEditingUser(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
                <div className="users-table-container">
                  {users.length === 0 ? (
                    <div className="no-data-message">
                      No users found
                    </div>
                  ) : (
                    <table className="users-table">
                      <thead>
                        <tr>
                          <th>Username</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Last Active</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(user => (
                          <tr key={user.id}>
                            <td>{user.username}</td>
                            <td>{user.email}</td>
                            <td>{user.role}</td>
                            <td>{new Date(user.lastActive).toLocaleDateString()}</td>
                            <td>
                              <span className={`status-badge ${user.status}`}>
                                {user.status}
                              </span>
                            </td>
                            <td>
                              <button 
                                className="action-button edit"
                                onClick={() => {
                                  setEditingUser(user);
                                  setEditFormData({
                                    username: user.username,
                                    email: user.email,
                                    role: user.role
                                  });
                                }}
                              >
                                Edit
                              </button>
                              <button 
                                className="action-button delete"
                                onClick={async () => {
                                  if (window.confirm('Are you sure you want to delete this user?')) {
                                    try {
                                      await authService.deleteUser(user.id);
                                      // Refresh user list
                                      const updatedUsers = await authService.getAllUsers();
                                      setUsers(updatedUsers);
                                    } catch (error) {
                                      setError(error.message);
                                    }
                                  }
                                }}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {selectedTab === 'recommendations' && (
              <div className="recommendations-section">
                <h1>Recommendation Analytics</h1>
                {/* Add recommendation analytics content here */}
              </div>
            )}

            {selectedTab === 'settings' && (
              <div className="settings-section">
                <h1>System Settings</h1>
                {/* Add settings content here */}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;