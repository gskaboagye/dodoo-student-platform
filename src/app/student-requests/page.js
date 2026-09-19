"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  Users,
} from "lucide-react";

export default function StudentRequestsPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadRequests() {
    try {
      setLoading(true);
      setError("");

      const meResponse = await fetch(
        "/api/auth/me",
        {
          cache: "no-store",
        }
      );

      if (!meResponse.ok) {
        router.replace("/login");
        return;
      }

      const meData = await meResponse.json();

      if (meData.user?.role !== "facilitator") {
        router.replace("/");
        return;
      }

      setUser(meData.user);

      const response = await fetch(
        "/api/student-requests",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to load student requests."
        );
      }

      setRequests(data.requests || []);
    } catch (err) {
      console.error(
        "Student Requests Error:",
        err
      );

      setError(
        err.message ||
          "Unable to load student requests."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  async function handleAction(userId, action) {
    const actionText =
      action === "accept"
        ? "accept this student"
        : "reject this student";

    const confirmed = window.confirm(
      `Are you sure you want to ${actionText}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setProcessingId(userId);
      setError("");
      setMessage("");

      const response = await fetch(
        "/api/student-requests",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            userId,
            action,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to process request."
        );
      }

      setMessage(
        data.message ||
          "Request processed successfully."
      );

      await loadRequests();
    } catch (err) {
      console.error(
        "Student Request Action Error:",
        err
      );

      setError(
        err.message ||
          "Unable to process request."
      );
    } finally {
      setProcessingId(null);
    }
  }

  if (!user || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <RefreshCw
            className="mx-auto mb-3 animate-spin text-slate-500"
            size={30}
          />
          <p className="text-slate-600">
            Loading student requests...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <div className="rounded-xl bg-slate-900 p-3 text-white">
                <Users size={24} />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Student Requests
                </h1>

                <p className="text-sm text-slate-500">
                  Review and approve student registrations.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={loadRequests}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={17}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />
            Refresh
          </button>
        </div>

        {/* Success Message */}
        {message && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {message}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Empty State */}
        {!loading && requests.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <Users
              size={48}
              className="mx-auto mb-4 text-slate-300"
            />

            <h2 className="text-xl font-semibold text-slate-800">
              No Pending Requests
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              There are currently no student
              registrations waiting for approval.
            </p>
          </div>
        )}

        {/* Requests */}
        {requests.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">
                  Pending Registrations
                </h2>

                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                  {requests.length}{" "}
                  {requests.length === 1
                    ? "Request"
                    : "Requests"}
                </span>
              </div>
            </div>

            <div className="divide-y divide-slate-200">
              {requests.map((request) => (
                <div
                  key={request._id}
                  className="p-6"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                    {/* Student Information */}
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {request.name}
                      </h3>

                      <p className="mt-1 text-sm text-slate-600">
                        {request.email}
                      </p>

                      {request.program && (
                        <p className="mt-1 text-sm text-slate-500">
                          Program:{" "}
                          <span className="font-medium text-slate-700">
                            {request.program}
                          </span>
                        </p>
                      )}

                      {request.createdAt && (
                        <p className="mt-2 text-xs text-slate-400">
                          Registered:{" "}
                          {new Date(
                            request.createdAt
                          ).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        onClick={() =>
                          handleAction(
                            request._id,
                            "accept"
                          )
                        }
                        disabled={
                          processingId ===
                          request._id
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <CheckCircle size={17} />

                        {processingId ===
                        request._id
                          ? "Processing..."
                          : "Accept"}
                      </button>

                      <button
                        onClick={() =>
                          handleAction(
                            request._id,
                            "reject"
                          )
                        }
                        disabled={
                          processingId ===
                          request._id
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-300 bg-white px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <XCircle size={17} />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}