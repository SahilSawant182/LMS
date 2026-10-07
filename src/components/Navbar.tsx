"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Menu, LogOut, User, Bell } from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { logout } from '@/services/auth.services';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const checkAuth = () => {
    if (typeof window !== "undefined") {
      const apiKey = localStorage.getItem("apiKey");
      if (apiKey) {
        setUserName(localStorage.getItem("fullName") || "Learner");
        setUserEmail(localStorage.getItem("userEmail") || "");
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    }
  };

  useEffect(() => {
    checkAuth();
    window.addEventListener("auth-changed", checkAuth);
    return () => window.removeEventListener("auth-changed", checkAuth);
  }, []);

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to log out?")) {
      try {
        await logout();
      } catch (err) {
        console.error("Logout API failed:", err);
      }
      localStorage.clear();
      setIsAuthenticated(false);
      window.dispatchEvent(new Event("auth-changed"));
      router.push("/login");
    }
  };

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
            {isAuthenticated ? (
              <div className="flex items-center space-x-6 relative">
                <button className="text-gray-500 hover:text-indigo-600 transition-colors">
                  <Bell className="w-5 h-5" />
                </button>
                <div className="relative" ref={dropdownRef}>
                  <button 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center space-x-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full py-1.5 px-1.5 pr-4 transition-all duration-200"
                  >
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm border border-indigo-200">
                      {(userName || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold text-gray-700">{userName || 'User'}</span>
                  </button>

                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50 animate-fade-in-up origin-top-right">
                      {userEmail && (
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-xs text-gray-500">Signed in as</p>
                          <p className="text-sm font-semibold text-gray-900 truncate">{userEmail}</p>
                        </div>
                      )}
                      
                      <div className="py-1 border-b border-gray-100">
                        <Link href="/profile" className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-3 text-gray-400" />
                            Profile
                          </div>
                          <ChevronDown className="w-4 h-4 text-gray-400 -rotate-90" />
                        </Link>
                        <Link href="/plans" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                          Plans
                        </Link>
                      </div>

                      <div className="py-1">
                        <button 
                          onClick={() => {
                            setIsDropdownOpen(false);
                            handleLogout();
                          }}
                          className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4 mr-3" />
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link href="/login" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
                  Log in
                </Link>
                <Link href="/signup" className="text-sm font-semibold bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                  Sign up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center lg:hidden">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-gray-600 hover:text-indigo-600 bg-gray-50 rounded-full focus:outline-none"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white absolute w-full shadow-lg">
          <div className="px-4 py-3">
             <div className="relative">
               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="w-5 h-5 text-gray-400" />
               </div>
               <input 
                 type="text" 
                 placeholder="What do you want to learn today?" 
                 className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
               />
             </div>
          </div>
          <div className="px-4 py-2 space-y-1">
            <Link href="/batches" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50">Batches</Link>
            <Link href="/certificates" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50">Certificates</Link>
            <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50">My Dashboard</Link>
          </div>
          <div className="pt-4 pb-3 border-t border-gray-100">
            {isAuthenticated ? (
              <>
                <div className="flex items-center px-4">
                  <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-lg border border-indigo-200">
                        {(userName || 'U').charAt(0).toUpperCase()}
                      </div>
                  </div>
                  <div className="ml-3">
                    <div className="text-base font-medium text-gray-800">{userName || 'User'}</div>
                    {userEmail && <div className="text-sm font-medium text-gray-500">{userEmail}</div>}
                  </div>
                </div>
                <div className="mt-3 px-2 space-y-1">
                  <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50">Profile</Link>
                  <Link href="/plans" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50">Plans</Link>
                  <button 
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50"
                  >
                    Sign out
                  </button>
                </div>
              </>
            ) : (
              <div className="mt-3 px-4 space-y-2">
                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="block w-full text-center px-4 py-2 border border-indigo-600 text-indigo-600 rounded-lg font-medium hover:bg-indigo-50">Log in</Link>
                <Link href="/signup" onClick={() => setIsMobileMenuOpen(false)} className="block w-full text-center px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">Sign up</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
