'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import { MentoringIllustration } from '@/lib/illustrations';

export const WelcomeHero = () => {
  const { user } = useAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getMotivationalMessage = () => {
    const messages = [
      "Let's make today count!",
      "Ready to inspire learners?",
      "What would you like to accomplish today?",
      "Let's help learners succeed!",
      "Time to make a difference!",
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-100/40 via-primary-50/30 to-accent-50/40 shadow-xl border border-primary-100/50">
      {/* Floating Orbs Background */}
      <div className="absolute inset-0 overflow-hidden opacity-10">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary-300 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-32 w-80 h-80 bg-accent-200 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute -bottom-16 right-1/3 w-64 h-64 bg-primary-200 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Animated Grid Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />

      {/* Top Wave Decoration */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary-300 to-transparent opacity-50" />

      <div className="relative z-10 grid lg:grid-cols-2 gap-6 p-6 lg:p-8">
        {/* Left Column - Main Content */}
        <div className="flex flex-col justify-center space-y-4">
          {/* Greeting Badge */}
          <div className="inline-flex items-center gap-2.5 w-fit">
            <div className="relative">
              <div className="absolute inset-0 bg-primary-300/30 rounded-full blur-lg animate-pulse" />
              <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center border border-primary-400/30 shadow-lg overflow-hidden p-2">
                <style jsx>{`
                  @keyframes rotateYSmooth {
                    0%, 100% {
                      transform: perspective(400px) rotateY(-25deg) scale(1);
                    }
                    50% {
                      transform: perspective(400px) rotateY(25deg) scale(1);
                    }
                  }
                  .rotate-3d {
                    animation: rotateYSmooth 4s ease-in-out infinite;
                    transform-style: preserve-3d;
                  }
                `}</style>
                <span className="rotate-3d text-[10px] font-black text-white tracking-tighter leading-none">JKKN</span>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold text-primary-700 uppercase tracking-wider" suppressHydrationWarning>
                {getGreeting()}
              </p>
              <p className="text-[15px] font-bold text-brand-green" suppressHydrationWarning>
                {user?.full_name?.split(' ')[0] || 'There'}!
              </p>
            </div>
          </div>

          {/* Main Heading */}
          <div className="space-y-2">
            <h1 className="text-[26px] lg:text-[32px] font-extrabold text-primary-800 leading-[1.1] tracking-tight">
              Welcome back to your
              <span className="block bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent mt-1">dashboard</span>
            </h1>
            <p className="text-[14px] text-primary-700/80 max-w-xl leading-relaxed font-medium" suppressHydrationWarning>
              {getMotivationalMessage()}
            </p>
          </div>

          {/* Quick Info Pills */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="group px-4 py-2 rounded-xl bg-white/90 backdrop-blur-md border border-primary-200/60 hover:bg-white hover:border-primary-300 hover:shadow-md transition-all duration-300 shadow-sm">
              <p className="text-[10px] text-primary-600 uppercase tracking-widest font-bold mb-0.5">Today</p>
              <p className="text-[13px] text-primary-800 font-bold flex items-center gap-1.5" suppressHydrationWarning>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </p>
            </div>

            <div className="group px-4 py-2 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 backdrop-blur-md border border-primary-400/40 hover:from-primary-600 hover:to-primary-700 hover:shadow-md transition-all duration-300 shadow-sm">
              <p className="text-[10px] text-primary-100 uppercase tracking-widest font-bold mb-0.5">Time</p>
              <p className="text-[13px] text-white font-bold flex items-center gap-1.5" suppressHydrationWarning>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column - Illustration/Graphic */}
        <div className="hidden lg:flex items-center justify-center">
          <div className="relative w-64 h-64">
            {/* Animated Background Rings */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-brand-yellow/30 to-white/20 blur-3xl animate-pulse" />
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-white/20 to-brand-yellow/20 blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />

            {/* Orbiting Dots */}
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '20s' }}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-brand-yellow rounded-full shadow-lg shadow-brand-yellow/50" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full shadow-lg" />
            </div>
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '15s', animationDirection: 'reverse' }}>
              <div className="absolute top-1/2 left-0 -translate-y-1/2 w-1.5 h-1.5 bg-brand-yellow/70 rounded-full" />
              <div className="absolute top-1/2 right-0 -translate-y-1/2 w-1.5 h-1.5 bg-white/70 rounded-full" />
            </div>

            {/* Main Circle Container */}
            <div className="absolute inset-8 rounded-full bg-gradient-to-br from-white/25 to-white/10 backdrop-blur-xl border-2 border-white/40 shadow-2xl flex items-center justify-center">
              {/* Shine Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent rounded-full pointer-events-none" />

              {/* Orbiting Icons - Clock Movement */}
              <style jsx>{`
                @keyframes rotateClockwise {
                  from {
                    transform: rotate(0deg);
                  }
                  to {
                    transform: rotate(360deg);
                  }
                }
                @keyframes keepUpright {
                  from {
                    transform: rotate(0deg);
                  }
                  to {
                    transform: rotate(-360deg);
                  }
                }
              `}</style>

              {/* Rotating Container - Like Clock Hands */}
              <div className="absolute inset-0" style={{ animation: 'rotateClockwise 30s linear infinite' }}>
                {[
                  { icon: '📚', color: 'from-blue-400/30 to-blue-500/20', label: 'Learn', angle: 0 },
                  { icon: '🎯', color: 'from-red-400/30 to-red-500/20', label: 'Goals', angle: 40 },
                  { icon: '📊', color: 'from-green-400/30 to-green-500/20', label: 'Track', angle: 80 },
                  { icon: '👥', color: 'from-purple-400/30 to-purple-500/20', label: 'Connect', angle: 120 },
                  { icon: '⭐', color: 'from-yellow-400/30 to-yellow-500/20', label: 'Excel', angle: 160 },
                  { icon: '🚀', color: 'from-indigo-400/30 to-indigo-500/20', label: 'Grow', angle: 200 },
                  { icon: '💡', color: 'from-amber-400/30 to-amber-500/20', label: 'Inspire', angle: 240 },
                  { icon: '🏆', color: 'from-orange-400/30 to-orange-500/20', label: 'Achieve', angle: 280 },
                  { icon: '🎓', color: 'from-cyan-400/30 to-cyan-500/20', label: 'Graduate', angle: 320 },
                ].map((item, i) => {
                  const radius = 45; // Distance from center
                  const angleRad = (item.angle * Math.PI) / 180;
                  const x = Math.cos(angleRad) * radius;
                  const y = Math.sin(angleRad) * radius;

                  return (
                    <div
                      key={i}
                      className="group absolute w-9 h-9 z-10"
                      style={{
                        left: `calc(50% + ${x}px)`,
                        top: `calc(50% + ${y}px)`,
                        transform: 'translate(-50%, -50%)',
                        animation: 'keepUpright 30s linear infinite'
                      }}
                    >
                      {/* Icon Background with Gradient */}
                      <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                      {/* Icon Container */}
                      <div className="relative w-full h-full rounded-xl bg-white/40 backdrop-blur-sm border border-white/60 flex items-center justify-center shadow-lg hover:shadow-xl hover:bg-white/50 hover:scale-125 transition-all duration-300 cursor-pointer">
                        <span className="text-sm group-hover:scale-110 transition-transform duration-300">{item.icon}</span>
                      </div>

                      {/* Tooltip on Hover */}
                      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-30">
                        <div className="bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap">
                          <span className="text-[9px] font-bold text-brand-green">{item.label}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Center Glow Effect */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                <div className="w-16 h-16 bg-gradient-to-br from-primary-300/20 to-transparent rounded-full blur-xl animate-pulse" />
              </div>
            </div>

            {/* Decorative Corner Elements */}
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-brand-yellow/40 rounded-full blur-md animate-pulse" style={{ animationDelay: '0.5s' }} />
            <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-white/40 rounded-full blur-md animate-pulse" style={{ animationDelay: '1.5s' }} />
          </div>
        </div>
      </div>

      {/* Bottom Accent Line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary-400 to-transparent opacity-40" />
    </div>
  );
};
