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
  RotateCcw,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

const INITIAL_FORM = {
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
};

export default function StudentProfilePage() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [originalForm, setOriginalForm] = useState(INITIAL_FORM);

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
      setMessage("");

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

      if (!student) {
        throw new Error("Student profile was not returned.");
      }

      const profile = {
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
      };

      setForm(profile);
      setOriginalForm(profile);
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

    if (file.size === 0) {
      setError("The selected image is empty.");

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

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

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

      // Immediately show uploaded image.
      // It will be permanently saved when
      // Save Profile is clicked.
      setForm((previous) => ({
        ...previous,
        profileImage: data.imageUrl,
      }));

      setMessage(
        "Profile picture uploaded. Click Save Profile to keep the change."
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
  // CHECK WHETHER FORM HAS CHANGES
  // =====================================================

  const hasChanges =
    JSON.stringify(form) !==
    JSON.stringify(originalForm);

  // =====================================================
  // RESET CHANGES
  // =====================================================

  function handleReset() {
    setForm(originalForm);
    setMessage("Your unsaved changes have been reset.");
    setError("");
  }

  // =====================================================
  // VALIDATE FORM
  // =====================================================

  function validateForm() {
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();

    if (!firstName || !lastName) {
      return "First name and last name are required.";
    }

    if (form.phone.trim()) {
      const validPhone =
        /^[+0-9()\-\s]{7,20}$/.test(
          form.phone.trim()
        );

      if (!validPhone) {
        return "Please enter a valid phone number.";
      }
    }

    if (form.emergencyContactPhone.trim()) {
      const validEmergencyPhone =
        /^[+0-9()\-\s]{7,20}$/.test(
          form.emergencyContactPhone.trim()
        );

      if (!validEmergencyPhone) {
        return "Please enter a valid emergency contact phone number.";
      }
    }

    return "";
  }

  // =====================================================
  // SAVE PROFILE
  // =====================================================

  async function handleSubmit(event) {
    event.preventDefault();

    setMessage("");
    setError("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    if (uploading) {
      setError(
        "Please wait for the profile picture upload to finish."
      );
      return;
    }

    if (!hasChanges) {
      setMessage("There are no changes to save.");
      return;
    }

    try {
      setSaving(true);

      const cleanedForm = {
        ...form,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        dateOfBirth: form.dateOfBirth.trim(),
        gender: form.gender.trim(),
        program: form.program.trim(),
        educationLevel:
          form.educationLevel.trim(),
        school: form.school.trim(),
        address: form.address.trim(),
        emergencyContactName:
          form.emergencyContactName.trim(),
        emergencyContactPhone:
          form.emergencyContactPhone.trim(),
        profileImage: form.profileImage.trim(),
      };

      const response = await fetch(
        "/api/student/profile",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(cleanedForm),
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

      const updatedStudent = data.student;

      const updatedForm = {
        firstName:
          updatedStudent?.firstName ||
          cleanedForm.firstName,

        lastName:
          updatedStudent?.lastName ||
          cleanedForm.lastName,

        phone:
          updatedStudent?.phone ||
          cleanedForm.phone,

        dateOfBirth: updatedStudent?.dateOfBirth
          ? String(
              updatedStudent.dateOfBirth
            ).slice(0, 10)
          : cleanedForm.dateOfBirth,

        gender:
          updatedStudent?.gender ||
          cleanedForm.gender,

        program:
          updatedStudent?.program ||
          cleanedForm.program,

        educationLevel:
          updatedStudent?.educationLevel ||
          cleanedForm.educationLevel,

        school:
          updatedStudent?.school ||
          cleanedForm.school,

        address:
          updatedStudent?.address ||
          cleanedForm.address,

        emergencyContactName:
          updatedStudent?.emergencyContactName ||
          cleanedForm.emergencyContactName,

        emergencyContactPhone:
          updatedStudent?.emergencyContactPhone ||
          cleanedForm.emergencyContactPhone,

        profileImage:
          updatedStudent?.profileImage ||
          cleanedForm.profileImage,
      };

      setForm(updatedForm);
      setOriginalForm(updatedForm);

      setMessage(
        "Your profile has been saved successfully."
      );
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
  // PROFILE COMPLETION
  // =====================================================

  function getProfileCompletion() {
    const fields = [
      form.firstName,
      form.lastName,
      form.phone,
      form.dateOfBirth,
      form.gender,
      form.program,
      form.educationLevel,
      form.school,
      form.address,
      form.emergencyContactName,
      form.emergencyContactPhone,
      form.profileImage,
    ];

    const completed = fields.filter(
      (field) =>
        typeof field === "string" &&
        field.trim() !== ""
    ).length;

    return Math.round(
      (completed / fields.length) * 100
    );
  }

  const profileCompletion =
    getProfileCompletion();

  // =====================================================
  // LOADING STATE
  // =====================================================

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-6">
        <div className="rounded-2xl border border-slate-200 bg-white px-8 py-10 text-center shadow-sm">

          <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-blue-600" />

          <p className="mt-4 text-sm font-medium text-slate-700">
            Loading your profile...
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Please wait while we retrieve your information.
          </p>

        </div>
      </div>
    );
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 md:p-8">

      <div className="mx-auto max-w-5xl">

        {/* =================================================
            PAGE HEADER
        ================================================= */}

        <div className="mb-8">

          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

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

            {/* PROFILE COMPLETION */}

            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">

              <div className="flex items-center justify-between gap-6">

                <div>

                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Profile completion
                  </p>

                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {profileCompletion}%
                  </p>

                </div>

                <div className="h-12 w-12">

                  <div className="relative h-full w-full">

                    <svg
                      viewBox="0 0 36 36"
                      className="h-full w-full -rotate-90"
                    >

                      <path
                        d="M18 2.0845
                           a 15.9155 15.9155 0 0 1 0 31.831
                           a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="text-slate-200"
                      />

                      <path
                        d="M18 2.0845
                           a 15.9155 15.9155 0 0 1 0 31.831
                           a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeDasharray={`${profileCompletion}, 100`}
                        className="text-blue-600"
                      />

                    </svg>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </div>

        {/* =================================================
            STATUS MESSAGES
        ================================================= */}

        {message && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">

            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <span>{message}</span>

          </div>
        )}

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">

            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <span>{error}</span>

          </div>
        )}

        {/* =================================================
            PROFILE SECURITY NOTICE
        ================================================= */}

        <div className="mb-6 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">

          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

          <div>

            <p className="text-sm font-semibold text-blue-900">
              Your profile is private
            </p>

            <p className="mt-1 text-xs leading-5 text-blue-700">
              Only you can update your student profile through
              your authenticated account.
            </p>

          </div>

        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >

          {/* =================================================
              PROFILE PICTURE
          ================================================= */}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

            <div className="mb-6">

              <h2 className="text-lg font-semibold text-slate-900">
                Profile Picture
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Upload a JPG, PNG, or WebP image. Maximum 5MB.
              </p>

            </div>

            <div className="flex flex-col items-center gap-6 sm:flex-row">

              {/* IMAGE */}

              <div className="relative shrink-0">

                <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-slate-100 bg-slate-100 shadow-sm">

                  {form.profileImage ? (
                    <img
                      src={form.profileImage}
                      alt="Student profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserRound className="h-16 w-16 text-slate-400" />
                  )}

                </div>

                <div className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-green-500">
                  <UserCheck className="h-3.5 w-3.5 text-white" />
                </div>

              </div>

              {/* UPLOAD */}

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
                  disabled={uploading || saving}
                  className="block w-full cursor-pointer rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                />

                {uploading && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-blue-600">

                    <LoaderCircle className="h-4 w-4 animate-spin" />

                    Uploading picture...

                  </div>
                )}

                {!uploading &&
                  form.profileImage && (
                    <p className="mt-3 flex items-center gap-2 text-sm text-green-600">

                      <CheckCircle className="h-4 w-4" />

                      Profile picture ready to save.

                    </p>
                  )}

                {!uploading &&
                  !form.profileImage && (
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

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

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

              <FormField
                label="First Name"
                required
                icon={<UserRound className="h-5 w-5" />}
              >

                <input
                  type="text"
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  required
                  maxLength={80}
                  className={inputClass}
                  placeholder="First name"
                />

              </FormField>

              {/* LAST NAME */}

              <FormField
                label="Last Name"
                required
              >

                <input
                  type="text"
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  required
                  maxLength={80}
                  className={inputClass}
                  placeholder="Last name"
                />

              </FormField>

              {/* PHONE */}

              <FormField
                label="Phone Number"
                icon={<Phone className="h-5 w-5" />}
              >

                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  maxLength={30}
                  className={inputClassWithIcon}
                  placeholder="024 000 0000"
                />

              </FormField>

              {/* DATE OF BIRTH */}

              <FormField
                label="Date of Birth"
                icon={
                  <CalendarDays className="h-5 w-5" />
                }
              >

                <input
                  type="date"
                  name="dateOfBirth"
                  value={form.dateOfBirth}
                  onChange={handleChange}
                  className={inputClassWithIcon}
                />

              </FormField>

              {/* GENDER */}

              <FormField label="Gender">

                <select
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  className={inputClass}
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

              </FormField>

            </div>

          </section>

          {/* =================================================
              EDUCATION
          ================================================= */}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

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

              <FormField
                label="Program"
                icon={
                  <GraduationCap className="h-5 w-5" />
                }
              >

                <input
                  type="text"
                  name="program"
                  value={form.program}
                  onChange={handleChange}
                  maxLength={150}
                  className={inputClassWithIcon}
                  placeholder="e.g. Software Development"
                />

              </FormField>

              {/* EDUCATION LEVEL */}

              <FormField label="Education Level">

                <select
                  name="educationLevel"
                  value={form.educationLevel}
                  onChange={handleChange}
                  className={inputClass}
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

              </FormField>

              {/* SCHOOL */}

              <div className="md:col-span-2">

                <FormField
                  label="School / Institution"
                  icon={<School className="h-5 w-5" />}
                >

                  <input
                    type="text"
                    name="school"
                    value={form.school}
                    onChange={handleChange}
                    maxLength={200}
                    className={inputClassWithIcon}
                    placeholder="School or institution"
                  />

                </FormField>

              </div>

            </div>

          </section>

          {/* =================================================
              CONTACT INFORMATION
          ================================================= */}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

            <div className="mb-6">

              <h2 className="text-lg font-semibold text-slate-900">
                Contact Information
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Provide your contact and location details.
              </p>

            </div>

            <FormField
              label="Address"
              icon={<MapPin className="h-5 w-5" />}
            >

              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                maxLength={300}
                rows={4}
                className={`${inputClassWithIcon} resize-none`}
                placeholder="Your residential address"
              />

            </FormField>

          </section>

          {/* =================================================
              EMERGENCY CONTACT
          ================================================= */}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

            <div className="mb-6">

              <h2 className="text-lg font-semibold text-slate-900">
                Emergency Contact
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Provide someone we can contact when necessary.
              </p>

            </div>

            <div className="grid gap-5 md:grid-cols-2">

              <FormField label="Contact Name">

                <input
                  type="text"
                  name="emergencyContactName"
                  value={form.emergencyContactName}
                  onChange={handleChange}
                  maxLength={120}
                  className={inputClass}
                  placeholder="Full name"
                />

              </FormField>

              <FormField
                label="Contact Phone"
                icon={<Phone className="h-5 w-5" />}
              >

                <input
                  type="tel"
                  name="emergencyContactPhone"
                  value={form.emergencyContactPhone}
                  onChange={handleChange}
                  maxLength={30}
                  className={inputClassWithIcon}
                  placeholder="024 000 0000"
                />

              </FormField>

            </div>

          </section>

          {/* =================================================
              SAVE / RESET
          ================================================= */}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pb-8 pt-6 sm:flex-row sm:justify-end">

            {hasChanges && (
              <button
                type="button"
                onClick={handleReset}
                disabled={saving || uploading}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >

                <RotateCcw className="h-5 w-5" />

                Reset Changes

              </button>
            )}

            <button
              type="submit"
              disabled={
                saving ||
                uploading ||
                !hasChanges
              }
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
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

// =====================================================
// FORM FIELD
// =====================================================

function FormField({
  label,
  required = false,
  icon,
  children,
}) {
  return (
    <div>

      <label className="mb-2 block text-sm font-medium text-slate-700">

        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}

      </label>

      {icon ? (
        <div className="relative">

          <div className="pointer-events-none absolute left-3 top-3 text-slate-400">
            {icon}
          </div>

          {children}

        </div>
      ) : (
        children
      )}

    </div>
  );
}

// =====================================================
// INPUT STYLES
// =====================================================

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const inputClassWithIcon =
  "w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";