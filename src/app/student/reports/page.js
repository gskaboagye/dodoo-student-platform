"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle,
  Send,
  ArrowLeft,
  Clock,
  MessageSquare,
  RefreshCw,
} from "lucide-react";

export default function ReportIssuePage() {
  const router = useRouter();

  const [form, setForm] = useState({
    title: "",
    category: "Academic",
    description: "",
    priority: "Normal",
  });

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingReports, setLoadingReports] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Load student's reports
  async function loadReports() {
    try {
      setLoadingReports(true);

      const response = await fetch("/api/reports", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to load your reports."
        );
      }

      setReports(data.reports || []);
    } catch (error) {
      console.error("LOAD REPORTS ERROR:", error);
      setError(error.message);
    } finally {
      setLoadingReports(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to submit your report."
        );
      }

      setMessage("Your issue has been reported successfully.");

      setForm({
        title: "",
        category: "Academic",
        description: "",
        priority: "Normal",
      });

      // Refresh reports so the new report appears immediately
      await loadReports();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  function getStatusStyle(status) {
    switch (status) {
      case "Resolved":
        return "bg-green-100 text-green-700";

      case "In Progress":
        return "bg-blue-100 text-blue-700";

      case "Closed":
        return "bg-slate-100 text-slate-700";

      default:
        return "bg-yellow-100 text-yellow-700";
    }
  }

  function getPriorityStyle(priority) {
    if (priority === "Urgent") {
      return "bg-red-100 text-red-700";
    }

    return "bg-slate-100 text-slate-700";
  }

  function formatDate(date) {
    if (!date) return "Unknown date";

    return new Date(date).toLocaleDateString("en-GH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">

        {/* Back */}
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        {/* Header */}
        <div className="mb-8">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            <AlertCircle size={26} />
          </div>

          <h1 className="text-3xl font-bold text-slate-900">
            Report an Issue
          </h1>

          <p className="mt-2 text-slate-600">
            Let us know about any academic, technical, personal,
            or other issue you are experiencing.
          </p>
        </div>

        {/* Success */}
        {message && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">
            <CheckCircle
              className="mt-0.5 shrink-0"
              size={20}
            />

            <p>{message}</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {/* Report Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
        >
          {/* Title */}
          <div className="mb-6">
            <label
              htmlFor="title"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Issue Title
            </label>

            <input
              id="title"
              name="title"
              type="text"
              value={form.title}
              onChange={handleChange}
              placeholder="Example: I need help with my assignment"
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Category */}
          <div className="mb-6">
            <label
              htmlFor="category"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Issue Category
            </label>

            <select
              id="category"
              name="category"
              value={form.category}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="Academic">Academic</option>
              <option value="Attendance">Attendance</option>
              <option value="Technical">
                Technical / Website
              </option>
              <option value="Course">Course / Training</option>
              <option value="Mentor">
                Mentor / Facilitator
              </option>
              <option value="Personal">Personal</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Priority */}
          <div className="mb-6">
            <label
              htmlFor="priority"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Priority
            </label>

            <select
              id="priority"
              name="priority"
              value={form.priority}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="Normal">Normal</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>

          {/* Description */}
          <div className="mb-6">
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Describe the Issue
            </label>

            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Please explain what happened and what kind of help you need..."
              rows={7}
              required
              className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send size={18} />

            {loading ? "Submitting..." : "Submit Report"}
          </button>
        </form>

        {/* My Reports */}
        <section className="mt-10">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                My Reports
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                Track the issues you have reported.
              </p>
            </div>

            <button
              type="button"
              onClick={loadReports}
              disabled={loadingReports}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loadingReports ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>

          {loadingReports ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
              <Clock
                size={24}
                className="mx-auto mb-3 animate-pulse text-blue-600"
              />

              <p className="text-sm text-slate-500">
                Loading your reports...
              </p>
            </div>
          ) : reports.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <MessageSquare
                size={32}
                className="mx-auto mb-3 text-slate-400"
              />

              <h3 className="font-semibold text-slate-800">
                No reports yet
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Any issues you submit will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div
                  key={report._id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  {/* Report Header */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {report.title}
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Submitted {formatDate(report.createdAt)}
                      </p>
                    </div>

                    <span
                      className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(
                        report.status
                      )}`}
                    >
                      {report.status || "Open"}
                    </span>
                  </div>

                  {/* Category / Priority */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                      {report.category}
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${getPriorityStyle(
                        report.priority
                      )}`}
                    >
                      {report.priority} Priority
                    </span>
                  </div>

                  {/* Description */}
                  <div className="mt-4 rounded-xl bg-slate-50 p-4">
                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {report.description}
                    </p>
                  </div>

                  {/* Facilitator Response */}
                  {report.response && (
                    <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
                      <div className="mb-2 flex items-center gap-2 font-semibold text-blue-800">
                        <MessageSquare size={17} />
                        Facilitator Response
                      </div>

                      <p className="whitespace-pre-wrap text-sm leading-6 text-blue-900">
                        {report.response}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Privacy Note */}
        <p className="mt-6 text-center text-sm text-slate-500">
          Your reports are private and can only be viewed by you
          and authorized facilitators.
        </p>
      </div>
    </main>
  );
}