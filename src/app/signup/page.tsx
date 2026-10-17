"use client";

import Link from "next/link";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signup, sendEmailOtp, sendMobileOtp, validateEmailOtp, validateMobileOtp } from "@/services/auth.services";
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

  const [mobileNo, setMobileNo] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [mobileOtp, setMobileOtp] = useState("");
  
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [mobileOtpSent, setMobileOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [mobileVerified, setMobileVerified] = useState(false);
  
  const [sendingEmailOtp, setSendingEmailOtp] = useState(false);
  const [sendingMobileOtp, setSendingMobileOtp] = useState(false);
  const [verifyingEmailOtp, setVerifyingEmailOtp] = useState(false);
  const [verifyingMobileOtp, setVerifyingMobileOtp] = useState(false);

  const [emailResendTimer, setEmailResendTimer] = useState(0);
  const [mobileResendTimer, setMobileResendTimer] = useState(0);
  
  const [emailMsg, setEmailMsg] = useState({ text: "", type: "" });
  const [mobileMsg, setMobileMsg] = useState({ text: "", type: "" });

  useEffect(() => {
    if (typeof window !== "undefined") {
      document.body.classList.remove("has-sidebar");
      document.documentElement.style.removeProperty("--sidebar-width");
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (emailResendTimer > 0) {
      interval = setInterval(() => setEmailResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [emailResendTimer]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (mobileResendTimer > 0) {
      interval = setInterval(() => setMobileResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [mobileResendTimer]);

  const handleSendEmailOtp = async () => {
    if (!email) {
      setEmailMsg({ text: "Please enter email first", type: "error" });
      return;
    }
    setSendingEmailOtp(true);
    setEmailMsg({ text: "", type: "" });
    try {
      await sendEmailOtp({ email });
      setEmailOtpSent(true);
      setEmailResendTimer(60);
      setEmailMsg({ text: "OTP sent successfully", type: "success" });
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || "Failed to send email OTP";
      setEmailMsg({ text: errorMsg, type: "error" });
    } finally {
      setSendingEmailOtp(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!emailOtp) {
      setEmailMsg({ text: "Please enter email OTP", type: "error" });
      return;
    }
    setVerifyingEmailOtp(true);
    setEmailMsg({ text: "", type: "" });
    try {
      await validateEmailOtp({ email, otp: emailOtp });
      setEmailVerified(true);
      setEmailMsg({ text: "OTP verified successfully", type: "success" });
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || "Invalid email OTP";
      setEmailMsg({ text: errorMsg, type: "error" });
    } finally {
      setVerifyingEmailOtp(false);
    }
  };

  const handleSendMobileOtp = async () => {
    if (!mobileNo) {
      setMobileMsg({ text: "Please enter mobile number first", type: "error" });
      return;
    }
    setSendingMobileOtp(true);
    setMobileMsg({ text: "", type: "" });
    try {
      await sendMobileOtp({ mobile_no: mobileNo });
      setMobileOtpSent(true);
      setMobileResendTimer(60);
      setMobileMsg({ text: "OTP sent successfully", type: "success" });
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || "Failed to send mobile OTP";
      setMobileMsg({ text: errorMsg, type: "error" });
    } finally {
      setSendingMobileOtp(false);
    }
  };

  const handleVerifyMobileOtp = async () => {
    if (!mobileOtp) {
      setMobileMsg({ text: "Please enter mobile OTP", type: "error" });
      return;
    }
    setVerifyingMobileOtp(true);
    setMobileMsg({ text: "", type: "" });
    try {
      await validateMobileOtp({ mobile_no: mobileNo, otp: mobileOtp });
      setMobileVerified(true);
      setMobileMsg({ text: "OTP verified successfully", type: "success" });
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || "Invalid mobile OTP";
      setMobileMsg({ text: errorMsg, type: "error" });
    } finally {
      setVerifyingMobileOtp(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!emailVerified) {
      setError("Please verify your email address before signing up.");
      setLoading(false);
      return;
    }

    if (!mobileVerified) {
      setError("Please verify your mobile number before signing up.");
      setLoading(false);
      return;
    }

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
        mobile_no: mobileNo,
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
      const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || "Failed to signup";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="signup-page" className="min-h-screen lg:h-screen lg:overflow-hidden flex w-full bg-white no-sidebar-page">
      {/* Left side - Image & Overlay */}
      <div className="hidden lg:flex w-1/2 h-full relative bg-indigo-900 items-center justify-center p-8 lg:p-12">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('/images/auth-signup-bg.jpg')",
          }}
        ></div>
        {/* Overlay */}
        <div className="absolute inset-0 bg-indigo-900/70 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-indigo-950 via-indigo-900/40 to-transparent"></div>
        
        {/* Content */}
        <div className="relative z-10 text-white max-w-lg text-left animate-fade-in-up">
          <h1 className="text-4xl lg:text-5xl font-extrabold mb-4 leading-tight tracking-tight">
            Start Learning Today.
          </h1>
          <p className="text-base lg:text-lg text-indigo-100 mb-6 leading-relaxed">
            Unlock your potential with expert-led courses. Whether you're looking to advance your career or learn a new hobby, we have something for you.
          </p>
          <div className="inline-block p-4 sm:p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-left">
             <div className="flex items-center space-x-1 mb-2 text-yellow-400">
               {[...Array(5)].map((_, i) => (
                 <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                   <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                 </svg>
               ))}
             </div>
             <p className="italic text-indigo-50 text-xs sm:text-sm">"The best decision I made for my career. The platform is intuitive and the content is top-notch!"</p>
             <p className="font-semibold text-white mt-2 text-xs sm:text-sm">- Sarah Jenkins, Data Scientist</p>
          </div>
        </div>
      </div>

      {/* Right side - Signup Form */}
      <div className="w-full lg:w-1/2 h-full flex items-center justify-center px-6 py-6 sm:px-10 lg:px-12 lg:py-6 bg-white overflow-y-auto">
        <div className="w-full max-w-md my-auto space-y-3.5">
          <div className="text-center lg:text-left">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Create an account
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
              >
                Sign in instead
              </Link>
            </p>
          </div>

          <form className="space-y-2.5 sm:space-y-3" onSubmit={handleSignup}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="first-name"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  First name
                </label>
                <div>
                  <input
                    id="first-name"
                    name="first-name"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    className="appearance-none block w-full px-3.5 py-2 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white text-slate-900 transition-all duration-200"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="last-name"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Last name
                </label>
                <div>
                  <input
                    id="last-name"
                    name="last-name"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    className="appearance-none block w-full px-3.5 py-2 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white text-slate-900 transition-all duration-200"
                  />
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Email address
              </label>
              <div className="flex gap-2">
                <div className="relative w-full">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    disabled={emailVerified || emailOtpSent}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@example.com"
                    className="appearance-none block w-full px-3.5 py-2 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white text-slate-900 transition-all duration-200 disabled:bg-slate-100 disabled:text-slate-500"
                  />
                  {emailVerified && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600 font-bold text-xs bg-green-50 px-2 py-0.5 rounded-md">
                      ✓ Verified
                    </span>
                  )}
                </div>
                {!emailVerified && !emailOtpSent && (
                  <button type="button" onClick={handleSendEmailOtp} disabled={sendingEmailOtp} className="whitespace-nowrap px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold hover:bg-indigo-100 hover:border-indigo-300 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all">
                    {sendingEmailOtp ? "Sending..." : "Get OTP"}
                  </button>
                )}
              </div>
              {emailMsg.text && (
                <div className={`mt-1 text-xs font-medium ${emailMsg.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>
                  {emailMsg.text}
                </div>
              )}
              {emailOtpSent && !emailVerified && (
                <div className="mt-1.5 flex gap-2">
                  <input
                    type="text"
                    value={emailOtp}
                    onChange={(e) => setEmailOtp(e.target.value)}
                    placeholder="Enter Email OTP"
                    className="appearance-none block w-full px-3.5 py-2 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white text-slate-900 transition-all"
                  />
                  <button type="button" onClick={handleVerifyEmailOtp} disabled={verifyingEmailOtp} className="whitespace-nowrap px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-medium hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors">
                    {verifyingEmailOtp ? "Verifying..." : "Verify"}
                  </button>
                </div>
              )}
              {emailOtpSent && !emailVerified && emailResendTimer === 0 && (
                <div className="mt-1 text-right">
                  <button type="button" onClick={handleSendEmailOtp} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                    Resend OTP
                  </button>
                </div>
              )}
              {emailOtpSent && !emailVerified && emailResendTimer > 0 && (
                <div className="mt-1 text-right">
                  <span className="text-xs text-slate-500 font-medium">Resend OTP in {emailResendTimer}s</span>
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="mobileNo"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Mobile Number
              </label>
              <div className="flex gap-2">
                <div className="relative w-full">
                  <input
                    id="mobileNo"
                    name="mobileNo"
                    type="text"
                    maxLength={10}
                    required
                    disabled={mobileVerified || mobileOtpSent}
                    value={mobileNo}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length <= 10) setMobileNo(val);
                    }}
                    placeholder="e.g. 8767601473"
                    className="appearance-none block w-full px-3.5 py-2 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white text-slate-900 transition-all duration-200 disabled:bg-slate-100 disabled:text-slate-500"
                  />
                  {mobileVerified && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600 font-bold text-xs bg-green-50 px-2 py-0.5 rounded-md">
                      ✓ Verified
                    </span>
                  )}
                </div>
                {!mobileVerified && !mobileOtpSent && (
                  <button type="button" onClick={handleSendMobileOtp} disabled={sendingMobileOtp} className="whitespace-nowrap px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold hover:bg-indigo-100 hover:border-indigo-300 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all">
                    {sendingMobileOtp ? "Sending..." : "Get OTP"}
                  </button>
                )}
              </div>
              {mobileMsg.text && (
                <div className={`mt-1 text-xs font-medium ${mobileMsg.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>
                  {mobileMsg.text}
                </div>
              )}
              {mobileOtpSent && !mobileVerified && (
                <div className="mt-1.5 flex gap-2">
                  <input
                    type="text"
                    value={mobileOtp}
                    onChange={(e) => setMobileOtp(e.target.value)}
                    placeholder="Enter Mobile OTP"
                    className="appearance-none block w-full px-3.5 py-2 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white text-slate-900 transition-all"
                  />
                  <button type="button" onClick={handleVerifyMobileOtp} disabled={verifyingMobileOtp} className="whitespace-nowrap px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-medium hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors">
                    {verifyingMobileOtp ? "Verifying..." : "Verify"}
                  </button>
                </div>
              )}
              {mobileOtpSent && !mobileVerified && mobileResendTimer === 0 && (
                <div className="mt-1 text-right">
                  <button type="button" onClick={handleSendMobileOtp} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                    Resend OTP
                  </button>
                </div>
              )}
              {mobileOtpSent && !mobileVerified && mobileResendTimer > 0 && (
                <div className="mt-1 text-right">
                  <span className="text-xs text-slate-500 font-medium">Resend OTP in {mobileResendTimer}s</span>
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`appearance-none block w-full px-3.5 py-2 border ${passwordError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-indigo-500 focus:border-indigo-500'} rounded-xl shadow-sm placeholder-slate-400 focus:outline-none text-sm bg-white text-slate-900 transition-all duration-200 pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordError && (
                <div className="text-red-500 text-xs mt-1">{passwordError}</div>
              )}
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`appearance-none block w-full px-3.5 py-2 border ${confirmPasswordError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-indigo-500 focus:border-indigo-500'} rounded-xl shadow-sm placeholder-slate-400 focus:outline-none text-sm bg-white text-slate-900 transition-all duration-200 pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPasswordError && (
                <div className="text-red-500 text-xs mt-1">{confirmPasswordError}</div>
              )}
            </div>

            <div>
              <div className="text-center mb-1.5">
                <label className="block text-xs font-semibold text-slate-900">
                  Select your role to join as <span className="text-red-500">*</span>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {ROLES.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setRole(r.id)}
                    className={`relative flex items-center gap-2.5 p-2 sm:p-2.5 border rounded-xl cursor-pointer transition-all duration-200 ${
                      role === r.id
                        ? "border-orange-500 bg-orange-50/60 shadow-sm"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                        role === r.id
                          ? "bg-orange-100 text-orange-600"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {r.icon}
                    </div>
                    <div className="text-left min-w-0">
                      <div className="font-bold text-slate-900 text-xs leading-none">{r.label}</div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">
                        {r.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center pt-0.5">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
              />
              <label
                htmlFor="terms"
                className="ml-2 block text-xs text-slate-700 cursor-pointer"
              >
                I agree to the{" "}
                <a href="#" className="text-indigo-600 hover:text-indigo-500 font-medium">Terms of Service</a>{" "}
                and{" "}
                <a href="#" className="text-indigo-600 hover:text-indigo-500 font-medium">Privacy Policy</a>
              </label>
            </div>

            {error && (
              <div className="text-red-500 text-xs mt-1">{error}</div>
            )}

            <div className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
