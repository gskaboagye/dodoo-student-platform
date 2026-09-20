"use client";

import { useEffect, useState } from "react";
import {
  UserRound,
  Phone,
  CalendarDays,
  GraduationCap,
  School,
  MapPin,
  Save,
  LoaderCircle,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

export default function StudentProfilePage() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    program: "",
    educationLevel: "",
    school: "",
    address: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    profileImage: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // =====================================================
  // LOAD PROFILE
  // =====================================================

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
          data.error ||
            data.message ||
            "Unable to load profile."
        );
      }

      const student = data.student;

      setForm({
        firstName: student.firstName || "",
        lastName: student.lastName || "",
        phone: student.phone || "",
        dateOfBirth: student.dateOfBirth
          ? String(student.dateOfBirth).slice(0, 10)
          : "",
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
      });
    } catch (err) {
      console.error("PROFILE LOAD ERROR:", err);

      setError(
        err.message || "Unable to load profile."
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // HANDLE FORM CHANGES
  // =====================================================

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setMessage("");
    setError("");
  }

  // =====================================================
  // HANDLE PROFILE IMAGE UPLOAD
  // =====================================================

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
      setError(
        "Only JPG, PNG, and WebP images are allowed."
      );

      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5MB.");

      event.target.value = "";
      return;
    }

    if (file.size === 0) {
      setError("The selected image is empty.");

      event.target.value = "";
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("file", file);

      console.log(
        "================================"
      );
      console.log(
        "STARTING PROFILE IMAGE UPLOAD"
      );
      console.log("File:", file.name);
      console.log("Type:", file.type);
      console.log("Size:", file.size);
      console.log(
        "================================"
      );

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      console.log("UPLOAD RESPONSE:", data);

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            "Image upload failed."
        );
      }

      if (!data.imageUrl) {
        throw new Error(
          "Upload completed but no image URL was returned."
        );
      }

      // Immediately display uploaded image
      setForm((previous) => ({
        ...previous,
        profileImage: data.imageUrl,
      }));

      setMessage(
        "Profile picture uploaded successfully. Click Save Profile to keep the change."
      );
    } catch (err) {
      console.error(
        "PROFILE IMAGE UPLOAD ERROR:",
        err
      );

      setError(
        err.message ||
          "Failed to upload profile picture."
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  // =====================================================
  // SAVE PROFILE
  // =====================================================

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setMessage("");
      setError("");

      const response = await fetch(
        "/api/student/profile",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "Unable to save profile."
        );
      }

      setMessage(
        "Your profile has been saved successfully."
      );

      await loadProfile();
    } catch (err) {
      console.error(
        "PROFILE SAVE ERROR:",
        err
      );

      setError(
        err.message ||
          "Unable to save profile."
      );
    } finally {
      setSaving(false);
    }
  }

  // =====================================================
  // LOADING STATE
  // =====================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center p-10">
        <div className="flex items-center gap-3 text-slate-500">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Loading your profile...
        </div>
      </div>
    );
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-5xl">

        {/* =================================================
            PAGE HEADER
        ================================================= */}

        <div className="mb-8">
          <div className="flex items-center gap-3">

            <div className="rounded-xl bg-blue-100 p-3 text-blue-600">
              <UserRound className="h-6 w-6" />
            </div>

            <div>

              <h1 className="text-2xl font-bold text-slate-900">
                My Student Profile
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Manage your personal and education information.
              </p>

            </div>

          </div>
        </div>

        {/* =================================================
            SUCCESS MESSAGE
        ================================================= */}

        {message && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">

            <CheckCircle className="h-5 w-5 shrink-0" />

            {message}

          </div>
        )}

        {/* =================================================
            ERROR MESSAGE
        ================================================= */}

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">

            <AlertCircle className="h-5 w-5 shrink-0" />

            {error}

          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >

          {/* =================================================
              PROFILE PICTURE UPLOAD
          ================================================= */}

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="mb-6">

              <h2 className="text-lg font-semibold text-slate-900">
                Update Profile Picture
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Upload a JPG, PNG, or WebP image. Maximum 5MB.
              </p>

            </div>

            <div className="flex flex-col items-center gap-6 sm:flex-row">

              {/* CURRENT IMAGE PREVIEW */}

              <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-slate-100 bg-slate-100 shadow-sm">

                {form.profileImage ? (
                  <img
                    src={form.profileImage}
                    alt="Current student profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserRound className="h-14 w-14 text-slate-400" />
                )}

              </div>

              {/* UPLOAD CONTROL */}

              <div className="w-full">

                <label
                  htmlFor="profile-picture"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Choose a new profile picture
                </label>

                <input
                  id="profile-picture"
                  name="profile-picture"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="block w-full cursor-pointer rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                />

                {uploading && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-blue-600">

                    <LoaderCircle className="h-4 w-4 animate-spin" />

                    Uploading picture...

                  </div>
                )}

                {!uploading && form.profileImage && (
                  <p className="mt-3 flex items-center gap-2 text-sm text-green-600">

                    <CheckCircle className="h-4 w-4" />

                    Profile picture ready.

                  </p>
                )}

                {!uploading && !form.profileImage && (
                  <p className="mt-3 text-xs text-slate-500">
                    Choose an image from your computer.
                  </p>
                )}

              </div>

            </div>

          </section>

          {/* =================================================
              PERSONAL INFORMATION
          ================================================= */}

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="mb-6">

              <h2 className="text-lg font-semibold text-slate-900">
                Personal Information
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Enter your basic personal information.
              </p>

            </div>

            <div className="grid gap-5 md:grid-cols-2">

              {/* FIRST NAME */}

              <div>

                <label className="mb-2 block text-sm font-medium text-slate-700">
                  First Name
                </label>

                <div className="relative">

                  <UserRound className="absolute left-3 top-3 h-5 w-5 text-slate-400" />

                  <input
                    type="text"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="First name"
                  />

                </div>

              </div>

              {/* LAST NAME */}

              <div>

                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Last Name
                </label>

                <input
                  type="text"
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Last name"
                />

              </div>

              {/* PHONE */}

              <div>

                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Phone Number
                </label>

                <div className="relative">

                  <Phone className="absolute left-3 top-3 h-5 w-5 text-slate-400" />

                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="024 000 0000"
                  />

                </div>

              </div>

              {/* DATE OF BIRTH */}

              <div>

                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Date of Birth
                </label>

                <div className="relative">

                  <CalendarDays className="absolute left-3 top-3 h-5 w-5 text-slate-400" />

                  <input
                    type="date"
                    name="dateOfBirth"
                    value={form.dateOfBirth}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                </div>

              </div>

              {/* GENDER */}

              <div>

                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Gender
                </label>

                <select
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >

                  <option value="">
                    Select gender
                  </option>

                  <option value="Male">
                    Male
                  </option>

                  <option value="Female">
                    Female
                  </option>

                  <option value="Prefer not to say">
                    Prefer not to say
                  </option>

                </select>

              </div>

            </div>

          </section>

          {/* =================================================
              EDUCATION
          ================================================= */}

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="mb-6">

              <h2 className="text-lg font-semibold text-slate-900">
                Education Information
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Tell us about your current education.
              </p>

            </div>

            <div className="grid gap-5 md:grid-cols-2">

              {/* PROGRAM */}

              <div>

                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Program
                </label>

                <div className="relative">

                  <GraduationCap className="absolute left-3 top-3 h-5 w-5 text-slate-400" />

                  <input
                    type="text"
                    name="program"
                    value={form.program}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="e.g. Software Development"
                  />

                </div>

              </div>

              {/* EDUCATION LEVEL */}

              <div>

                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Education Level
                </label>

                <select
                  name="educationLevel"
                  value={form.educationLevel}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >

                  <option value="">
                    Select level
                  </option>

                  <option value="Junior High School">
                    Junior High School
                  </option>

                  <option value="Senior High School">
                    Senior High School
                  </option>

                  <option value="University">
                    University
                  </option>

                  <option value="Tertiary">
                    Tertiary
                  </option>

                  <option value="Other">
                    Other
                  </option>

                </select>

              </div>

              {/* SCHOOL */}

              <div className="md:col-span-2">

                <label className="mb-2 block text-sm font-medium text-slate-700">
                  School / Institution
                </label>

                <div className="relative">

                  <School className="absolute left-3 top-3 h-5 w-5 text-slate-400" />

                  <input
                    type="text"
                    name="school"
                    value={form.school}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="School or institution"
                  />

                </div>

              </div>

            </div>

          </section>

          {/* =================================================
              CONTACT
          ================================================= */}

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="mb-6">

              <h2 className="text-lg font-semibold text-slate-900">
                Contact Information
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Provide your contact and location details.
              </p>

            </div>

            <div>

              <label className="mb-2 block text-sm font-medium text-slate-700">
                Address
              </label>

              <div className="relative">

                <MapPin className="absolute left-3 top-3 h-5 w-5 text-slate-400" />

                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  rows="3"
                  className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Your residential address"
                />

              </div>

            </div>

          </section>

          {/* =================================================
              EMERGENCY CONTACT
          ================================================= */}

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="mb-6">

              <h2 className="text-lg font-semibold text-slate-900">
                Emergency Contact
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Provide someone we can contact when necessary.
              </p>

            </div>

            <div className="grid gap-5 md:grid-cols-2">

              {/* CONTACT NAME */}

              <div>

                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Contact Name
                </label>

                <input
                  type="text"
                  name="emergencyContactName"
                  value={form.emergencyContactName}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Full name"
                />

              </div>

              {/* CONTACT PHONE */}

              <div>

                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Contact Phone
                </label>

                <input
                  type="tel"
                  name="emergencyContactPhone"
                  value={form.emergencyContactPhone}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="024 000 0000"
                />

              </div>

            </div>

          </section>

          {/* =================================================
              SAVE BUTTON
          ================================================= */}

          <div className="flex justify-end pb-8">

            <button
              type="submit"
              disabled={saving || uploading}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >

              {saving ? (
                <>
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Save Profile
                </>
              )}

            </button>

          </div>

        </form>

      </div>
    </div>
  );
}