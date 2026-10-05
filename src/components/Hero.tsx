import React from 'react';
import Link from 'next/link';

export default function Hero() {
  return (
    <div className="relative overflow-hidden bg-slate-900 text-white">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-indigo-600/20 blur-3xl animate-float"></div>
        <div className="absolute top-40 -left-20 w-80 h-80 rounded-full bg-violet-600/15 blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 relative z-10 animate-fade-in-up">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* Text Content */}
          <div className="max-w-2xl">
            <div className="inline-block px-4 py-1.5 mb-5 rounded-full bg-indigo-900/50 border border-indigo-700/50 backdrop-blur-md text-indigo-300 text-sm font-semibold tracking-wide">
              ✨ The Future of Learning
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-5 leading-[1.1] bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-indigo-300">
              Accelerate your future with Stridenex
            </h1>
            <p className="text-lg md:text-xl text-indigo-100/80 mb-8 leading-relaxed font-light">
              Start, switch, or advance your career with more than 5,800 courses, Professional Certificates, and degrees from world-class universities.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="#" className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold py-3.5 px-8 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg shadow-indigo-900/50 transform hover:-translate-y-1">
                Join for Free
              </Link>
              <Link href="#" className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/20 font-bold py-3.5 px-8 rounded-full flex items-center justify-center transition-all duration-300">
                Try Stridenex for Business
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-4 text-sm text-indigo-200/80 font-medium">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <img key={i} className="w-8 h-8 rounded-full border-2 border-slate-900" src={`https://i.pravatar.cc/100?img=${i+10}`} alt="User" />
                ))}
              </div>
              <p>Join over <strong className="text-white">10,000+</strong> learners today</p>
            </div>
          </div>

          {/* Hero Image / Graphic */}
          <div className="hidden lg:block relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-violet-500 transform translate-x-6 translate-y-6 rounded-3xl -z-10 blur-xl opacity-40"></div>
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-violet-500 transform translate-x-4 translate-y-4 rounded-3xl -z-10"></div>
            <img 
              src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" 
              alt="Professionals collaborating" 
              className="rounded-3xl shadow-2xl object-cover w-full h-[400px] border-4 border-slate-800 animate-float" style={{ animationDelay: '1s' }}
            />
            {/* Floating Badge */}
            <div className="absolute -left-10 top-12 bg-white/10 backdrop-blur-xl p-3.5 rounded-2xl shadow-2xl border border-white/20 flex items-center gap-3 animate-float">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 text-lg">🎓</div>
              <div>
                <p className="text-xs text-indigo-200 font-medium">Top Rated</p>
                <p className="font-bold text-white text-sm">World-class</p>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
