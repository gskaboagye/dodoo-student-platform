"use client";

import { useEffect, useState } from "react";

export default function StudentProfilePage() {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/student/profile", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Failed to load your profile."
        );
      }

      setStudent(data.student || data);
    } catch (err) {
      console.error("PROFILE LOAD ERROR:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // PROFILE IMAGE UPLOAD
  // ==========================================
  async function handleImageUpload(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setMessage("");
    setError("");

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Only JPG, PNG, and WebP images are allowed.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5MB.");
      event.target.value = "";
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("file", file);

      console.log("Starting profile picture upload...");
      console.log("File:", file.name);
      console.log("Type:", file.type);
      console.log("Size:", file.size);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      console.log("Upload response:", data);

      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Image upload failed."
        );
      }

      setStudent((prev) => ({
        ...prev,
        profileImage: data.imageUrl,
      }));

      setMessage(
        "Profile picture uploaded. Click Save Profile to keep the change."
      );
    } catch (error) {
      console.error("IMAGE UPLOAD ERROR:", error);

      setError(
        error.message || "Failed to upload profile picture."
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  // ==========================================
  // FORM INPUT CHANGES
  // ==========================================
  function handleChange(event) {
    const { name, value } = event.target;

    setStudent((previous) => ({
      ...previous,
      [name]: value,
    }));

    setMessage("");
    setError("");
  }

  // ==========================================
  // SAVE PROFILE
  // ==========================================
  async function handleSave(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setMessage("");
      setError("");

      const response = await fetch("/api/student/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: student.firstName || "",
          lastName: student.lastName || "",
          phone: student.phone || "",
          dateOfBirth: student.dateOfBirth || "",
          gender: student.gender || "",
          program: student.program || "",
          educationLevel: student.educationLevel || "",
          school: student.school || "",
          address: student.address || "",
          emergencyContactName:
            student.emergencyContactName || "",
          emergencyContactPhone:
            student.emergencyContactPhone || "",
          profileImage: student.profileImage || "",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            "Failed to save your profile."
        );
      }

      setStudent(data.student || student);

      setMessage("Your profile has been saved successfully.");
    } catch (err) {
      console.error("PROFILE SAVE ERROR:", err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // ==========================================
  // LOADING
  // ==========================================
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-xl bg-white px-6 py-5 shadow-sm">
          <p className="text-sm text-slate-600">
            Loading your profile...
          </p>
        </div>
      </div>
    );
  }

  // ==========================================
  // ERROR
  // ==========================================
  if (error && !student) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-3xl rounded-xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-lg font-bold text-red-800">
            Unable to load profile
          </h1>

          <p className="mt-2 text-sm text-red-700">
            {error}
          </p>

          <button
            type="button"
            onClick={loadProfile}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-3xl rounded-xl bg-white p-6 shadow-sm">
          <p className="text-slate-600">
            No student profile was found.
          </p>
        </div>
      </div>
    );
  }

  const fullName =
    `${student.firstName || ""} ${
      student.lastName || ""
    }`.trim() || "Student";

  // ==========================================
  // PAGE
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-5xl">

        {/* PAGE HEADER */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">
            My Profile
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            View and update your personal information.
          </p>
        </div>

        {/* SUCCESS MESSAGE */}
        {message && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {message}
          </div>
        )}

        {/* ERROR MESSAGE */}
        {error && student && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">

          {/* ========================================
              PROFILE PICTURE
          ======================================== */}
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              Profile Picture
            </h2>

            <div className="mt-5 flex flex-col items-center sm:flex-row sm:items-start sm:gap-6">

              {/* IMAGE */}
              <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-slate-100 bg-slate-200">

                {student.profileImage ? (
                  <img
                    src={student.profileImage}
                    alt={`${fullName} profile`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-4xl font-bold text-slate-500">
                    {(student.firstName || "S")
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                )}

              </div>

              {/* UPLOAD */}
              <div className="mt-4 text-center sm:mt-0 sm:text-left">

                <p className="font-semibold text-slate-900">
                  {fullName}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  JPG, PNG, or WebP. Maximum size: 5MB.
                </p>

                <div className="mt-4">

                  {/* REAL FILE INPUT */}
                  <input
                    id="profile-picture"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />

                  {/* UPLOAD BUTTON */}
                  <label
                    htmlFor="profile-picture"
                    className={`inline-flex items-center justify-center rounded-xl px-5 py-2.5 font-semibold text-white transition ${
                      uploading
                        ? "cursor-not-allowed bg-slate-400"
                        : "cursor-pointer bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {uploading
                      ? "Uploading..."
                      : "Upload Picture"}
                  </label>

                </div>
              </div>
            </div>
          </section>

          {/* ========================================
              PERSONAL INFORMATION
          ======================================== */}
          <section className="rounded-2xl bg-white p-6 shadow-sm">

            <h2 className="text-lg font-bold text-slate-900">
              Personal Information
            </h2>

            <div className="mt-5 grid gap-5 md:grid-cols-2">

              {/* FIRST NAME */}
              <div>
                <label
                  htmlFor="firstName"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  First Name
                </label>

                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={student.firstName || ""}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* LAST NAME */}
              <div>
                <label
                  htmlFor="lastName"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Last Name
                </label>

                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={student.lastName || ""}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* EMAIL */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Email
                </label>

                <input
                  id="email"
                  type="email"
                  value={student.email || ""}
                  disabled
                  className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-500"
                />

                <p className="mt-1 text-xs text-slate-500">
                  Email cannot be changed from your student profile.
                </p>
              </div>

              {/* PHONE */}
              <div>
                <label
                  htmlFor="phone"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Phone Number
                </label>

                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={student.phone || ""}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* DATE OF BIRTH */}
              <div>
                <label
                  htmlFor="dateOfBirth"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Date of Birth
                </label>

                <input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  value={
                    student.dateOfBirth
                      ? String(student.dateOfBirth).slice(0, 10)
                      : ""
                  }
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* GENDER */}
              <div>
                <label
                  htmlFor="gender"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Gender
                </label>

                <select
                  id="gender"
                  name="gender"
                  value={student.gender || ""}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Prefer not to say">
                    Prefer not to say
                  </option>
                </select>
              </div>

            </div>
          </section>

          {/* ========================================
              EDUCATION
          ======================================== */}
          <section className="rounded-2xl bg-white p-6 shadow-sm">

            <h2 className="text-lg font-bold text-slate-900">
              Education Information
            </h2>

            <div className="mt-5 grid gap-5 md:grid-cols-2">

              <div>
                <label
                  htmlFor="program"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Program
                </label>

                <input
                  id="program"
                  name="program"
                  type="text"
                  value={student.program || ""}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="educationLevel"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Education Level
                </label>

                <input
                  id="educationLevel"
                  name="educationLevel"
                  type="text"
                  value={student.educationLevel || ""}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="school"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  School / Institution
                </label>

                <input
                  id="school"
                  name="school"
                  type="text"
                  value={student.school || ""}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

            </div>
          </section>

          {/* ========================================
              CONTACT INFORMATION
          ======================================== */}
          <section className="rounded-2xl bg-white p-6 shadow-sm">

            <h2 className="text-lg font-bold text-slate-900">
              Contact Information
            </h2>

            <div className="mt-5">

              <label
                htmlFor="address"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Address
              </label>

              <textarea
                id="address"
                name="address"
                rows={3}
                value={student.address || ""}
                onChange={handleChange}
                className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

            </div>
          </section>

          {/* ========================================
              EMERGENCY CONTACT
          ======================================== */}
          <section className="rounded-2xl bg-white p-6 shadow-sm">

            <h2 className="text-lg font-bold text-slate-900">
              Emergency Contact
            </h2>

            <div className="mt-5 grid gap-5 md:grid-cols-2">

              <div>
                <label
                  htmlFor="emergencyContactName"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Contact Name
                </label>

                <input
                  id="emergencyContactName"
                  name="emergencyContactName"
                  type="text"
                  value={
                    student.emergencyContactName || ""
                  }
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="emergencyContactPhone"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Contact Phone
                </label>

                <input
                  id="emergencyContactPhone"
                  name="emergencyContactPhone"
                  type="tel"
                  value={
                    student.emergencyContactPhone || ""
                  }
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

            </div>
          </section>

          {/* ========================================
              PROGRAM INFORMATION
          ======================================== */}
          <section className="rounded-2xl bg-white p-6 shadow-sm">

            <h2 className="text-lg font-bold text-slate-900">
              Program Information
            </h2>

            <div className="mt-5 grid gap-5 md:grid-cols-3">

              {/* ENROLLMENT DATE */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Enrollment Date
                </label>

                <input
                  type="text"
                  value={
                    student.enrollmentDate
                      ? new Date(
                          student.enrollmentDate
                        ).toLocaleDateString()
                      : "Not available"
                  }
                  disabled
                  className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-500"
                />
              </div>

              {/* COMPLETION DATE */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Expected Completion
                </label>

                <input
                  type="text"
                  value={
                    student.expectedCompletionDate
                      ? new Date(
                          student.expectedCompletionDate
                        ).toLocaleDateString()
                      : "Not available"
                  }
                  disabled
                  className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-500"
                />
              </div>

              {/* STATUS */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Status
                </label>

                <input
                  type="text"
                  value={student.status || "Active"}
                  disabled
                  className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-500"
                />
              </div>

            </div>
          </section>

          {/* ========================================
              SAVE BUTTON
          ======================================== */}
          <div className="flex justify-end pb-8">

            <button
              type="submit"
              disabled={saving}
              className={`rounded-xl px-6 py-3 font-semibold text-white transition ${
                saving
                  ? "cursor-not-allowed bg-slate-400"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>

          </div>

        </form>
      </div>
    </div>
  );
}