"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  Clock3,
  Mail,
  RefreshCw,
  UserCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";

export default function StudentRequestsPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Rejection modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // ---------------------------------------------------------
  // Load student applications
  // ---------------------------------------------------------

  const loadRequests = useCallback(
    async (showFullLoader = true) => {
      try {
        if (showFullLoader) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        setError("");

        // Check logged-in user
        const meResponse = await fetch("/api/auth/me", {
          cache: "no-store",
        });

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

        // Load pending applications
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
              data.message ||
              "Unable to load student applications."
          );
        }

        const applications =
          data.requests ||
          data.students ||
          data.applications ||
          [];

        setRequests(
          Array.isArray(applications)
            ? applications
            : []
        );
      } catch (err) {
        console.error(
          "Student Requests Error:",
          err
        );

        setError(
          err.message ||
            "Unable to load student applications."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router]
  );

  // ---------------------------------------------------------
  // Initial load
  // ---------------------------------------------------------

  useEffect(() => {
    loadRequests(true);
  }, [loadRequests]);

  // ---------------------------------------------------------
  // Automatically check for new applications
  // ---------------------------------------------------------

  useEffect(() => {
    const interval = setInterval(() => {
      loadRequests(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [loadRequests]);

  // ---------------------------------------------------------
  // Accept application
  // ---------------------------------------------------------

  async function handleAccept(request) {
    const userId =
      request.id || request._id;

    if (!userId) {
      setError(
        "This student application does not have a valid user ID. Please refresh the page and try again."
      );
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to accept ${request.name || "this student"}?`
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
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            action: "accept",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "Unable to approve this application."
        );
      }

      setMessage(
        data.message ||
          "Student application approved successfully."
      );

      await loadRequests(false);
    } catch (err) {
      console.error(
        "Student Accept Error:",
        err
      );

      setError(
        err.message ||
          "Unable to approve this student application."
      );
    } finally {
      setProcessingId(null);
    }
  }

  // ---------------------------------------------------------
  // Open rejection modal
  // ---------------------------------------------------------

  function openRejectModal(request) {
    const userId =
      request.id || request._id;

    if (!userId) {
      setError(
        "This student application does not have a valid user ID. Please refresh the page and try again."
      );
      return;
    }

    setError("");
    setMessage("");
    setSelectedRequest(request);
    setRejectionReason("");
    setShowRejectModal(true);
  }

  // ---------------------------------------------------------
  // Close rejection modal
  // ---------------------------------------------------------

  function closeRejectModal() {
    if (processingId) {
      return;
    }

    setShowRejectModal(false);
    setSelectedRequest(null);
    setRejectionReason("");
  }

  // ---------------------------------------------------------
  // Submit rejection
  // ---------------------------------------------------------

  async function handleReject() {
    if (!selectedRequest) {
      return;
    }

    const userId =
      selectedRequest.id ||
      selectedRequest._id;

    const reason =
      rejectionReason.trim();

    if (!reason) {
      setError(
        "Please provide a reason for rejecting the student application."
      );
      return;
    }

    if (reason.length > 1000) {
      setError(
        "The rejection reason must be 1000 characters or fewer."
      );
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
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            action: "reject",
            reason,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "Unable to reject this application."
        );
      }

      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectionReason("");

      setMessage(
        data.message ||
          "Student application rejected successfully."
      );

      await loadRequests(false);
    } catch (err) {
      console.error(
        "Student Reject Error:",
        err
      );

      setError(
        err.message ||
          "Unable to reject this student application."
      );
    } finally {
      setProcessingId(null);
    }
  }

  // ---------------------------------------------------------
  // Manual refresh
  // ---------------------------------------------------------

  async function handleRefresh() {
    setMessage("");
    setError("");
    await loadRequests(false);
  }

  // ---------------------------------------------------------
  // Loading screen
  // ---------------------------------------------------------

  if (!user || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <RefreshCw
            className="mx-auto mb-3 animate-spin text-slate-500"
            size={30}
          />

          <p className="text-slate-600">
            Loading student applications...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 md:p-8">
        <div className="mx-auto max-w-6xl">

          {/* -------------------------------------------------
              Header
          ------------------------------------------------- */}

          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <div className="rounded-xl bg-slate-900 p-3 text-white">
                  <Users size={24} />
                </div>

                <div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    Student Applications
                  </h1>

                  <p className="text-sm text-slate-500">
                    Review and manage student registrations.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={17}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </button>
          </div>

          {/* -------------------------------------------------
              Statistics
          ------------------------------------------------- */}

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Pending Applications
                  </p>

                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {requests.length}
                  </p>
                </div>

                <div className="rounded-lg bg-amber-50 p-3 text-amber-600">
                  <Clock3 size={22} />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Action Required
                  </p>

                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {requests.length}
                  </p>
                </div>

                <div className="rounded-lg bg-blue-50 p-3 text-blue-600">
                  <UserCheck size={22} />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Application Status
                  </p>

                  <p className="mt-1 text-sm font-semibold text-green-600">
                    Awaiting Review
                  </p>
                </div>

                <div className="rounded-lg bg-green-50 p-3 text-green-600">
                  <CheckCircle size={22} />
                </div>
              </div>
            </div>
          </div>

          {/* -------------------------------------------------
              Success Message
          ------------------------------------------------- */}

          {message && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              <CheckCircle
                size={18}
                className="mt-0.5 shrink-0"
              />

              <span>{message}</span>
            </div>
          )}

          {/* -------------------------------------------------
              Error Message
          ------------------------------------------------- */}

          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <XCircle
                size={18}
                className="mt-0.5 shrink-0"
              />

              <span>{error}</span>
            </div>
          )}

          {/* -------------------------------------------------
              Empty State
          ------------------------------------------------- */}

          {requests.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <Users
                  size={32}
                  className="text-slate-400"
                />
              </div>

              <h2 className="text-xl font-semibold text-slate-800">
                No Pending Applications
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                There are currently no student
                registrations waiting for
                facilitator approval.
              </p>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  size={17}
                  className={
                    refreshing
                      ? "animate-spin"
                      : ""
                  }
                />

                Check Again
              </button>
            </div>
          )}

          {/* -------------------------------------------------
              Pending Applications
          ------------------------------------------------- */}

          {requests.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              {/* Table Header */}

              <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-semibold text-slate-900">
                      Pending Registrations
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      Review each application and
                      decide whether the student
                      should be admitted.
                    </p>
                  </div>

                  <span className="w-fit shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                    {requests.length}{" "}
                    {requests.length === 1
                      ? "Application"
                      : "Applications"}
                  </span>
                </div>
              </div>

              {/* Application List */}

              <div className="divide-y divide-slate-200">
                {requests.map((request) => {
                  const requestId =
                    request.id ||
                    request._id;

                  const isProcessing =
                    processingId === requestId;

                  return (
                    <div
                      key={requestId}
                      className="p-4 transition hover:bg-slate-50 sm:p-6"
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                        {/* Student Information */}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-4">

                            <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 sm:flex">
                              <Users size={20} />
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="break-words text-lg font-semibold text-slate-900">
                                  {request.name ||
                                    "Unnamed Student"}
                                </h3>

                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                                  <Clock3 size={12} />
                                  Pending
                                </span>
                              </div>

                              {/* Email */}

                              {request.email && (
                                <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                                  <Mail
                                    size={15}
                                    className="shrink-0 text-slate-400"
                                  />

                                  <span className="break-all">
                                    {request.email}
                                  </span>
                                </div>
                              )}

                              {/* Program */}

                              {request.program && (
                                <p className="mt-2 text-sm text-slate-500">
                                  Program:{" "}
                                  <span className="font-medium text-slate-700">
                                    {request.program}
                                  </span>
                                </p>
                              )}

                              {/* Registration Date */}

                              {request.createdAt && (
                                <p className="mt-2 text-xs text-slate-400">
                                  Application submitted:{" "}
                                  {new Date(
                                    request.createdAt
                                  ).toLocaleDateString(
                                    undefined,
                                    {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    }
                                  )}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}

                        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">

                          {/* Accept */}

                          <button
                            type="button"
                            onClick={() =>
                              handleAccept(
                                request
                              )
                            }
                            disabled={
                              !requestId ||
                              isProcessing
                            }
                            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                          >
                            {isProcessing ? (
                              <RefreshCw
                                size={17}
                                className="animate-spin"
                              />
                            ) : (
                              <CheckCircle
                                size={17}
                              />
                            )}

                            {isProcessing
                              ? "Processing..."
                              : "Accept"}
                          </button>

                          {/* Reject */}

                          <button
                            type="button"
                            onClick={() =>
                              openRejectModal(
                                request
                              )
                            }
                            disabled={
                              !requestId ||
                              isProcessing
                            }
                            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-red-300 bg-white px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                          >
                            <XCircle size={17} />

                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* -------------------------------------------------
              Auto-refresh information
          ------------------------------------------------- */}

          <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-400">
            <RefreshCw size={13} />

            <span>
              Applications are automatically checked
              for updates every 30 seconds.
            </span>
          </div>
        </div>
      </div>

      {/* =====================================================
          REJECTION MODAL
      ===================================================== */}

      {showRejectModal &&
        selectedRequest && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (
                event.target === event.currentTarget &&
                !processingId
              ) {
                closeRejectModal();
              }
            }}
          >
            <div
              className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="reject-title"
            >
              {/* Modal Header */}

              <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
                <div>
                  <div className="mb-2 flex items-center gap-3">
                    <div className="rounded-lg bg-red-50 p-2.5 text-red-600">
                      <XCircle size={20} />
                    </div>

                    <h2
                      id="reject-title"
                      className="text-lg font-bold text-slate-900"
                    >
                      Reject Application
                    </h2>
                  </div>

                  <p className="text-sm text-slate-500">
                    You are rejecting the application
                    from{" "}
                    <span className="font-semibold text-slate-700">
                      {selectedRequest.name ||
                        "this student"}
                    </span>
                    .
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeRejectModal}
                  disabled={Boolean(processingId)}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Close rejection dialog"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content */}

              <div className="px-6 py-6">
                <label
                  htmlFor="rejection-reason"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Reason for rejection
                </label>

                <textarea
                  id="rejection-reason"
                  value={rejectionReason}
                  onChange={(event) =>
                    setRejectionReason(
                      event.target.value
                    )
                  }
                  maxLength={1000}
                  rows={5}
                  placeholder="Enter the reason for rejecting this application..."
                  disabled={Boolean(processingId)}
                  className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                />

                <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    This reason will be included in the
                    student's notification and email.
                  </span>

                  <span>
                    {rejectionReason.length}/1000
                  </span>
                </div>

                <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs leading-5 text-amber-800">
                    The student will receive an in-app
                    notification and an email explaining
                    that the application was not approved.
                  </p>
                </div>
              </div>

              {/* Modal Actions */}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeRejectModal}
                  disabled={Boolean(processingId)}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleReject}
                  disabled={
                    Boolean(processingId) ||
                    !rejectionReason.trim()
                  }
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {processingId ? (
                    <>
                      <RefreshCw
                        size={17}
                        className="animate-spin"
                      />
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <XCircle size={17} />
                      Reject Application
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
    </>
  );
}