"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Trash2,
  MessageSquare,
  User,
} from "lucide-react";

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Used to clear the response textbox after saving.
  const [clearResponse, setClearResponse] = useState({});

  // ---------------------------------------------------------
  // LOAD REPORTS
  // ---------------------------------------------------------

  async function loadReports() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/reports", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to load reports."
        );
      }

      setReports(data.reports || []);
    } catch (error) {
      console.error("LOAD REPORTS ERROR:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  // ---------------------------------------------------------
  // UPDATE REPORT
  // ---------------------------------------------------------

  async function updateReport(id, status, responseText) {
    try {
      setUpdating(id);
      setError("");
      setMessage("");

      const response = await fetch("/api/reports", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          status,
          response: responseText,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to update report."
        );
      }

      // Keep the saved response and date in the report data.
      if (data.report) {
        setReports((currentReports) =>
          currentReports.map((report) =>
            report._id === id
              ? {
                  ...report,
                  ...data.report,
                  _id: id,
                }
              : report
          )
        );
      }

      // Clear only the editable response textbox.
      setClearResponse((previous) => ({
        ...previous,
        [id]: Date.now(),
      }));

      setMessage("Report updated successfully.");
    } catch (error) {
      console.error("UPDATE REPORT ERROR:", error);
      setError(error.message);
    } finally {
      setUpdating(null);
    }
  }

  // ---------------------------------------------------------
  // DELETE REPORT
  // ---------------------------------------------------------

  async function deleteReport(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this report?"
    );

    if (!confirmed) return;

    try {
      setUpdating(id);
      setError("");
      setMessage("");

      const response = await fetch("/api/reports", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to delete report."
        );
      }

      setReports((currentReports) =>
        currentReports.filter(
          (report) => report._id !== id
        )
      );

      setMessage("Report deleted successfully.");
    } catch (error) {
      console.error("DELETE REPORT ERROR:", error);
      setError(error.message);
    } finally {
      setUpdating(null);
    }
  }

  // ---------------------------------------------------------
  // DATE
  // ---------------------------------------------------------

  function formatDate(date) {
    if (!date) return "Unknown date";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Unknown date";
    }

    return parsedDate.toLocaleDateString("en-GH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  // ---------------------------------------------------------
  // STATUS STYLE
  // ---------------------------------------------------------

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

  // ---------------------------------------------------------
  // PRIORITY STYLE
  // ---------------------------------------------------------

  function getPriorityStyle(priority) {
    if (priority === "Urgent") {
      return "bg-red-100 text-red-700";
    }

    return "bg-slate-100 text-slate-700";
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-8">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            <AlertCircle size={26} />
          </div>

          <h1 className="text-3xl font-bold text-slate-900">
            Student Reports
          </h1>

          <p className="mt-2 text-slate-600">
            Review and respond to issues submitted by students.
          </p>
        </div>

        {/* Success Message */}
        {message && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">
            <CheckCircle size={20} />
            <p>{message}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {/* Refresh */}
        <div className="mb-6 flex justify-end">
          <button
            type="button"
            onClick={loadReports}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={loading ? "animate-spin" : ""}
            />
            Refresh Reports
          </button>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <Clock
              size={30}
              className="mx-auto mb-3 animate-pulse text-blue-600"
            />

            <p className="text-slate-500">
              Loading student reports...
            </p>
          </div>
        ) : reports.length === 0 ? (

          /* Empty State */
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <MessageSquare
              size={38}
              className="mx-auto mb-3 text-slate-400"
            />

            <h2 className="text-lg font-semibold text-slate-800">
              No student reports
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Student issues will appear here when they are
              submitted.
            </p>
          </div>

        ) : (

          /* Reports */
          <div className="space-y-6">
            {reports.map((report) => (
              <ReportCard
                key={report._id}
                report={report}
                updating={updating}
                onUpdate={updateReport}
                onDelete={deleteReport}
                formatDate={formatDate}
                getStatusStyle={getStatusStyle}
                getPriorityStyle={getPriorityStyle}
                clearResponse={clearResponse[report._id]}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

// =========================================================
// REPORT CARD
// =========================================================

function ReportCard({
  report,
  updating,
  onUpdate,
  onDelete,
  formatDate,
  getStatusStyle,
  getPriorityStyle,
  clearResponse,
}) {
  const [status, setStatus] = useState(
    report.status || "Open"
  );

  // This is only the text currently being typed.
  // It will be cleared after saving.
  const [response, setResponse] = useState("");

  // ---------------------------------------------------------
  // Keep local status synchronized with the report.
  // ---------------------------------------------------------

  useEffect(() => {
    setStatus(report.status || "Open");
  }, [report.status]);

  // ---------------------------------------------------------
  // CLEAR RESPONSE TEXTBOX AFTER SUCCESSFUL SAVE
  // ---------------------------------------------------------

  useEffect(() => {
    if (clearResponse) {
      setResponse("");
    }
  }, [clearResponse]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

      {/* =====================================================
          REPORT HEADER
      ===================================================== */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {report.title}
          </h2>

          {/* Student Information */}
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <User size={17} />
              Student
            </div>

            <p className="mt-2 text-sm font-semibold text-slate-900">
              {report.studentName || "Student"}
            </p>

            {report.studentEmail && (
              <p className="mt-1 text-sm text-slate-500">
                {report.studentEmail}
              </p>
            )}

            <p className="mt-1 text-xs text-slate-500">
              Submitted {formatDate(report.createdAt)}
            </p>
          </div>
        </div>

        {/* Report Badges */}
        <div className="flex flex-wrap gap-2">

          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(
              report.status
            )}`}
          >
            {report.status || "Open"}
          </span>

          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${getPriorityStyle(
              report.priority
            )}`}
          >
            {report.priority || "Normal"} Priority
          </span>

          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            {report.category}
          </span>
        </div>
      </div>

      {/* =====================================================
          STUDENT DESCRIPTION
      ===================================================== */}

      <div className="mt-5 rounded-xl bg-slate-50 p-5">
        <h3 className="mb-2 text-sm font-semibold text-slate-700">
          Student's Description
        </h3>

        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
          {report.description}
        </p>
      </div>

      {/* =====================================================
          FACILITATOR CONTROLS
      ===================================================== */}

      <div className="mt-6 grid gap-5 lg:grid-cols-2">

        {/* Status */}
        <div>
          <label
            htmlFor={`status-${report._id}`}
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Update Status
          </label>

          <select
            id={`status-${report._id}`}
            value={status}
            onChange={(event) =>
              setStatus(event.target.value)
            }
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
        </div>

        {/* Response */}
        <div>
          <label
            htmlFor={`response-${report._id}`}
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Response to Student
          </label>

          <textarea
            id={`response-${report._id}`}
            value={response}
            onChange={(event) =>
              setResponse(event.target.value)
            }
            rows={5}
            placeholder="Write a response or guidance for the student..."
            className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          <p className="mt-2 text-xs text-slate-500">
            This response will be visible to the student after
            you save the changes.
          </p>
        </div>
      </div>

      {/* =====================================================
          SAVED RESPONSE
          
          Only the saved response and date are displayed here.
      ===================================================== */}

      {report.response && (
        <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-5">
          <h3 className="mb-3 text-sm font-semibold text-green-800">
            Saved Response
          </h3>

          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {report.response}
          </p>

          <p className="mt-4 text-xs text-slate-500">
            Date: {formatDate(report.respondedAt)}
          </p>
        </div>
      )}

      {/* =====================================================
          ACTIONS
      ===================================================== */}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">

        {/* Delete */}
        <button
          type="button"
          onClick={() => onDelete(report._id)}
          disabled={updating === report._id}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          <Trash2 size={17} />
          Delete
        </button>

        {/* Save */}
        <button
          type="button"
          onClick={() =>
            onUpdate(
              report._id,
              status,
              response
            )
          }
          disabled={updating === report._id}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <CheckCircle size={17} />

          {updating === report._id
            ? "Saving..."
            : "Save Changes"}
        </button>
      </div>
    </div>
  );
}