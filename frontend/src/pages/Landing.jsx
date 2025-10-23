import { useNavigate } from 'react-router-dom';
import Aurora from '../components/ui/Aurora';
import BlurText from '../components/ui/BlurText';
import ShinyText from '../components/ui/ShinyText';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      {/* Aurora Background */}
      <Aurora 
        colorStops={['#5227FF', '#7cff67', '#5227FF']}
        amplitude={1.5}
        blend={0.6}
        speed={1.2}
      />
      
      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-6 flex justify-between items-center">
          <div className="text-3xl font-bold text-white">
            🎬 RecLab
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-2 text-white hover:text-gray-200 transition-colors"
            >
              <ShinyText text="Login" speed={3} />
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="px-6 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all"
            >
              <ShinyText text="Sign Up" speed={3} />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-8">
          <div className="max-w-4xl text-center">
            {/* Hero Text */}
            <BlurText
              text="Find What Moves You"
              delay={100}
              className="text-6xl md:text-8xl font-bold text-white mb-8"
              animateBy="words"
            />
            
            {/* Subtitle */}
            <BlurText
              text="Smart discovery that learns your taste instantly. From hidden treasures to perfect matches, we connect you with what matters."
              delay={50}
              className="text-xl md:text-2xl text-white/80 mb-12 leading-relaxed"
              animateBy="words"
            />

            {/* CTA Button */}
            <button
              onClick={() => navigate('/signup')}
              className="group relative px-12 py-4 bg-white/10 backdrop-blur-md border-2 border-white/30 rounded-full text-white text-xl font-semibold hover:bg-white/20 hover:border-white/50 transition-all duration-300 transform hover:scale-105"
            >
              <ShinyText text="Let's Get Started" speed={2} className="text-xl font-bold" />
            </button>

            {/* Feature Pills */}
            <div className="flex gap-4 justify-center mt-12">
              {['🎬 Movies', '📚 Books', '🎵 Music'].map((feature, i) => (
                <div
                  key={i}
                  className="px-6 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full text-white/70 text-sm"
                >
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="p-6 text-center text-white/50 text-sm">
          Powered by AI • Personalized for You
        </footer>
      </div>
    </div>
  );
};

export default Landing;
