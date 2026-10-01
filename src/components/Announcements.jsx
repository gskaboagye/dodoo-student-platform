"use client";

import { useEffect, useState } from "react";

import {
  Bell,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  Megaphone,
  Loader2,
  CalendarDays,
} from "lucide-react";

export default function Announcements({ role }) {
  /*
   * Normalize the role so values such as:
   * facilitator
   * Facilitator
   * FACILITATOR
   *
   * are all treated as the facilitator role.
   */
  const normalizedRole = String(role || "")
    .trim()
    .toLowerCase();

  const isFacilitator = normalizedRole === "facilitator";

  const [announcements, setAnnouncements] = useState([]);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] = useState(null);

  const [showForm, setShowForm] = useState(false);

  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    title: "",
    message: "",
  });

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [deleteId, setDeleteId] = useState(null);

  // =========================================================
  // LOAD ANNOUNCEMENTS
  // =========================================================

  async function loadAnnouncements() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/announcements", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || "Unable to load announcements."
        );
      }

      setAnnouncements(
        Array.isArray(data?.announcements)
          ? data.announcements
          : []
      );
    } catch (error) {
      console.error(
        "LOAD ANNOUNCEMENTS ERROR:",
        error
      );

      setError(
        error.message ||
          "Unable to load announcements."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnnouncements();
  }, []);

  // =========================================================
  // OPEN CREATE FORM
  // =========================================================

  function openCreateForm() {
    // Extra protection on the client.
    if (!isFacilitator) {
      return;
    }

    setEditingId(null);

    setForm({
      title: "",
      message: "",
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  }

  // =========================================================
  // OPEN EDIT FORM
  // =========================================================

  function openEditForm(announcement) {
    // Extra protection on the client.
    if (!isFacilitator) {
      return;
    }

    setEditingId(announcement.id);

    setForm({
      title: announcement.title || "",
      message: announcement.message || "",
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  }

  // =========================================================
  // CLOSE FORM
  // =========================================================

  function closeForm() {
    if (saving) {
      return;
    }

    setShowForm(false);
    setEditingId(null);

    setForm({
      title: "",
      message: "",
    });

    setError("");
  }

  // =========================================================
  // HANDLE INPUT
  // =========================================================

  function handleChange(event) {
    const {
      name,
      value,
    } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  // =========================================================
  // SAVE ANNOUNCEMENT
  // =========================================================

  async function handleSubmit(event) {
    event.preventDefault();

    // Only facilitators are allowed to create/update.
    if (!isFacilitator) {
      setError(
        "You are not authorized to manage announcements."
      );

      return;
    }

    setError("");
    setSuccess("");

    const title = form.title.trim();

    const message = form.message.trim();

    if (!title || !message) {
      setError(
        "Title and message are required."
      );

      return;
    }

    try {
      setSaving(true);

      const method = editingId
        ? "PUT"
        : "POST";

      const body = editingId
        ? {
            id: editingId,
            title,
            message,
          }
        : {
            title,
            message,
          };

      const response = await fetch(
        "/api/announcements",
        {
          method,
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Unable to save announcement."
        );
      }

      setSuccess(
        editingId
          ? "Announcement updated successfully."
          : "Announcement published successfully."
      );

      setShowForm(false);
      setEditingId(null);

      setForm({
        title: "",
        message: "",
      });

      await loadAnnouncements();
    } catch (error) {
      console.error(
        "SAVE ANNOUNCEMENT ERROR:",
        error
      );

      setError(
        error.message ||
          "Unable to save announcement."
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================================================
  // DELETE ANNOUNCEMENT
  // =========================================================

  async function handleDelete(id) {
    // Only facilitators are allowed to delete.
    if (!isFacilitator) {
      setError(
        "You are not authorized to delete announcements."
      );

      return;
    }

    setError("");
    setSuccess("");

    try {
      setDeletingId(id);

      const response = await fetch(
        "/api/announcements",
        {
          method: "DELETE",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Unable to delete announcement."
        );
      }

      setSuccess(
        "Announcement deleted successfully."
      );

      setDeleteId(null);

      await loadAnnouncements();
    } catch (error) {
      console.error(
        "DELETE ANNOUNCEMENT ERROR:",
        error
      );

      setError(
        error.message ||
          "Unable to delete announcement."
      );
    } finally {
      setDeletingId(null);
    }
  }

  // =========================================================
  // FORMAT DATE
  // =========================================================

  function formatDate(date) {
    if (!date) {
      return "";
    }

    const parsedDate = new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return "";
    }

    return parsedDate.toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
      }
    );
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <section className="px-4 py-5">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="mb-4 flex items-center justify-between gap-3">

        <div className="flex min-w-0 items-center gap-3">

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Bell size={18} />
          </div>

          <div className="min-w-0">

            <h2 className="truncate text-sm font-bold text-slate-800">
              Announcements
            </h2>

            <p className="text-xs text-slate-400">
              Latest DCC updates
            </p>

          </div>

        </div>

        {/* =================================================
            ADD BUTTON
            FACILITATOR ONLY
        ================================================= */}

        {isFacilitator && (
          <button
            type="button"
            onClick={openCreateForm}
            title="Create announcement"
            aria-label="Create announcement"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white transition hover:bg-blue-700"
          >
            <Plus size={17} />
          </button>
        )}

      </div>

      {/* =====================================================
          SUCCESS MESSAGE
      ===================================================== */}

      {success && (
        <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
          {success}
        </div>
      )}

      {/* =====================================================
          ERROR MESSAGE
      ===================================================== */}

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      {/* =====================================================
          CREATE / EDIT FORM
          FACILITATOR ONLY
      ===================================================== */}

      {isFacilitator && showForm && (
        <div className="mb-4 rounded-xl border border-blue-100 bg-white p-4 shadow-sm">

          <div className="mb-4 flex items-center justify-between">

            <div className="flex items-center gap-2">

              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Megaphone size={16} />
              </div>

              <div>

                <h3 className="text-sm font-bold text-slate-800">
                  {editingId
                    ? "Edit Announcement"
                    : "Create Announcement"}
                </h3>

                <p className="text-xs text-slate-400">
                  {editingId
                    ? "Update this DCC announcement."
                    : "Publish an update for students."}
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={closeForm}
              disabled={saving}
              aria-label="Close announcement form"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={16} />
            </button>

          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-3"
          >

            {/* TITLE */}

            <div>

              <label
                htmlFor="announcement-title"
                className="mb-1.5 block text-xs font-semibold text-slate-700"
              >
                Title
              </label>

              <input
                id="announcement-title"
                name="title"
                type="text"
                value={form.title}
                onChange={handleChange}
                maxLength={150}
                placeholder="Announcement title"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                disabled={saving}
              />

            </div>

            {/* MESSAGE */}

            <div>

              <label
                htmlFor="announcement-message"
                className="mb-1.5 block text-xs font-semibold text-slate-700"
              >
                Message
              </label>

              <textarea
                id="announcement-message"
                name="message"
                value={form.message}
                onChange={handleChange}
                maxLength={2000}
                rows={4}
                placeholder="Write your announcement..."
                className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                disabled={saving}
              />

            </div>

            {/* FORM BUTTONS */}

            <div className="flex gap-2 pt-1">

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >

                {saving ? (
                  <>
                    <Loader2
                      size={15}
                      className="animate-spin"
                    />

                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={15} />

                    {editingId
                      ? "Save Changes"
                      : "Publish"}
                  </>
                )}

              </button>

            </div>

          </form>

        </div>
      )}

      {/* =====================================================
          LOADING
      ===================================================== */}

      {loading ? (

        <div className="flex items-center justify-center py-8 text-slate-400">
          <Loader2
            size={20}
            className="animate-spin"
          />
        </div>

      ) : announcements.length === 0 ? (

        /* ===================================================
           EMPTY STATE
        =================================================== */

        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-7 text-center">

          <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
            <Bell size={17} />
          </div>

          <p className="text-xs font-semibold text-slate-600">
            No announcements yet
          </p>

          {/* Facilitator-only helper text */}

          {isFacilitator && (
            <p className="mt-1 text-xs text-slate-400">
              Click the + button to
              publish an announcement.
            </p>
          )}

        </div>

      ) : (

        /* ===================================================
           ANNOUNCEMENT LIST
        =================================================== */

        <div className="space-y-3">

          {announcements.map(
            (announcement) => (

              <article
                key={announcement.id}
                className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-blue-100"
              >

                <div className="flex items-start gap-3">

                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Megaphone size={15} />
                  </div>

                  <div className="min-w-0 flex-1">

                    <h3 className="text-sm font-bold leading-5 text-slate-800">
                      {announcement.title}
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {announcement.message}
                    </p>

                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">

                      <CalendarDays size={12} />

                      <span>
                        {formatDate(
                          announcement.createdAt
                        )}
                      </span>

                      {announcement.updatedAt && (
                        <span>
                          · Updated
                        </span>
                      )}

                    </div>

                  </div>

                </div>

                {/* =========================================
                    FACILITATOR ACTIONS ONLY
                ========================================= */}

                {isFacilitator && (
                  <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">

                    {/* EDIT */}

                    <button
                      type="button"
                      onClick={() =>
                        openEditForm(
                          announcement
                        )
                      }
                      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50"
                    >
                      <Pencil size={13} />

                      Edit
                    </button>

                    {/* DELETE */}

                    <button
                      type="button"
                      onClick={() =>
                        setDeleteId(
                          announcement.id
                        )
                      }
                      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      <Trash2 size={13} />

                      Delete
                    </button>

                  </div>
                )}

                {/* =========================================
                    DELETE CONFIRMATION
                    FACILITATOR ONLY
                ========================================= */}

                {isFacilitator &&
                  deleteId ===
                    announcement.id && (

                    <div className="mt-3 rounded-lg border border-red-100 bg-red-50 p-3">

                      <p className="text-xs font-semibold text-red-700">
                        Delete this announcement?
                      </p>

                      <p className="mt-1 text-[11px] leading-4 text-red-600">
                        This action cannot be
                        undone.
                      </p>

                      <div className="mt-2 flex gap-2">

                        <button
                          type="button"
                          onClick={() =>
                            setDeleteId(null)
                          }
                          disabled={
                            deletingId ===
                            announcement.id
                          }
                          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                          Cancel
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(
                              announcement.id
                            )
                          }
                          disabled={
                            deletingId ===
                            announcement.id
                          }
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >

                          {deletingId ===
                          announcement.id ? (
                            <>
                              <Loader2
                                size={13}
                                className="animate-spin"
                              />

                              Deleting...
                            </>
                          ) : (
                            <>
                              <Trash2 size={13} />

                              Delete
                            </>
                          )}

                        </button>

                      </div>

                    </div>
                  )}

              </article>
            )
          )}

        </div>
      )}

    </section>
  );
}