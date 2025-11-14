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
    <div className="bg-white border border-neutral-200 rounded-lg p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-neutral-500 mb-1">
            {getGreeting()}, {user?.full_name?.split(' ')[0] || 'there'}! 👋
          </p>
          <h1 className="text-2xl md:text-3xl font-semibold text-neutral-900 mb-1">
            Welcome back to your dashboard
          </h1>
          <p className="text-sm text-neutral-600 max-w-2xl">
            {getMotivationalMessage()}
          </p>
        </div>

        {/* Simplified Illustration */}
        <div className="hidden lg:block ml-6">
          <div className="transform hover:scale-105 transition-transform duration-200">
            <MentoringIllustration className="w-20 h-20 opacity-80" />
          </div>
        </div>
      </div>
    </div>
  );
};
