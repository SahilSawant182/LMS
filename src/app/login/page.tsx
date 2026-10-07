"use client";

import Link from "next/link";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { X, Check } from "lucide-react";
import { login, forgotPassword } from "@/services/auth.services";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState("");
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (localStorage.getItem("apiKey")) {
        router.push("/dashboard");
      }
    }
  }, [router]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [resendCooldown]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Login form submitted, starting API call...", { email });
    setLoading(true);
    setError("");
    try {
      const res = await login({ usr: email, pwd: password });
      console.log("Login API success:", res);
      
      if (res?.key_details) {
        localStorage.setItem("apiKey", res.key_details.api_key);
        localStorage.setItem("apiSecret", res.key_details.api_secret);
        localStorage.setItem("fullName", res.full_name || "");
        localStorage.setItem("userEmail", res.user || "");
        localStorage.setItem("roles", JSON.stringify(res.roles || []));
        
        // Notify Navbar of auth state change
        window.dispatchEvent(new Event("auth-changed"));
      }
      
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Login API error:", err);
      setError(err.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail || !/^\S+@\S+\.\S+$/.test(forgotPasswordEmail)) {
      setForgotPasswordError("Please enter a valid email address.");
      return;
    }

    setForgotPasswordLoading(true);
    setForgotPasswordError("");
    setForgotPasswordSuccess(false);

    try {
      await forgotPassword({ user: forgotPasswordEmail });
      
      setForgotPasswordSuccess(true);
      setResendCooldown(60);
    } catch (err: any) {
      setForgotPasswordError(err?.message || "An error occurred.");
    } finally {
      setForgotPasswordLoading(false);
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
            Welcome Back to Your Learning Journey.
          </h1>
          <p className="text-lg text-indigo-100 mb-8">
            Access thousands of courses, connect with expert instructors, and
            take your skills to the next level with our world-class LMS platform.
          </p>
          <div className="flex items-center space-x-4">
            <div className="flex -space-x-3">
              <img className="w-10 h-10 rounded-full border-2 border-indigo-900" src="https://i.pravatar.cc/100?img=1" alt="Student" />
              <img className="w-10 h-10 rounded-full border-2 border-indigo-900" src="https://i.pravatar.cc/100?img=2" alt="Student" />
              <img className="w-10 h-10 rounded-full border-2 border-indigo-900" src="https://i.pravatar.cc/100?img=3" alt="Student" />
              <div className="w-10 h-10 rounded-full border-2 border-indigo-900 bg-indigo-600 flex items-center justify-center text-xs font-bold">
                +2k
              </div>
            </div>
            <p className="text-sm font-medium text-indigo-200">Join our community</p>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-white">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-extrabold text-slate-900">
              Sign in to your account
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Or{" "}
              <Link
                href="/signup"
                className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
              >
                create a new account
              </Link>
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
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

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-700"
                >
                  Password
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="appearance-none block w-full pl-4 pr-10 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white text-slate-900 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-indigo-500 focus:outline-none"
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 block text-sm text-slate-700 cursor-pointer"
                >
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <button
                  type="button"
                  onClick={() => {
                    if (email) {
                      setForgotPasswordEmail(email);
                    }
                    setShowForgotPasswordModal(true);
                  }}
                  className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
                >
                  Forgot your password?
                </button>
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm mt-2">{error}</div>
            )}
            
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </div>
            
            <div className="mt-6 relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">
                  Or continue with
                </span>
              </div>
            </div>
            
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button type="button" className="w-full flex justify-center items-center py-2.5 px-4 border border-slate-300 rounded-xl shadow-sm bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
                </svg>
                Google
              </button>
              <button type="button" className="w-full flex justify-center items-center py-2.5 px-4 border border-slate-300 rounded-xl shadow-sm bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                <svg className="h-5 w-5 mr-2 text-[#0A66C2]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
                LinkedIn
              </button>
            </div>
          </form>
        </div>
      </div>

      {typeof document !== "undefined" &&
        createPortal(
          showForgotPasswordModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                onClick={() => !forgotPasswordLoading && setShowForgotPasswordModal(false)}
              />
              <div className="bg-white w-full max-w-md rounded-2xl shadow-xl relative z-[101] overflow-hidden flex flex-col transition-all">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900">Reset Password</h3>
                  <button
                    onClick={() => setShowForgotPasswordModal(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    disabled={forgotPasswordLoading}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-5">
                  {forgotPasswordSuccess ? (
                    <div className="text-center space-y-4">
                      <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                        <Check className="w-6 h-6" />
                      </div>
                      <h4 className="text-lg font-semibold text-slate-900">Email Sent!</h4>
                      <p className="text-slate-600 text-sm">
                        We've sent a password reset link to <span className="font-semibold">{forgotPasswordEmail}</span>. Please check your inbox.
                      </p>
                      {forgotPasswordError && (
                        <p className="text-red-500 text-sm mt-2">{forgotPasswordError}</p>
                      )}
                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          className="flex-1 py-2 px-4 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                          onClick={() => setShowForgotPasswordModal(false)}
                        >
                          Close
                        </button>
                        <button
                          type="button"
                          className="flex-1 py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                          disabled={resendCooldown > 0 || forgotPasswordLoading}
                          onClick={handleForgotPassword}
                        >
                          {forgotPasswordLoading
                            ? "Sending..."
                            : resendCooldown > 0
                            ? `Resend in ${resendCooldown}s`
                            : "Resend Email"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-slate-600 text-sm">
                        Enter your email address and we'll send you a link to reset your password.
                      </p>
                      <div className="space-y-1">
                        <label htmlFor="reset-email" className="block text-sm font-medium text-slate-700">Email Address</label>
                        <input
                          id="reset-email"
                          type="email"
                          className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="you@example.com"
                          value={forgotPasswordEmail}
                          onChange={(e) => setForgotPasswordEmail(e.target.value)}
                        />
                      </div>
                      {forgotPasswordError && (
                        <p className="text-red-500 text-sm">{forgotPasswordError}</p>
                      )}
                      <button
                        type="button"
                        className="w-full mt-2 py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                        disabled={forgotPasswordLoading}
                        onClick={handleForgotPassword}
                      >
                        {forgotPasswordLoading ? "Sending..." : "Send Reset Link"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ),
          document.body
        )}
    </div>
  );
}
