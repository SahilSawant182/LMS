"use client";

import Link from "next/link";
import React from "react";

export default function SignupPage() {
  return (
    <div className="min-h-screen flex w-full bg-white">
      {/* Left side - Image & Overlay */}
      <div className="hidden lg:flex w-1/2 relative bg-indigo-900 items-center justify-center">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=3271&auto=format&fit=crop')",
          }}
        ></div>
        {/* Overlay */}
        <div className="absolute inset-0 bg-indigo-900/70 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-indigo-950 via-indigo-900/40 to-transparent"></div>
        
        {/* Content */}
        <div className="relative z-10 px-12 text-white max-w-xl text-left animate-fade-in-up">
          <h1 className="text-5xl font-bold mb-6 leading-tight">
            Start Learning Today.
          </h1>
          <p className="text-lg text-indigo-100 mb-8 mr-auto">
            Unlock your potential with expert-led courses. Whether you're looking to advance your career or learn a new hobby, we have something for you.
          </p>
          <div className="inline-block p-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-left">
             <div className="flex items-center space-x-1 mb-2 text-yellow-400">
               {[...Array(5)].map((_, i) => (
                 <svg key={i} className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                   <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                 </svg>
               ))}
             </div>
             <p className="italic text-indigo-50 text-sm">"The best decision I made for my career. The platform is intuitive and the content is top-notch!"</p>
             <p className="font-semibold text-white mt-3 text-sm">- Sarah Jenkins, Data Scientist</p>
          </div>
        </div>
      </div>

      {/* Right side - Signup Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-white">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-extrabold text-slate-900">
              Create an account
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
              >
                Sign in instead
              </Link>
            </p>
          </div>

          <form className="mt-8 space-y-5" onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="first-name"
                  className="block text-sm font-medium text-slate-700"
                >
                  First name
                </label>
                <div className="mt-1">
                  <input
                    id="first-name"
                    name="first-name"
                    type="text"
                    required
                    placeholder="John"
                    className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white text-slate-900 transition-all duration-200"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="last-name"
                  className="block text-sm font-medium text-slate-700"
                >
                  Last name
                </label>
                <div className="mt-1">
                  <input
                    id="last-name"
                    name="last-name"
                    type="text"
                    required
                    placeholder="Doe"
                    className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white text-slate-900 transition-all duration-200"
                  />
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700"
              >
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="student@example.com"
                  className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white text-slate-900 transition-all duration-200"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder="••••••••"
                  className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white text-slate-900 transition-all duration-200"
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">Must be at least 8 characters.</p>
            </div>

            <div className="flex items-center">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
              />
              <label
                htmlFor="terms"
                className="ml-2 block text-sm text-slate-700 cursor-pointer"
              >
                I agree to the{" "}
                <a href="#" className="text-indigo-600 hover:text-indigo-500">Terms of Service</a>{" "}
                and{" "}
                <a href="#" className="text-indigo-600 hover:text-indigo-500">Privacy Policy</a>
              </label>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 transform hover:-translate-y-0.5"
              >
                Create Account
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
