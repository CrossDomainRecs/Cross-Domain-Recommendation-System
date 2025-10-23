  // Stage 1: Loading Animation - FIXED VERSION
  if (stage === 'loading') {
    return (
      <div className="relative min-h-screen overflow-hidden bg-black">
        <Aurora 
          colorStops={['#5227FF', '#7cff67', '#5227FF']}
          amplitude={1.5}
          blend={0.6}
          speed={1.2}
        />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-white mb-4">
              Explore{' '}
              <span className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                <RotatingText 
                  texts={['Movies', 'Books', 'Music']}
                  rotationInterval={800}
                  splitBy="words"
                />
              </span>
            </h1>
          </div>
        </div>
      </div>
    );
  }
