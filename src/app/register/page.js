
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  UserRound,
  Mail,
  Lock,
  GraduationCap,
  ShieldCheck,
  Eye,
  EyeOff,
  LoaderCircle,
  CheckCircle,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  const [role, setRole] = useState("student");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    program: "",
    facilitatorCode: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setError("");
    setSuccess("");
    setSubmitted(false);

    setForm((prev) => ({
      ...prev,
      program: "",
      facilitatorCode: "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();

    if (!name) {
      setError("Please enter your full name.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (!/[A-Z]/.test(form.password)) {
      setError("Password must contain at least one uppercase letter.");
      return;
    }

    if (!/[a-z]/.test(form.password)) {
      setError("Password must contain at least one lowercase letter.");
      return;
    }

    if (!/[0-9]/.test(form.password)) {
      setError("Password must contain at least one number.");
      return;
    }

    if (!/[^A-Za-z0-9]/.test(form.password)) {
      setError("Password must contain at least one special character.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (role === "student" && !form.program) {
      setError("Please select your program.");
      return;
    }

    if (role === "facilitator" && !form.facilitatorCode.trim()) {
      setError("Please enter the facilitator invitation code.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password: form.password,
          role,
          program: form.program,
          facilitatorCode: form.facilitatorCode.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || data.message || "Registration failed.");
        return;
      }

      setSubmittedEmail(email);

      if (role === "student") {
        setSubmitted(true);
      } else {
        setSuccess(
          "Registration successful. Please verify your email address."
        );

        setTimeout(() => {
          router.push(`/verify-email?email=${encodeURIComponent(email)}`);
        }, 1500);
      }
    } catch (error) {
      console.error(error);
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /*
   * Student application submitted successfully
   */
  if (submitted && role === "student") {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto flex min-h-[80vh] w-full max-w-lg items-center justify-center">
          <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
            {/* Success Icon */}
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>

            {/* Heading */}
            <div className="text-center">
              <h1 className="text-2xl font-bold text-slate-900">
                Application Submitted Successfully!
              </h1>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                Your student account has been created and your application has
                been submitted for facilitator approval.
              </p>
            </div>

            {/* Application Status */}
            <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-5">
              <h2 className="font-semibold text-blue-900">
                What happens next?
              </h2>

              <div className="mt-4 space-y-4">
                <div className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                    1
                  </div>

                  <div>
                    <p className="font-medium text-slate-900">
                      Verify your email
                    </p>

                    <p className="mt-1 text-sm leading-5 text-slate-600">
                      Check your email and complete the verification process.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                    2
                  </div>

                  <div>
                    <p className="font-medium text-slate-900">
                      Wait for facilitator approval
                    </p>

                    <p className="mt-1 text-sm leading-5 text-slate-600">
                      After verifying your email, your application will remain
                      pending until a facilitator reviews it.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                    3
                  </div>

                  <div>
                    <p className="font-medium text-slate-900">
                      Receive your approval email
                    </p>

                    <p className="mt-1 text-sm leading-5 text-slate-600">
                      Once a facilitator approves your application, you will
                      receive an email confirming that your account is active
                      and ready to use.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Registered Email */}
            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />

                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Registered Email
                  </p>

                  <p className="mt-1 break-all font-medium text-slate-900">
                    {submittedEmail}
                  </p>
                </div>
              </div>
            </div>

            {/* Important Notice */}
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm leading-6 text-amber-800">
                <strong>Important:</strong> Please check your spam or junk
                folder if you do not see the verification or approval email in
                your inbox.
              </p>
            </div>

            {/* Continue Button */}
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/verify-email?email=${encodeURIComponent(submittedEmail)}`
                )
              }
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Continue to Email Verification
              <ArrowRight className="h-5 w-5" />
            </button>

            {/* Login */}
            <div className="mt-5 text-center">
              <p className="text-sm text-slate-600">
                Already verified your email?{" "}
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="font-semibold text-blue-600 hover:text-blue-700"
                >
                  Go to Login
                </button>
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-lg">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <UserPlus className="h-8 w-8 text-blue-600" />
            </div>

            <h1 className="text-2xl font-bold text-slate-900">
              Create an Account
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              Join the Dodoo Coding Club Student Platform
            </p>
          </div>

          {/* Role */}
          <div className="mb-6">
            <label className="mb-3 block text-sm font-medium text-slate-700">
              Account Type
            </label>

            <div className="grid grid-cols-2 gap-3">
              {/* Student */}
              <button
                type="button"
                onClick={() => handleRoleChange("student")}
                className={`rounded-lg border p-4 text-left transition ${
                  role === "student"
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <GraduationCap
                  className={`mb-2 h-6 w-6 ${
                    role === "student"
                      ? "text-blue-600"
                      : "text-slate-500"
                  }`}
                />

                <div className="font-semibold text-slate-900">Student</div>

                <div className="mt-1 text-xs text-slate-500">
                  Student account
                </div>
              </button>

              {/* Facilitator */}
              <button
                type="button"
                onClick={() => handleRoleChange("facilitator")}
                className={`rounded-lg border p-4 text-left transition ${
                  role === "facilitator"
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <ShieldCheck
                  className={`mb-2 h-6 w-6 ${
                    role === "facilitator"
                      ? "text-blue-600"
                      : "text-slate-500"
                  }`}
                />

                <div className="font-semibold text-slate-900">
                  Facilitator
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  Staff account
                </div>
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

              <p className="text-sm leading-6 text-red-700">{error}</p>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
              <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />

              <p className="text-sm leading-6 text-green-700">{success}</p>
            </div>
          )}

          {/* Student Notice */}
          {role === "student" && (
            <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm leading-6 text-blue-700">
                After registration, please verify your email address. Your
                application will remain pending until a facilitator reviews and
                approves it. Once approved, you will receive an email
                confirming that your student account is active.
              </p>
            </div>
          )}

          {/* Facilitator Notice */}
          {role === "facilitator" && (
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm leading-6 text-amber-700">
                Facilitator registration requires a valid invitation code. Your
                email must also be verified before you can log in.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Full Name
              </label>

              <div className="relative">
                <UserRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                <input
                  id="name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Email Address
              </label>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>
            </div>

            {/* Program */}
            {role === "student" && (
              <div>
                <label
                  htmlFor="program"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Program
                </label>

                <select
                  id="program"
                  name="program"
                  value={form.program}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                >
                  <option value="">Select your program</option>
                  <option value="Software Development">
                    Software Development
                  </option>
                  <option value="Web Development">Web Development</option>
                  <option value="Graphic Design">Graphic Design</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            )}

            {/* Facilitator Code */}
            {role === "facilitator" && (
              <div>
                <label
                  htmlFor="facilitatorCode"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Facilitator Invitation Code
                </label>

                <input
                  id="facilitatorCode"
                  name="facilitatorCode"
                  type="password"
                  value={form.facilitatorCode}
                  onChange={handleChange}
                  placeholder="Enter invitation code"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>
            )}

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Password
              </label>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Create a strong password"
                  className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-12 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Minimum 8 characters with uppercase, lowercase, number, and
                special character.
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Confirm Password
              </label>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-12 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirmation password"
                      : "Show confirmation password"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <UserPlus className="h-5 w-5" />
                  Create Account
                </>
              )}
            </button>
          </form>

          {/* Login */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="font-semibold text-blue-600 hover:text-blue-700"
              >
                Login
              </button>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}