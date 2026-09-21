"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  ShieldCheck,
  LoaderCircle,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

export default function VerifyEmailPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const [cooldown, setCooldown] = useState(0);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Countdown for resend button
  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setCooldown((current) => current - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  // Verify email
  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: code.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "Unable to verify your email address."
        );
      }

      setMessage(
        data.message ||
          "Email verified successfully. You can now log in."
      );

      setTimeout(() => {
        router.push("/login");
      }, 1800);
    } catch (err) {
      setError(
        err.message ||
          "Something went wrong while verifying your email."
      );
    } finally {
      setLoading(false);
    }
  }

  // Resend verification code
  async function handleResend() {
    if (resending || cooldown > 0) {
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Please enter your email address first.");
      setMessage("");
      return;
    }

    setResending(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        "/api/auth/resend-verification",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: normalizedEmail,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "Unable to resend the verification code."
        );
      }

      setCode("");

      setMessage(
        data.message ||
          "A new verification code has been sent to your email."
      );

      // Start 60-second cooldown
      setCooldown(60);
    } catch (err) {
      setError(
        err.message ||
          "Something went wrong while requesting a new code."
      );
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">

          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <ShieldCheck className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-slate-900">
              Verify Your Email
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              Enter the email address you registered with and the
              six-digit verification code sent to your email.
            </p>
          </div>

          {/* Success Message */}
          {message && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              <CheckCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p>{message}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

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
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError("");
                  }}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                maxLength={6}
                value={code}
                onChange={(event) =>
                  setCode(
                    event.target.value
                      .replace(/\D/g, "")
                      .slice(0, 6)
                  )
                }
                placeholder="123456"
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-center text-xl tracking-[0.35em] outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Verify Button */}
            <button
              type="submit"
              disabled={loading}
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

            {/* Resend Code */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || cooldown > 0}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {resending ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Sending New Code...
                  </>
                ) : cooldown > 0 ? (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Resend Code in {cooldown}s
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Resend Verification Code
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Back to Login
            </button>
          </div>

          {/* Expiration Notice */}
          <p className="mt-4 text-center text-xs text-slate-500">
            The verification code expires after 10 minutes.
            You can request a new code if it expires.
          </p>
        </div>
      </div>
    </main>
  );
}