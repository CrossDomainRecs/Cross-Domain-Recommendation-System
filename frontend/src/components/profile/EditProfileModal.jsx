import { useState, useRef } from 'react';
import { X, Upload, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import userService from '../../services/user';

const AVAILABLE_GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 
  'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller',
  'Animation', 'Documentary', 'Crime', 'Biography', 'History',
  'Music', 'War', 'Western', 'Family', 'Sport'
];

const EditProfileModal = ({ profileData, onClose, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    username: profileData?.username || '',
    profilePicture: profileData?.profilePicture || '',
    selectedGenres: profileData?.preferences?.user_selected_genres || profileData?.preferences?.favorite_genres || []
  });
  const [previewImage, setPreviewImage] = useState(
    profileData?.profilePicture?.startsWith('/uploads') 
      ? `http://localhost:5000${profileData.profilePicture}`
      : profileData?.profilePicture || ''
  );
  const fileInputRef = useRef(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    try {
      setUploading(true);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);

      const imageUrl = await userService.uploadProfilePicture(file);
      setFormData({ ...formData, profilePicture: imageUrl });
      toast.success('Image uploaded successfully!');
    } catch (error) {
      console.error('Failed to upload image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const toggleGenre = (genre) => {
    setFormData(prev => ({
      ...prev,
      selectedGenres: prev.selectedGenres.includes(genre)
        ? prev.selectedGenres.filter(g => g !== genre)
        : [...prev.selectedGenres, genre]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.username.trim()) {
      toast.error('Username is required');
      return;
    }

    if (formData.selectedGenres.length === 0) {
      toast.error('Please select at least one genre');
      return;
    }

    try {
      setLoading(true);
      await onSave({
        username: formData.username,
        profilePicture: formData.profilePicture,
        preferences: {
          user_selected_genres: formData.selectedGenres,
          favorite_genres: formData.selectedGenres
        }
      });
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const isAILearned = (genre) => {
    const drlLearned = profileData?.preferences?.drl_learned_genres || [];
    const userSelected = profileData?.preferences?.user_selected_genres || [];
    return drlLearned.includes(genre) && !userSelected.includes(genre);
  };

  const getInitials = () => {
    return profileData?.username?.charAt(0).toUpperCase() || 'U';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm border-b border-white/10 p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">Edit Profile</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-all"
          >
            <X size={24} className="text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-white/80 text-sm font-medium mb-3">
              Profile Picture
            </label>
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/20 bg-gradient-to-br from-purple-600 to-blue-600">
                  {previewImage ? (
                    <img
                      src={previewImage}
                      alt="Profile preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-white text-3xl font-bold">{getInitials()}</span>
                    </div>
                  )}
                </div>
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent" />
                  </div>
                )}
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 disabled:bg-white/5 border border-white/20 rounded-lg text-white font-medium transition-all"
                >
                  <Upload size={18} />
                  {uploading ? 'Uploading...' : 'Upload Photo'}
                </button>
                <p className="text-white/50 text-xs mt-2">
                  PNG, JPG up to 5MB
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Username
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-all"
              placeholder="Enter your username"
            />
          </div>

          <div>
            <label className="block text-white/80 text-sm font-medium mb-3">
              Favorite Genres
            </label>
            <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto p-1">
              {AVAILABLE_GENRES.map((genre) => {
                const isSelected = formData.selectedGenres.includes(genre);
                const aiLearned = isAILearned(genre);
                
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggleGenre(genre)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      isSelected
                        ? aiLearned
                          ? 'bg-gradient-to-r from-purple-500/30 to-blue-500/30 text-blue-300 border-2 border-blue-400'
                          : 'bg-purple-600 text-white border-2 border-purple-600'
                        : 'bg-white/5 text-white/70 border-2 border-white/20 hover:bg-white/10 hover:border-white/40'
                    }`}
                  >
                    {aiLearned && isSelected && '🤖 '}
                    {genre}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 space-y-1">
              <p className="text-white/50 text-xs">
                Selected: {formData.selectedGenres.length} genres
              </p>
              {formData.selectedGenres.some(g => isAILearned(g)) && (
                <p className="text-blue-300 text-xs">
                  🤖 Some genres were discovered by AI based on your preferences
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/20 rounded-lg text-white font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploading}
              className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 rounded-lg text-white font-semibold transition-all"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;