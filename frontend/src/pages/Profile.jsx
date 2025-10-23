import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home as HomeIcon, Search, User, Settings as SettingsIcon, Edit, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import Dock from '../components/ui/Dock';
import Aurora from '../components/ui/Aurora';
import ProfileCard from '../components/ui/ProfileCard';
import EditProfileModal from '../components/profile/EditProfileModal';
import userService from '../services/user';

const Profile = () => {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [stats, setStats] = useState({
    totalRecommendations: 0,
    favoritesCount: 0,
    genresExplored: 0
  });

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const data = await userService.getProfile();
      setProfileData(data);
      
      setStats({
        totalRecommendations: data.preferences?.liked_items?.length || 0,
        favoritesCount: data.preferences?.liked_items?.filter(item => item.isFavorite)?.length || 0,
        genresExplored: new Set([
          ...(data.preferences?.favorite_genres || []),
          ...(data.preferences?.drl_learned_genres || [])
        ]).size
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async (updatedData) => {
    try {
      const result = await userService.updateProfile(updatedData);
      setProfileData(result);
      updateUser(result);
      toast.success('Profile updated successfully!');
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const getAvatarUrl = () => {
    if (profileData?.profilePicture) {
      // If it's a relative path, prepend backend URL
      if (profileData.profilePicture.startsWith('/uploads')) {
        return `http://localhost:5000${profileData.profilePicture}`;
      }
      return profileData.profilePicture;
    }
    
    const username = user?.username || 'user';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=8b5cf6&color=fff&size=256&bold=true&format=svg`;
  };

  const dockItems = [
    {
      icon: <HomeIcon size={24} />,
      label: 'Home',
      onClick: () => navigate('/home')
    },
    {
      icon: <Search size={24} />,
      label: 'Explore',
      onClick: () => navigate('/explore')
    },
    {
      icon: <User size={24} />,
      label: 'Profile',
      onClick: () => navigate('/profile'),
      className: 'dock-item-active'
    },
    {
      icon: <SettingsIcon size={24} />,
      label: 'Settings',
      onClick: () => navigate('/settings')
    }
  ];

  const getUserGenres = () => {
    if (!profileData) return [];
    
    const userSelected = profileData.preferences?.user_selected_genres || [];
    const drlLearned = profileData.preferences?.drl_learned_genres || [];
    const allGenres = profileData.preferences?.favorite_genres || [];
    
    return allGenres.map(genre => ({
      name: genre,
      isAILearned: drlLearned.includes(genre) && !userSelected.includes(genre)
    }));
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black pb-32">
      <Toaster position="top-right" />
      
      <Aurora 
        colorStops={['#5227FF', '#7cff67', '#5227FF']}
        amplitude={1.5}
        blend={0.6}
        speed={1.2}
      />

      <div className="relative z-10">
        <div className="p-6 bg-black/30 backdrop-blur-sm border-b border-white/10">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">Your Profile</h1>
              <p className="text-white/70">Manage your account and preferences</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleEditProfile}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-semibold transition-all"
              >
                <Edit size={18} />
                Edit Profile
              </button>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-semibold transition-all"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
                <div className="text-white text-xl">Loading profile...</div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 flex justify-center items-start">
                <ProfileCard
                  avatarUrl={getAvatarUrl()}
                  miniAvatarUrl={getAvatarUrl()}
                  name={profileData?.username || 'User'}
                  title={profileData?.subscription?.type === 'premium' ? '⭐ Premium Member' : '🌟 Free Member'}
                  handle={profileData?.username || 'user'}
                  status={profileData?.status || 'Active'}
                  contactText="Edit Profile"
                  onContactClick={handleEditProfile}
                  showUserInfo={true}
                  enableTilt={true}
                  className="w-full max-w-sm"
                />
              </div>

              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
                    <div className="text-white/60 text-sm mb-2">Total Interactions</div>
                    <div className="text-3xl font-bold text-white">{stats.totalRecommendations}</div>
                  </div>
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
                    <div className="text-white/60 text-sm mb-2">Favorites</div>
                    <div className="text-3xl font-bold text-white">{stats.favoritesCount}</div>
                  </div>
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
                    <div className="text-white/60 text-sm mb-2">Genres Explored</div>
                    <div className="text-3xl font-bold text-white">{stats.genresExplored}</div>
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4">Favorite Genres</h3>
                  <div className="flex flex-wrap gap-2">
                    {getUserGenres().map((genre, index) => (
                      <span
                        key={index}
                        className={`px-4 py-2 rounded-full text-sm font-medium ${
                          genre.isAILearned
                            ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-blue-300 border border-blue-400/30'
                            : 'bg-white/10 text-white border border-white/20'
                        }`}
                      >
                        {genre.isAILearned && '🤖 '}
                        {genre.name}
                      </span>
                    ))}
                    {getUserGenres().length === 0 && (
                      <p className="text-white/50 text-sm">No genres selected yet. Complete onboarding to add genres!</p>
                    )}
                  </div>
                  <p className="text-white/50 text-xs mt-3">
                    🤖 AI-learned genres are discovered based on your interactions
                  </p>
                </div>

                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4">Account Information</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-white/60">Email</span>
                      <span className="text-white">{profileData?.email}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/60">Member Since</span>
                      <span className="text-white">
                        {new Date(profileData?.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/60">Subscription</span>
                      <span className="text-white capitalize">
                        {profileData?.subscription?.type || 'Free'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/60">Preferred Domains</span>
                      <span className="text-white">
                        {profileData?.preferences?.domains?.join(', ') || 'All'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <Dock items={dockItems} />
      </div>

      {isEditModalOpen && (
        <EditProfileModal
          profileData={profileData}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleSaveProfile}
        />
      )}
    </div>
  );
};

export default Profile;