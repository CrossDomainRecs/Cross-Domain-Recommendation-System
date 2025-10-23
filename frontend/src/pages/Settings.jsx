import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Home as HomeIcon, 
  Search, 
  User, 
  Settings as SettingsIcon,
  Lock,
  Bell,
  Eye,
  Trash2,
  Monitor,
  Save,
  LogOut
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import Dock from '../components/ui/Dock';
import Aurora from '../components/ui/Aurora';
import userService from '../services/user';

const Settings = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('account');
  
  const [accountSettings, setAccountSettings] = useState({
    username: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [preferences, setPreferences] = useState({
    domains: [],
    emailNotifications: true,
    pushNotifications: false,
    weeklyDigest: true
  });

  const [privacy, setPrivacy] = useState({
    profileVisibility: 'public',
    showActivity: true,
    dataSharing: false
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await userService.getProfile();
      setAccountSettings({
        username: data.username,
        email: data.email,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setPreferences({
        domains: data.preferences?.domains || [],
        emailNotifications: true,
        pushNotifications: false,
        weeklyDigest: true
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load settings');
    }
  };

  const handleSaveAccount = async () => {
    try {
      setLoading(true);
      
      const updates = {};
      if (accountSettings.username !== user.username) {
        updates.username = accountSettings.username;
      }
      
      if (accountSettings.newPassword) {
        if (accountSettings.newPassword !== accountSettings.confirmPassword) {
          toast.error('Passwords do not match');
          return;
        }
        updates.password = accountSettings.newPassword;
        updates.currentPassword = accountSettings.currentPassword;
      }

      await userService.updateProfile(updates);
      toast.success('Account settings saved!');
      setAccountSettings(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (error) {
      console.error('Failed to save account settings:', error);
      toast.error(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    try {
      setLoading(true);
      await userService.updateProfile({
        preferences: {
          ...user.preferences,
          domains: preferences.domains
        }
      });
      toast.success('Preferences saved!');
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      await userService.deleteAccount();
      toast.success('Account deleted successfully');
      logout();
      navigate('/');
    } catch (error) {
      console.error('Failed to delete account:', error);
      toast.error('Failed to delete account');
    } finally {
      setLoading(false);
    }
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
      onClick: () => navigate('/profile')
    },
    {
      icon: <SettingsIcon size={24} />,
      label: 'Settings',
      onClick: () => navigate('/settings'),
      className: 'dock-item-active'
    }
  ];

  const tabs = [
    { id: 'account', label: 'Account', icon: Lock },
    { id: 'preferences', label: 'Preferences', icon: Monitor },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Eye },
    { id: 'danger', label: 'Danger Zone', icon: Trash2 }
  ];

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
              <h1 className="text-3xl font-bold text-white mb-1">Settings</h1>
              <p className="text-white/70">Manage your account preferences and security</p>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-semibold transition-all"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                        activeTab === tab.id
                          ? 'bg-purple-600 text-white'
                          : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Icon size={20} />
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-3">
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
                {activeTab === 'account' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-4">Account Settings</h2>
                      <p className="text-white/60 text-sm">Update your account information</p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">
                          Username
                        </label>
                        <input
                          type="text"
                          value={accountSettings.username}
                          onChange={(e) => setAccountSettings({ ...accountSettings, username: e.target.value })}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          value={accountSettings.email}
                          onChange={(e) => setAccountSettings({ ...accountSettings, email: e.target.value })}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div className="pt-4 border-t border-white/10">
                        <h3 className="text-lg font-semibold text-white mb-4">Change Password</h3>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="block text-white/80 text-sm font-medium mb-2">
                              Current Password
                            </label>
                            <input
                              type="password"
                              value={accountSettings.currentPassword}
                              onChange={(e) => setAccountSettings({ ...accountSettings, currentPassword: e.target.value })}
                              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
                            />
                          </div>

                          <div>
                            <label className="block text-white/80 text-sm font-medium mb-2">
                              New Password
                            </label>
                            <input
                              type="password"
                              value={accountSettings.newPassword}
                              onChange={(e) => setAccountSettings({ ...accountSettings, newPassword: e.target.value })}
                              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
                            />
                          </div>

                          <div>
                            <label className="block text-white/80 text-sm font-medium mb-2">
                              Confirm New Password
                            </label>
                            <input
                              type="password"
                              value={accountSettings.confirmPassword}
                              onChange={(e) => setAccountSettings({ ...accountSettings, confirmPassword: e.target.value })}
                              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleSaveAccount}
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 rounded-lg text-white font-semibold transition-all"
                      >
                        <Save size={18} />
                        {loading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'preferences' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-4">Preferences</h2>
                      <p className="text-white/60 text-sm">Customize your experience</p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-white/80 text-sm font-medium mb-3">
                          Preferred Domains
                        </label>
                        <div className="space-y-2">
                          {['movies', 'books', 'music'].map((domain) => (
                            <label key={domain} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-all">
                              <input
                                type="checkbox"
                                checked={preferences.domains.includes(domain)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setPreferences({
                                      ...preferences,
                                      domains: [...preferences.domains, domain]
                                    });
                                  } else {
                                    setPreferences({
                                      ...preferences,
                                      domains: preferences.domains.filter(d => d !== domain)
                                    });
                                  }
                                }}
                                className="w-5 h-5 rounded border-white/20 bg-white/5 text-purple-600 focus:ring-2 focus:ring-purple-500"
                              />
                              <span className="text-white capitalize">{domain}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={handleSavePreferences}
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 rounded-lg text-white font-semibold transition-all"
                      >
                        <Save size={18} />
                        {loading ? 'Saving...' : 'Save Preferences'}
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'notifications' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-4">Notifications</h2>
                      <p className="text-white/60 text-sm">Manage how you receive updates</p>
                    </div>

                    <div className="space-y-4">
                      <label className="flex items-center justify-between p-4 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-all">
                        <div>
                          <div className="text-white font-medium">Email Notifications</div>
                          <div className="text-white/60 text-sm">Receive updates via email</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={preferences.emailNotifications}
                          onChange={(e) => setPreferences({ ...preferences, emailNotifications: e.target.checked })}
                          className="w-5 h-5 rounded border-white/20 bg-white/5 text-purple-600"
                        />
                      </label>

                      <label className="flex items-center justify-between p-4 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-all">
                        <div>
                          <div className="text-white font-medium">Push Notifications</div>
                          <div className="text-white/60 text-sm">Get browser notifications</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={preferences.pushNotifications}
                          onChange={(e) => setPreferences({ ...preferences, pushNotifications: e.target.checked })}
                          className="w-5 h-5 rounded border-white/20 bg-white/5 text-purple-600"
                        />
                      </label>

                      <label className="flex items-center justify-between p-4 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-all">
                        <div>
                          <div className="text-white font-medium">Weekly Digest</div>
                          <div className="text-white/60 text-sm">Summary of your activity</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={preferences.weeklyDigest}
                          onChange={(e) => setPreferences({ ...preferences, weeklyDigest: e.target.checked })}
                          className="w-5 h-5 rounded border-white/20 bg-white/5 text-purple-600"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {activeTab === 'privacy' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-4">Privacy & Security</h2>
                      <p className="text-white/60 text-sm">Control your privacy settings</p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-white/80 text-sm font-medium mb-3">
                          Profile Visibility
                        </label>
                        <select
                          value={privacy.profileVisibility}
                          onChange={(e) => setPrivacy({ ...privacy, profileVisibility: e.target.value })}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        >
                          <option value="public">Public</option>
                          <option value="private">Private</option>
                        </select>
                      </div>

                      <label className="flex items-center justify-between p-4 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-all">
                        <div>
                          <div className="text-white font-medium">Show Activity</div>
                          <div className="text-white/60 text-sm">Display your recent activity</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={privacy.showActivity}
                          onChange={(e) => setPrivacy({ ...privacy, showActivity: e.target.checked })}
                          className="w-5 h-5 rounded border-white/20 bg-white/5 text-purple-600"
                        />
                      </label>

                      <label className="flex items-center justify-between p-4 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-all">
                        <div>
                          <div className="text-white font-medium">Data Sharing</div>
                          <div className="text-white/60 text-sm">Share anonymized data for research</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={privacy.dataSharing}
                          onChange={(e) => setPrivacy({ ...privacy, dataSharing: e.target.checked })}
                          className="w-5 h-5 rounded border-white/20 bg-white/5 text-purple-600"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {activeTab === 'danger' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-red-500 mb-4">Danger Zone</h2>
                      <p className="text-white/60 text-sm">Irreversible actions</p>
                    </div>

                    <div className="border border-red-500/30 rounded-lg p-6 bg-red-500/5">
                      <h3 className="text-lg font-semibold text-white mb-2">Delete Account</h3>
                      <p className="text-white/60 text-sm mb-4">
                        Once you delete your account, there is no going back. Please be certain.
                      </p>
                      <button
                        onClick={handleDeleteAccount}
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 rounded-lg text-white font-semibold transition-all"
                      >
                        <Trash2 size={18} />
                        {loading ? 'Deleting...' : 'Delete Account'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <Dock items={dockItems} />
      </div>
    </div>
  );
};

export default Settings;