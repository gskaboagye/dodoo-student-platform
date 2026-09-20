"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  ShieldCheck,
  LoaderCircle,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

export default function VerifyEmailPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleVerify = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!/^\d{6}$/.test(cleanCode)) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: cleanEmail,
          code: cleanCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            data.message ||
            "Email verification failed."
        );
        return;
      }

      setMessage(
        data.message ||
          "Your email has been verified successfully. You can now log in."
      );

      setTimeout(() => {
        router.push("/login");
      }, 1800);
    } catch (err) {
      console.error("EMAIL VERIFICATION ERROR:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <ShieldCheck className="h-8 w-8 text-blue-600" />
            </div>

            <h1 className="text-2xl font-bold text-slate-900">
              Verify Your Email
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              Enter the 6-digit verification code sent to your email address.
            </p>
          </div>

          {/* Success Message */}
          {message && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
              <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />

              <p className="text-sm text-green-700">
                {message}
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

              <p className="text-sm text-red-700">
                {error}
              </p>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-5">

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
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>
            </div>

            {/* Verification Code */}
            <div>
              <label
                htmlFor="code"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Verification Code
              </label>

              <input
                id="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  const value = e.target.value
                    .replace(/\D/g, "")
                    .slice(0, 6);

                  setCode(value);
                }}
                placeholder="123456"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-center text-xl font-semibold tracking-[0.4em] outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                required
              />

              <p className="mt-2 text-xs text-slate-500">
                The verification code is valid for 10 minutes.
              </p>
            </div>

            {/* Verify Button */}
            <button
              type="submit"
              disabled={loading || Boolean(message)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-5 w-5" />
                  Verify Email
                </>
              )}
            </button>

          </form>

          {/* Login */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Back to Login
            </button>
          </div>

        </div>
      </div>
    </main>
  );
}