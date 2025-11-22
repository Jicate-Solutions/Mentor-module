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
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-green via-emerald-600 to-brand-green shadow-xl">
      {/* Floating Orbs Background */}
      <div className="absolute inset-0 overflow-hidden opacity-20">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-yellow rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-32 w-80 h-80 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute -bottom-16 right-1/3 w-64 h-64 bg-brand-yellow/50 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Animated Grid Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />

      {/* Top Wave Decoration */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-brand-yellow to-transparent" />

      <div className="relative z-10 grid lg:grid-cols-2 gap-6 p-6 lg:p-8">
        {/* Left Column - Main Content */}
        <div className="flex flex-col justify-center space-y-4">
          {/* Greeting Badge */}
          <div className="inline-flex items-center gap-2.5 w-fit">
            <div className="relative">
              <div className="absolute inset-0 bg-brand-yellow rounded-full blur-md animate-pulse" />
              <div className="relative w-11 h-11 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-xl overflow-hidden p-2">
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
                <span className="rotate-3d text-[10px] font-black text-brand-yellow tracking-tighter leading-none">JKKN</span>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold text-brand-yellow uppercase tracking-wider" suppressHydrationWarning>
                {getGreeting()}
              </p>
              <p className="text-[15px] font-bold text-white" suppressHydrationWarning>
                {user?.full_name?.split(' ')[0] || 'There'}!
              </p>
            </div>
          </div>

          {/* Main Heading */}
          <div className="space-y-2">
            <h1 className="text-[26px] lg:text-[32px] font-extrabold text-white leading-[1.1] tracking-tight">
              Welcome back to your
              <span className="block text-brand-yellow mt-1">dashboard</span>
            </h1>
            <p className="text-[14px] text-white/90 max-w-xl leading-relaxed font-medium" suppressHydrationWarning>
              {getMotivationalMessage()}
            </p>
          </div>

          {/* Quick Info Pills */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="group px-4 py-2 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 hover:bg-white/25 hover:border-white/40 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105">
              <p className="text-[10px] text-white/80 uppercase tracking-widest font-bold mb-0.5">Today</p>
              <p className="text-[13px] text-white font-bold flex items-center gap-1.5" suppressHydrationWarning>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </p>
            </div>

            <div className="group px-4 py-2 rounded-xl bg-brand-yellow/20 backdrop-blur-md border border-brand-yellow/30 hover:bg-brand-yellow/30 hover:border-brand-yellow/50 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105">
              <p className="text-[10px] text-white/90 uppercase tracking-widest font-bold mb-0.5">Time</p>
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
            <div className="absolute inset-8 rounded-full bg-gradient-to-br from-white/25 to-white/10 backdrop-blur-xl border-2 border-white/40 shadow-2xl flex items-center justify-center overflow-hidden">
              {/* Shine Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent" />

              {/* Icon Grid */}
              <div className="relative grid grid-cols-3 gap-3 p-6">
                {[
                  { icon: '📚', color: 'from-blue-400/30 to-blue-500/20', label: 'Learn' },
                  { icon: '🎯', color: 'from-red-400/30 to-red-500/20', label: 'Goals' },
                  { icon: '📊', color: 'from-green-400/30 to-green-500/20', label: 'Track' },
                  { icon: '👥', color: 'from-purple-400/30 to-purple-500/20', label: 'Connect' },
                  { icon: '⭐', color: 'from-yellow-400/30 to-yellow-500/20', label: 'Excel' },
                  { icon: '🚀', color: 'from-indigo-400/30 to-indigo-500/20', label: 'Grow' },
                  { icon: '💡', color: 'from-amber-400/30 to-amber-500/20', label: 'Inspire' },
                  { icon: '🏆', color: 'from-orange-400/30 to-orange-500/20', label: 'Achieve' },
                  { icon: '🎓', color: 'from-cyan-400/30 to-cyan-500/20', label: 'Graduate' },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="group relative w-10 h-10"
                  >
                    {/* Icon Background with Gradient */}
                    <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                    {/* Icon Container */}
                    <div className="relative w-full h-full rounded-xl bg-white/20 backdrop-blur-sm border border-white/40 flex items-center justify-center p-2 shadow-lg hover:shadow-xl hover:bg-white/30 hover:scale-110 hover:-rotate-6 transition-all duration-300 cursor-pointer">
                      <span className="text-base group-hover:scale-110 transition-transform duration-300">{item.icon}</span>
                    </div>

                    {/* Tooltip on Hover */}
                    <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20">
                      <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg shadow-lg">
                        <span className="text-[9px] font-bold text-brand-green whitespace-nowrap">{item.label}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Center Glow Effect */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-16 h-16 bg-gradient-to-br from-brand-yellow/20 to-transparent rounded-full blur-xl animate-pulse" />
              </div>
            </div>

            {/* Decorative Corner Elements */}
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-brand-yellow/40 rounded-full blur-md animate-pulse" style={{ animationDelay: '0.5s' }} />
            <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-white/40 rounded-full blur-md animate-pulse" style={{ animationDelay: '1.5s' }} />
          </div>
        </div>
      </div>

      {/* Bottom Accent Line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-yellow via-white to-brand-yellow opacity-50" />
    </div>
  );
};
