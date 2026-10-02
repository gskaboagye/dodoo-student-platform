"use client";

import { useState } from "react";
import Link from "next/link";

import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false);

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  // =========================================================
  // SUBMIT FORM
  // =========================================================

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    // -------------------------------------------------------
    // REQUIRED FIELDS
    // -------------------------------------------------------

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      setError(
        "Please complete all password fields."
      );

      return;
    }

    // -------------------------------------------------------
    // PASSWORD LENGTH
    // -------------------------------------------------------

    if (newPassword.length < 8) {
      setError(
        "Your new password must be at least 8 characters."
      );

      return;
    }

    // -------------------------------------------------------
    // UPPERCASE
    // -------------------------------------------------------

    if (!/[A-Z]/.test(newPassword)) {
      setError(
        "Your new password must contain at least one uppercase letter."
      );

      return;
    }

    // -------------------------------------------------------
    // LOWERCASE
    // -------------------------------------------------------

    if (!/[a-z]/.test(newPassword)) {
      setError(
        "Your new password must contain at least one lowercase letter."
      );

      return;
    }

    // -------------------------------------------------------
    // NUMBER
    // -------------------------------------------------------

    if (!/[0-9]/.test(newPassword)) {
      setError(
        "Your new password must contain at least one number."
      );

      return;
    }

    // -------------------------------------------------------
    // SPECIAL CHARACTER
    // -------------------------------------------------------

    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      setError(
        "Your new password must contain at least one special character."
      );

      return;
    }

    // -------------------------------------------------------
    // PASSWORD MATCH
    // -------------------------------------------------------

    if (newPassword !== confirmPassword) {
      setError(
        "New password and confirmation password do not match."
      );

      return;
    }

    // -------------------------------------------------------
    // SEND REQUEST
    // -------------------------------------------------------

    try {
      setLoading(true);

      const response = await fetch(
        "/api/auth/change-password",
        {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
          },
          body: JSON.stringify({
            currentPassword,
            newPassword,
            confirmPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setError(
            "Your session has expired. Please log in again."
          );

          return;
        }

        throw new Error(
          data?.error ||
            data?.message ||
            "Unable to change your password."
        );
      }

      setSuccess(
        data?.message ||
          "Your password has been changed successfully."
      );

      // Clear form after successful update.
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error(
        "CHANGE PASSWORD PAGE ERROR:",
        error
      );

      setError(
        error?.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // =========================================================
  // PASSWORD INPUT COMPONENT
  // =========================================================

  function PasswordInput({
    id,
    label,
    value,
    onChange,
    visible,
    setVisible,
    placeholder,
  }) {
    return (
      <div>
        <label
          htmlFor={id}
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          {label}
        </label>

        <div className="relative">
          <LockKeyhole
            size={18}
            className="
              absolute
              left-4
              top-1/2
              -translate-y-1/2
              text-slate-400
            "
          />

          <input
            id={id}
            type={
              visible
                ? "text"
                : "password"
            }
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            autoComplete="current-password"
            className="
              h-12
              w-full
              rounded-xl
              border
              border-slate-200
              bg-white
              pl-11
              pr-12
              text-sm
              text-slate-800
              outline-none
              transition
              placeholder:text-slate-400
              focus:border-blue-400
              focus:ring-4
              focus:ring-blue-50
            "
          />

          <button
            type="button"
            onClick={() =>
              setVisible(
                (value) => !value
              )
            }
            aria-label={
              visible
                ? `Hide ${label.toLowerCase()}`
                : `Show ${label.toLowerCase()}`
            }
            className="
              absolute
              right-3
              top-1/2
              flex
              h-9
              w-9
              -translate-y-1/2
              items-center
              justify-center
              rounded-lg
              text-slate-400
              transition
              hover:bg-slate-100
              hover:text-slate-600
            "
          >
            {visible ? (
              <EyeOff size={18} />
            ) : (
              <Eye size={18} />
            )}
          </button>
        </div>
      </div>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div className="min-h-full bg-[#f3f4f6] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">

        {/* =================================================
            BACK TO DASHBOARD
        ================================================== */}

        <Link
          href="/"
          className="
            mb-6
            inline-flex
            items-center
            gap-2
            text-sm
            font-semibold
            text-slate-600
            transition
            hover:text-blue-600
          "
        >
          <ArrowLeft size={17} />

          Back to Dashboard
        </Link>

        {/* =================================================
            MAIN CARD
        ================================================== */}

        <div
          className="
            overflow-hidden
            rounded-2xl
            border
            border-slate-200
            bg-white
            shadow-sm
          "
        >

          {/* =================================================
              HEADER
          ================================================== */}

          <div
            className="
              border-b
              border-slate-100
              px-6
              py-7
              sm:px-8
            "
          >
            <div className="flex items-start gap-4">

              <div
                className="
                  flex
                  h-12
                  w-12
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-blue-50
                  text-blue-600
                "
              >
                <KeyRound size={24} />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Change Password
                </h1>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Update your account password securely.
                </p>
              </div>
            </div>
          </div>

          {/* =================================================
              FORM
          ================================================== */}

          <form
            onSubmit={handleSubmit}
            className="px-6 py-7 sm:px-8"
          >

            {/* =================================================
                ERROR
            ================================================== */}

            {error && (
              <div
                role="alert"
                className="
                  mb-6
                  rounded-xl
                  border
                  border-red-200
                  bg-red-50
                  px-4
                  py-3
                  text-sm
                  font-medium
                  text-red-700
                "
              >
                {error}
              </div>
            )}

            {/* =================================================
                SUCCESS
            ================================================== */}

            {success && (
              <div
                role="status"
                className="
                  mb-6
                  flex
                  items-start
                  gap-3
                  rounded-xl
                  border
                  border-green-200
                  bg-green-50
                  px-4
                  py-3
                  text-sm
                  font-medium
                  text-green-700
                "
              >
                <CheckCircle2
                  size={19}
                  className="mt-0.5 shrink-0"
                />

                <span>{success}</span>
              </div>
            )}

            {/* =================================================
                PASSWORD FIELDS
            ================================================== */}

            <div className="space-y-5">

              <PasswordInput
                id="current-password"
                label="Current Password"
                value={currentPassword}
                onChange={(event) =>
                  setCurrentPassword(
                    event.target.value
                  )
                }
                visible={
                  showCurrentPassword
                }
                setVisible={
                  setShowCurrentPassword
                }
                placeholder="Enter your current password"
              />

              <PasswordInput
                id="new-password"
                label="New Password"
                value={newPassword}
                onChange={(event) =>
                  setNewPassword(
                    event.target.value
                  )
                }
                visible={showNewPassword}
                setVisible={
                  setShowNewPassword
                }
                placeholder="Enter your new password"
              />

              <PasswordInput
                id="confirm-password"
                label="Confirm New Password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                visible={
                  showConfirmPassword
                }
                setVisible={
                  setShowConfirmPassword
                }
                placeholder="Confirm your new password"
              />
            </div>

            {/* =================================================
                PASSWORD REQUIREMENTS
            ================================================== */}

            <div
              className="
                mt-6
                rounded-xl
                border
                border-blue-100
                bg-blue-50
                p-4
              "
            >
              <div className="flex items-start gap-3">

                <ShieldCheck
                  size={19}
                  className="
                    mt-0.5
                    shrink-0
                    text-blue-600
                  "
                />

                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Password requirements
                  </p>

                  <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-600">
                    <li>
                      At least 8 characters
                    </li>

                    <li>
                      At least one uppercase letter
                    </li>

                    <li>
                      At least one lowercase letter
                    </li>

                    <li>
                      At least one number
                    </li>

                    <li>
                      At least one special character
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* =================================================
                SUBMIT BUTTON
            ================================================== */}

            <button
              type="submit"
              disabled={loading}
              className="
                mt-7
                flex
                h-12
                w-full
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-blue-600
                px-5
                text-sm
                font-bold
                text-white
                transition
                hover:bg-blue-700
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              <KeyRound size={18} />

              {loading
                ? "Changing Password..."
                : "Change Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}