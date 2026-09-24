"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  GraduationCap,
  UserRound,
  KeyRound,
  Mail,
  LockKeyhole,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    email: "",
    password: "",
    role: "",
    facilitatorCode: "",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  function selectRole(role) {
    setForm({
      ...form,
      role,
      facilitatorCode:
        role === "facilitator"
          ? form.facilitatorCode
          : "",
    });

    setMessage("");
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setMessage("");

    if (!form.role) {
      setMessage(
        "Please select whether you are logging in as a Student or Facilitator."
      );
      return;
    }

    if (!form.email || !form.password) {
      setMessage(
        "Please enter your email address and password."
      );
      return;
    }

    if (
      form.role === "facilitator" &&
      !form.facilitatorCode.trim()
    ) {
      setMessage(
        "The facilitator invitation code is required."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          role: form.role,
          facilitatorCode:
            form.role === "facilitator"
              ? form.facilitatorCode
              : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.error ||
            data.message ||
            "Login failed."
        );
        setLoading(false);
        return;
      }

      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error("Login error:", error);

      setMessage(
        "Unable to connect to the server."
      );

      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">

          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-bold text-white">
              DCC
            </div>

            <h1 className="text-2xl font-bold text-slate-900">
              Welcome Back
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Sign in to the Dodoo Coding Club platform
            </p>
          </div>

          {/* Error Message */}
          {message && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {message}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >

            {/* Login Type */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                How are you logging in?
              </label>

              <div className="grid grid-cols-2 gap-3">

                {/* Student */}
                <button
                  type="button"
                  onClick={() =>
                    selectRole("student")
                  }
                  className={`flex flex-col items-center justify-center rounded-xl border-2 px-4 py-4 transition ${
                    form.role === "student"
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-slate-50"
                  }`}
                >
                  <GraduationCap className="mb-2 h-7 w-7" />

                  <span className="font-semibold">
                    Student
                  </span>

                  <span className="mt-1 text-xs text-slate-500">
                    Student account
                  </span>
                </button>

                {/* Facilitator */}
                <button
                  type="button"
                  onClick={() =>
                    selectRole("facilitator")
                  }
                  className={`flex flex-col items-center justify-center rounded-xl border-2 px-4 py-4 transition ${
                    form.role === "facilitator"
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-slate-50"
                  }`}
                >
                  <UserRound className="mb-2 h-7 w-7" />

                  <span className="font-semibold">
                    Facilitator
                  </span>

                  <span className="mt-1 text-xs text-slate-500">
                    Facilitator account
                  </span>
                </button>

              </div>
            </div>

            {/* Show login fields only after role selection */}
            {form.role && (
              <div className="space-y-5">

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
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      required
                      autoComplete="email"
                      className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Password
                  </label>

                  <div className="relative">
                    <LockKeyhole className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                    <input
                      id="password"
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                      className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                {/* Facilitator Invitation Code */}
                {form.role === "facilitator" && (
                  <div>
                    <label
                      htmlFor="facilitatorCode"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      Facilitator Invitation Code
                    </label>

                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                      <input
                        id="facilitatorCode"
                        type="password"
                        name="facilitatorCode"
                        value={form.facilitatorCode}
                        onChange={handleChange}
                        placeholder="Enter invitation code"
                        required
                        autoComplete="off"
                        className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <p className="mt-2 text-xs text-slate-500">
                      Use the same invitation code provided
                      during facilitator registration.
                    </p>
                  </div>
                )}

                {/* Selected Role */}
                <div className="rounded-lg bg-blue-50 px-4 py-3 text-center text-sm text-blue-700">
                  You are signing in as a{" "}
                  <span className="font-bold">
                    {form.role === "student"
                      ? "Student"
                      : "Facilitator"}
                  </span>
                </div>

                {/* Sign In */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? "Signing in..."
                    : "Sign In"}
                </button>

              </div>
            )}

          </form>

          {/* Register */}
          <div className="mt-6 text-center text-sm text-slate-500">
            Don't have an account?{" "}
            <Link
              href="/register"
              className="font-semibold text-blue-600 hover:text-blue-700"
            >
              Create an account
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-slate-400">
          Dodoo Coding Club · Student Success & Impact Platform
        </p>

      </div>
    </main>
  );
}