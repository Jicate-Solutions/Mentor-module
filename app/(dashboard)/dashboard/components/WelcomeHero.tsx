'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import { MentoringIllustration, StudentsIllustration, SessionsIllustration } from '@/lib/illustrations';

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
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 p-8 md:p-12 shadow-lg">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/3 translate-y-1/3" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex-1">
          <p className="text-white/90 text-lg md:text-xl mb-2 font-medium">
            {getGreeting()}, {user?.full_name?.split(' ')[0] || 'there'}! 👋
          </p>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-3">
            What do you want to{' '}
            <span className="text-accent-400">accomplish</span> today?
          </h1>
          <p className="text-white/80 text-base md:text-lg max-w-2xl">
            {getMotivationalMessage()} Track your mentoring sessions, connect with students, and make a lasting impact.
          </p>
        </div>

        {/* Illustrations */}
        <div className="hidden lg:flex items-center gap-4 ml-8">
          <div className="transform hover:scale-110 transition-transform duration-300">
            <MentoringIllustration className="w-32 h-32" />
          </div>
          <div className="transform hover:scale-110 transition-transform duration-300 translate-y-4">
            <StudentsIllustration className="w-28 h-28" />
          </div>
          <div className="transform hover:scale-110 transition-transform duration-300">
            <SessionsIllustration className="w-32 h-32" />
          </div>
        </div>
      </div>
    </div>
  );
};
