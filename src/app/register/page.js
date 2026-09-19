"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "student",
    program: "",
    facilitatorCode: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
    setMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/auth/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            password: form.password,
            role: form.role,
            program: form.program,
            facilitatorCode:
              form.facilitatorCode,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "Registration failed."
        );
      }

      /*
       * STUDENT REGISTRATION
       *
       * Students must wait for facilitator approval.
       * Do not automatically log them in.
       */
      if (form.role === "student") {
        setRegistered(true);

        setMessage(
          "Your account has been created successfully. Your registration is now waiting for facilitator approval."
        );

        return;
      }

      /*
       * FACILITATOR REGISTRATION
       *
       * Facilitators are active immediately.
       */
      setMessage(
        "Facilitator account created successfully. Redirecting to login..."
      );

      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (error) {
      setError(
        error.message ||
          "Unable to create account."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * ---------------------------------------------
   * STUDENT SUCCESS / PENDING SCREEN
   * ---------------------------------------------
   */

  if (registered) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
        <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-lg">

          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <span className="text-2xl">
              ✓
            </span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            Registration Submitted
          </h1>

          <p className="mt-4 text-sm leading-6 text-slate-600">
            Your student account has been
            created successfully.
          </p>

          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-left">
            <h2 className="font-semibold text-amber-900">
              Awaiting Facilitator Approval
            </h2>

            <p className="mt-2 text-sm leading-6 text-amber-800">
              A Dodoo Coding Club facilitator
              must review and accept your
              registration before you can log
              in and access your dashboard.
            </p>
          </div>

          <p className="mt-5 text-sm text-slate-500">
            You can try signing in after your
            account has been approved.
          </p>

          <button
            type="button"
            onClick={() => router.push("/login")}
            className="mt-6 w-full rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white transition hover:bg-blue-800"
          >
            Go to Login
          </button>

        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-lg">

        <div className="mb-8 text-center">
          <h1 className="text-2xl font-extrabold text-blue-700">
            DODOO
          </h1>

          <p className="font-semibold text-gray-700">
            CODING CLUB
          </p>

          <h2 className="mt-6 text-2xl font-bold text-gray-900">
            Create Account
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Create your DCC Student Platform account
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-5 rounded-lg bg-green-50 p-3 text-sm text-green-700">
            {message}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Account Type
            </label>

            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            >
              <option value="student">
                Student
              </option>

              <option value="facilitator">
                Facilitator
              </option>
            </select>
          </div>

          {form.role === "student" && (
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
              Student registrations must be
              approved by a facilitator before
              you can access the platform.
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Full Name
            </label>

            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Email Address
            </label>

            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {form.role === "student" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Program
              </label>

              <input
                type="text"
                name="program"
                value={form.program}
                onChange={handleChange}
                placeholder="e.g. Software Development"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          )}

          {form.role === "facilitator" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Facilitator Registration Code
              </label>

              <input
                type="password"
                name="facilitatorCode"
                value={form.facilitatorCode}
                onChange={handleChange}
                placeholder="Enter facilitator code"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />

              <p className="mt-1 text-xs text-gray-500">
                Required to create a facilitator
                account.
              </p>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Password
            </label>

            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="At least 8 characters"
              required
              minLength={8}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Confirm Password
            </label>

            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
              required
              minLength={8}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Creating Account..."
              : "Create Account"}
          </button>

        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() =>
              router.push("/login")
            }
            className="font-semibold text-blue-700 hover:underline"
          >
            Sign In
          </button>
        </div>

      </div>
    </div>
  );
}