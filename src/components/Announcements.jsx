"use client";

import { useEffect, useState } from "react";
import {
  Megaphone,
  Plus,
  Trash2,
  X,
  Send,
  Loader2,
} from "lucide-react";

export default function Announcements({ role }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadAnnouncements();
  }, []);

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
      console.error("ANNOUNCEMENTS ERROR:", error);
      setError(
        error.message || "Unable to load announcements."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateAnnouncement(event) {
    event.preventDefault();

    if (!title.trim() || !message.trim()) {
      setError("Please enter both a title and message.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch("/api/announcements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || "Unable to create announcement."
        );
      }

      if (data?.announcement) {
        setAnnouncements((current) => [
          data.announcement,
          ...current,
        ]);
      }

      setTitle("");
      setMessage("");
      setShowForm(false);
      setSuccess("Announcement posted successfully.");

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (error) {
      console.error("CREATE ANNOUNCEMENT ERROR:", error);
      setError(
        error.message || "Unable to create announcement."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAnnouncement(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this announcement?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(id);
      setError("");
      setSuccess("");

      const response = await fetch("/api/announcements", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || "Unable to delete announcement."
        );
      }

      setAnnouncements((current) =>
        current.filter(
          (announcement) => announcement.id !== id
        )
      );

      setSuccess("Announcement deleted successfully.");

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (error) {
      console.error("DELETE ANNOUNCEMENT ERROR:", error);
      setError(
        error.message || "Unable to delete announcement."
      );
    } finally {
      setDeletingId(null);
    }
  }

  function formatDate(date) {
    if (!date) {
      return "";
    }

    try {
      return new Date(date).toLocaleString("en-GH", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return "";
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
            <Megaphone size={20} />
          </div>

          <div>
            <h2 className="font-semibold text-slate-900">
              Announcements
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Important updates and messages from the facilitator
            </p>
          </div>
        </div>

        {/* FACILITATOR BUTTON */}
        {role === "facilitator" && (
          <button
            type="button"
            onClick={() => {
              setShowForm((current) => !current);
              setError("");
              setSuccess("");
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            {showForm ? (
              <>
                <X size={17} />
                Cancel
              </>
            ) : (
              <>
                <Plus size={17} />
                Add Announcement
              </>
            )}
          </button>
        )}
      </div>

      {/* FORM */}
      {role === "facilitator" && showForm && (
        <form
          onSubmit={handleCreateAnnouncement}
          className="mt-5 rounded-xl border border-blue-100 bg-blue-50/50 p-4"
        >
          <div className="space-y-4">
            <div>
              <label
                htmlFor="announcement-title"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Title
              </label>

              <input
                id="announcement-title"
                type="text"
                value={title}
                onChange={(event) =>
                  setTitle(event.target.value)
                }
                placeholder="Announcement title"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                disabled={saving}
              />
            </div>

            <div>
              <label
                htmlFor="announcement-message"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Message
              </label>

              <textarea
                id="announcement-message"
                value={message}
                onChange={(event) =>
                  setMessage(event.target.value)
                }
                placeholder="Write your announcement..."
                rows={4}
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                disabled={saving}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                  Posting...
                </>
              ) : (
                <>
                  <Send size={17} />
                  Post Announcement
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ERROR */}
      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* SUCCESS */}
      {success && (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* ANNOUNCEMENTS LIST */}
      <div className="mt-5">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-sm text-slate-500">
            <Loader2
              size={18}
              className="mr-2 animate-spin"
            />
            Loading announcements...
          </div>
        ) : announcements.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
            <Megaphone
              size={24}
              className="mx-auto mb-2 text-slate-400"
            />

            <p className="text-sm font-medium text-slate-600">
              No announcements yet.
            </p>

            {role === "facilitator" && (
              <p className="mt-1 text-xs text-slate-400">
                Add an announcement to share an update
                with students.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((announcement) => (
              <article
                key={announcement.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {announcement.title}
                    </h3>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {announcement.message}
                    </p>

                    <div className="mt-3 text-xs text-slate-400">
                      {announcement.createdByName ||
                        "Facilitator"}
                      {" • "}
                      {formatDate(
                        announcement.createdAt
                      )}
                    </div>
                  </div>

                  {/* DELETE — FACILITATOR ONLY */}
                  {role === "facilitator" && (
                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteAnnouncement(
                          announcement.id
                        )
                      }
                      disabled={
                        deletingId === announcement.id
                      }
                      className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      title="Delete announcement"
                    >
                      {deletingId === announcement.id ? (
                        <Loader2
                          size={17}
                          className="animate-spin"
                        />
                      ) : (
                        <Trash2 size={17} />
                      )}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}