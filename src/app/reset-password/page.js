"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  LockKeyhole,
  CheckCircle,
  ArrowLeft,
  Loader2,
} from "lucide-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();

  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!token || !email) {
      setError(
        "This password reset link is invalid or incomplete. Please request a new password reset link."
      );
      return;
    }

    if (!password || !confirmPassword) {
      setError("Please enter and confirm your new password.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (!/[A-Z]/.test(password)) {
      setError(
        "Password must contain at least one uppercase letter."
      );
      return;
    }

    if (!/[a-z]/.test(password)) {
      setError(
        "Password must contain at least one lowercase letter."
      );
      return;
    }

    if (!/[0-9]/.test(password)) {
      setError(
        "Password must contain at least one number."
      );
      return;
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      setError(
        "Password must contain at least one special character."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/auth/reset-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            email,
            password,
            confirmPassword,
          }),
        }
      );

      const responseText = await response.text();

      let data = {};

      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error(
            "Invalid JSON response:",
            responseText
          );

          setError(
            `The server returned an invalid response (HTTP ${response.status}).`
          );

          setLoading(false);
          return;
        }
      }

      if (!response.ok) {
        setError(
          data.error ||
            data.message ||
            "Unable to reset your password."
        );

        setLoading(false);
        return;
      }

      setSuccess(true);
      setMessage(
        data.message ||
          "Your password has been reset successfully."
      );
    } catch (requestError) {
      console.error(
        "Password reset error:",
        requestError
      );

      setError(
        "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-9 w-9 text-green-600" />
            </div>

            <h1 className="text-2xl font-bold text-slate-900">
              Password Reset Successful
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              {message}
            </p>

            <Link
              href="/login"
              className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Go to Login
            </Link>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            Dodoo Coding Club · Student Success & Impact Platform
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white">
              <LockKeyhole className="h-8 w-8" />
            </div>

            <h1 className="text-2xl font-bold text-slate-900">
              Reset Password
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Create a new password for your account.
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                New Password
              </label>

              <div className="relative">
                <LockKeyhole className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  required
                  className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Confirm New Password
              </label>

              <div className="relative">
                <LockKeyhole className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(e.target.value)
                  }
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  required
                  className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
              Your password must contain at least 8 characters,
              including an uppercase letter, lowercase letter,
              number, and special character.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Resetting Password...
                </>
              ) : (
                "Reset Password"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Dodoo Coding Club · Student Success & Impact Platform
        </p>
      </div>
    </main>
  );
}

function ResetPasswordLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />

        <p className="mt-3 text-sm text-slate-500">
          Loading password reset...
        </p>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordLoading />}>
      <ResetPasswordForm />
    </Suspense>
  );
}