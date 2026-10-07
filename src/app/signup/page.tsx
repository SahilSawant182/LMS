"use client";

import Link from "next/link";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { signup } from "@/services/auth.services";
import { GraduationCap, Users, Settings, Eye, EyeOff } from "lucide-react";

const ROLES = [
  {
    id: "student",
    label: "Student",
    description: "Start your career journey",
    icon: <GraduationCap className="w-5 h-5" />
  },
  {
    id: "instructor",
    label: "Instructor",
    description: "Guide and inspire others",
    icon: <Users className="w-5 h-5" />
  }
];

export default function SignupPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const validatePassword = (pass: string) => {
      if (pass.length < 8) return "Password must be at least 8 characters long";
      if (!/[A-Z]/.test(pass)) return "Password must contain at least one uppercase letter";
      if (!/[a-z]/.test(pass)) return "Password must contain at least one lowercase letter";
      if (!/[0-9]/.test(pass)) return "Password must contain at least one number";
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(pass)) return "Password must contain at least one special character";
      return "";
    };

    const passError = validatePassword(password);
    if (passError) {
      setPasswordError(passError);
      setLoading(false);
      return;
    } else {
      setPasswordError("");
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
      setLoading(false);
      return;
    } else {
      setConfirmPasswordError("");
    }

    try {
      const payload = {
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        role: [
          { student: role === "student" ? 1 : 0 },
          { instructor: role === "instructor" ? 1 : 0 }
        ],
        allow_promotional_news: 1
      };
      await signup(payload);
      router.push("/login");
    } catch (err: any) {
      setError(err.message || "Failed to signup");
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

          <form className="mt-8 space-y-5" onSubmit={handleSignup}>
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
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
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
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
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
                Password <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`appearance-none block w-full px-4 py-3 border ${passwordError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-indigo-500 focus:border-indigo-500'} rounded-xl shadow-sm placeholder-slate-400 focus:outline-none sm:text-sm bg-white text-slate-900 transition-all duration-200 pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {passwordError && (
                <div className="text-red-500 text-xs mt-1">{passwordError}</div>
              )}
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="block text-sm font-medium text-slate-700"
              >
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative">
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`appearance-none block w-full px-4 py-3 border ${confirmPasswordError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-indigo-500 focus:border-indigo-500'} rounded-xl shadow-sm placeholder-slate-400 focus:outline-none sm:text-sm bg-white text-slate-900 transition-all duration-200 pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {confirmPasswordError && (
                <div className="text-red-500 text-xs mt-1">{confirmPasswordError}</div>
              )}
            </div>

            <div className="pt-2">
              <div className="text-center mb-4">
                <label className="block text-sm font-semibold text-slate-900">
                  Select your role to join as <span className="text-red-500">*</span>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {ROLES.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setRole(r.id)}
                    className={`relative flex flex-col items-center p-3 border rounded-xl cursor-pointer transition-all duration-200 ${
                      role === r.id
                        ? "border-orange-500 bg-orange-50/50 shadow-sm"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-full mb-2 transition-colors ${
                        role === r.id
                          ? "bg-orange-100 text-orange-600"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {r.icon}
                    </div>
                    <div className="font-bold text-slate-900 text-xs mb-0.5">{r.label}</div>
                    <div className="text-[10px] text-slate-500 text-center leading-tight">
                      {r.description}
                    </div>
                  </div>
                ))}
              </div>
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

            {error && (
              <div className="text-red-500 text-sm mt-2">{error}</div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Creating Account..." : "Create Account"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
