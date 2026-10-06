import React from 'react';
import { Search, ChevronDown, Menu } from 'lucide-react';
import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm text-gray-800 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          {/* Left side: Logo and Explore */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex-shrink-0 flex items-center group">
              <img
                src="/images/Logo.png"
                alt="StrideNex Logo"
                className="w-32 h-auto object-contain hover:scale-105 transition-transform duration-300"
              />
            </Link>
            
            <button className="hidden md:flex items-center gap-1.5 bg-indigo-50/50 text-indigo-700 px-5 py-2.5 rounded-full font-semibold hover:bg-indigo-100 transition-colors border border-indigo-100">
              Explore
              <ChevronDown className="w-4 h-4 opacity-70" />
            </button>
          </div>

          {/* Middle: Search Bar */}
          <div className="hidden md:flex flex-1 max-w-xl mx-8 relative group">
             <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
             </div>
             <input 
               type="text" 
               placeholder="What do you want to learn today?" 
               className="w-full pl-12 pr-6 py-3 bg-gray-50/50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm font-medium transition-all duration-300 shadow-sm focus:bg-white"
             />
          </div>

          {/* Right side: Links and Auth */}
          <div className="hidden lg:flex items-center space-x-4 text-sm font-semibold whitespace-nowrap flex-shrink-0">
            <Link href="/batches" className="text-gray-600 hover:text-indigo-600 transition-colors">Batches</Link>
            <Link href="/certificates" className="text-gray-600 hover:text-indigo-600 transition-colors">Certificates</Link>
            <Link href="/dashboard" className="text-gray-600 hover:text-indigo-600 transition-colors">My Dashboard</Link>
            <div className="h-6 w-px bg-gray-200 mx-2"></div>
            <Link href="/signup" className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-5 py-2 rounded-full font-semibold hover:shadow-lg hover:shadow-indigo-500/30 transform hover:-translate-y-0.5 transition-all duration-300">
              Join for Free
            </Link>
            <Link href="/login" className="text-red-500 hover:text-red-600 font-semibold transition-colors border border-red-200 px-5 py-2 rounded-full hover:bg-red-50">
              Log Out
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button className="p-2 text-gray-600 hover:text-indigo-600 bg-gray-50 rounded-full focus:outline-none">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
