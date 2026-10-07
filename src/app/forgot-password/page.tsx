"use client";

import Link from "next/link";
import React, { useState } from "react";
import { forgotPassword } from "@/services/auth.services";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");
    
    try {
      const res = await forgotPassword({ user: email });
      setSuccessMessage("If that email address is in our database, we will send you an email to reset your password.");
      setEmail("");
    } catch (err: any) {
      console.error("Forgot password API error:", err);
      setError(err.message || "Failed to process request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-white">
      {/* Left side - Image & Overlay */}
      <div className="hidden lg:flex w-1/2 relative bg-indigo-900 items-center justify-center">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1513258496099-48168024aec0?q=80&w=3149&auto=format&fit=crop')",
          }}
        ></div>
        {/* Overlay */}
        <div className="absolute inset-0 bg-indigo-900/60 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-indigo-950 via-indigo-900/40 to-transparent"></div>
        
        {/* Content */}
        <div className="relative z-10 px-12 text-white max-w-xl animate-fade-in-up">
          <h1 className="text-5xl font-bold mb-6 leading-tight">
            Forgot Your Password?
          </h1>
          <p className="text-lg text-indigo-100 mb-8">
            No worries! Enter your email and we will send you instructions to reset your password and get you back to learning.
          </p>
        </div>
      </div>

      {/* Right side - Forgot Password Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-white">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-extrabold text-slate-900">
              Reset Password
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Remember your password?{" "}
              <Link
                href="/login"
                className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
              >
                Back to sign in
              </Link>
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleForgotPassword}>
            <div className="space-y-4">
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@example.com"
                    className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white text-slate-900 transition-all duration-200"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm mt-2">{error}</div>
            )}
            
            {successMessage && (
              <div className="text-emerald-600 bg-emerald-50 p-4 rounded-xl text-sm mt-2 border border-emerald-200">
                {successMessage}
              </div>
            )}
            
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
