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
    <div className="relative overflow-hidden bg-white border border-neutral-200 rounded-xl p-6">
      <div className="flex items-center justify-between relative z-10">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">👋</span>
            <p className="text-[14px] font-medium text-brand-green" suppressHydrationWarning>
              {getGreeting()}, {user?.full_name?.split(' ')[0] || 'there'}!
            </p>
          </div>
          <h1 className="text-[22px] font-medium text-neutral-900 mb-1.5 tracking-tight">
            Welcome back to your dashboard
          </h1>
          <p className="text-[14px] text-neutral-600 max-w-2xl leading-relaxed" suppressHydrationWarning>
            {getMotivationalMessage()}
          </p>
        </div>

        {/* Illustration with better styling */}
        <div className="hidden lg:block ml-6">
          <div className="bg-neutral-50 rounded-xl p-3 transform hover:scale-105 transition-all duration-200">
            <MentoringIllustration className="w-16 h-16" />
          </div>
        </div>
      </div>
    </div>
  );
};
