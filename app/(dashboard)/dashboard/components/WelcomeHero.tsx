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
      "Ready to inspire students?",
      "What would you like to accomplish today?",
      "Let's help students succeed!",
      "Time to make a difference!",
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-brand-green/5 to-brand-yellow/5 border border-brand-green/10 rounded-xl p-5 md:p-6">
      <div className="flex items-center justify-between relative z-10">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">👋</span>
            <p className="text-sm font-medium text-brand-green">
              {getGreeting()}, {user?.full_name?.split(' ')[0] || 'there'}!
            </p>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-1.5">
            Welcome back to your dashboard
          </h1>
          <p className="text-sm text-neutral-600 max-w-2xl">
            {getMotivationalMessage()}
          </p>
        </div>

        {/* Illustration with better styling */}
        <div className="hidden lg:block ml-6">
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 transform hover:scale-105 transition-all duration-200 shadow-sm">
            <MentoringIllustration className="w-16 h-16" />
          </div>
        </div>
      </div>

      {/* Decorative background element */}
      <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-brand-yellow/20 rounded-full blur-3xl" />
    </div>
  );
};
