"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  LockKeyhole,
  CheckCircle,
  ArrowLeft,
  Loader2,
} from "lucide-react";

export default function ResetPasswordPage() {
  const searchParams =
    useSearchParams();

  const token =
    searchParams.get("token") || "";

  const email =
    searchParams.get("email") || "";

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");

    if (!token || !email) {
      setError(
        "This password reset link is invalid or incomplete."
      );

      return;
    }

    if (password !== confirmPassword) {
      setError(
        "Passwords do not match."
      );

      return;
    }

    setLoading(true);

    try {
      const response =
        await fetch(
          "/api/auth/reset-password",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              token,
              email,
              password,
              confirmPassword,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        setError(
          data?.error ||
            "Unable to reset your password."
        );

        return;
      }

      setSuccess(true);
      setPassword("");
      setConfirmPassword("");
    } catch (requestError) {
      console.error(
        "RESET PASSWORD REQUEST ERROR:",
        requestError
      );

      setError(
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "#f8fafc",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "440px",
            background: "#ffffff",
            padding: "40px",
            borderRadius: "16px",
            border:
              "1px solid #e2e8f0",
            textAlign: "center",
            boxShadow:
              "0 10px 30px rgba(15, 23, 42, 0.08)",
          }}
        >
          <div
            style={{
              width: "58px",
              height: "58px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              background: "#f0fdf4",
              color: "#16a34a",
              borderRadius: "50%",
            }}
          >
            <CheckCircle size={30} />
          </div>

          <h1
            style={{
              margin: "0 0 12px",
              color: "#0f172a",
              fontSize: "27px",
            }}
          >
            Password Reset Successful
          </h1>

          <p
            style={{
              margin: "0 0 28px",
              color: "#64748b",
              lineHeight: 1.6,
            }}
          >
            Your password has been updated.
            You can now log in using your
            new password.
          </p>

          <Link
            href="/login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "13px 24px",
              borderRadius: "10px",
              background: "#2563eb",
              color: "#ffffff",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Go to Login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "#f8fafc",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          background: "#ffffff",
          padding: "36px",
          borderRadius: "16px",
          border:
            "1px solid #e2e8f0",
          boxShadow:
            "0 10px 30px rgba(15, 23, 42, 0.08)",
        }}
      >
        <div
          style={{
            width: "52px",
            height: "52px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#eff6ff",
            color: "#2563eb",
            borderRadius: "12px",
            marginBottom: "20px",
          }}
        >
          <LockKeyhole size={24} />
        </div>

        <h1
          style={{
            margin: "0 0 10px",
            color: "#0f172a",
            fontSize: "28px",
          }}
        >
          Create a new password
        </h1>

        <p
          style={{
            margin: "0 0 28px",
            color: "#64748b",
            lineHeight: 1.6,
          }}
        >
          Choose a strong password for your
          Dodoo Coding Club account.
        </p>

        {error && (
          <div
            style={{
              marginBottom: "20px",
              padding: "14px 16px",
              borderRadius: "10px",
              background: "#fef2f2",
              border:
                "1px solid #fecaca",
              color: "#b91c1c",
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
        >
          <label
            htmlFor="password"
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: 600,
              color: "#334155",
            }}
          >
            New password
          </label>

          <div
            style={{
              position: "relative",
              marginBottom: "18px",
            }}
          >
            <LockKeyhole
              size={18}
              style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform:
                  "translateY(-50%)",
                color: "#94a3b8",
              }}
            />

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Enter new password"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding:
                  "13px 14px 13px 44px",
                border:
                  "1px solid #cbd5e1",
                borderRadius: "10px",
                fontSize: "15px",
                outline: "none",
              }}
            />
          </div>

          <p
            style={{
              margin:
                "-6px 0 20px",
              color: "#64748b",
              fontSize: "13px",
              lineHeight: 1.5,
            }}
          >
            At least 8 characters with an
            uppercase letter, lowercase letter,
            number, and special character.
          </p>

          <label
            htmlFor="confirmPassword"
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: 600,
              color: "#334155",
            }}
          >
            Confirm new password
          </label>

          <div
            style={{
              position: "relative",
              marginBottom: "22px",
            }}
          >
            <LockKeyhole
              size={18}
              style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform:
                  "translateY(-50%)",
                color: "#94a3b8",
              }}
            />

            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value
                )
              }
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Confirm new password"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding:
                  "13px 14px 13px 44px",
                border:
                  "1px solid #cbd5e1",
                borderRadius: "10px",
                fontSize: "15px",
                outline: "none",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              border: "none",
              borderRadius: "10px",
              padding: "14px",
              background: loading
                ? "#93c5fd"
                : "#2563eb",
              color: "#ffffff",
              fontSize: "15px",
              fontWeight: 600,
              cursor: loading
                ? "not-allowed"
                : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            {loading ? (
              <>
                <Loader2
                  size={18}
                  className="animate-spin"
                />
                Updating Password...
              </>
            ) : (
              "Reset Password"
            )}
          </button>
        </form>

        <Link
          href="/login"
          style={{
            marginTop: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "7px",
            color: "#475569",
            textDecoration: "none",
            fontSize: "14px",
          }}
        >
          <ArrowLeft size={16} />
          Back to Login
        </Link>
      </div>
    </main>
  );
}