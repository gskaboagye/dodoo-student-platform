"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  Plus,
  Search,
  ExternalLink,
  Pencil,
  Trash2,
  X,
  Save,
  FileText,
  Video,
  Globe,
  Link as LinkIcon,
} from "lucide-react";

const emptyForm = {
  title: "",
  description: "",
  type: "Article",
  category: "Web Development",
  url: "",
};

const resourceTypes = [
  "Article",
  "Video",
  "Course",
  "Documentation",
  "Tutorial",
  "Book",
  "Other",
];

const categories = [
  "Web Development",
  "Programming",
  "Database",
  "Design",
  "Git & GitHub",
  "Career",
  "Other",
];

export default function ResourcesPage() {
  const [resources, setResources] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);

  async function loadResources() {
    try {
      setLoading(true);

      // Get the logged-in user
      const meResponse = await fetch("/api/auth/me");

      if (!meResponse.ok) {
        throw new Error("Authentication required.");
      }

      const meData = await meResponse.json();
      const currentUser = meData.user || meData;

      setUser(currentUser);

      // Load resources
      const response = await fetch("/api/resources");

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({}));

        throw new Error(
          errorData.message ||
            errorData.error ||
            "Failed to load resources"
        );
      }

      const data = await response.json();

      setResources(
        Array.isArray(data)
          ? data
          : Array.isArray(data.resources)
            ? data.resources
            : []
      );
    } catch (error) {
      console.error("Resource loading error:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadResources();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  // Facilitators only
  function openAddForm() {
    if (user?.role !== "facilitator") {
      return;
    }

    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  }

  // Facilitators only
  function openEditForm(resource) {
    if (user?.role !== "facilitator") {
      return;
    }

    setForm({
      title: resource.title || "",
      description: resource.description || "",
      type: resource.type || "Article",
      category: resource.category || "Web Development",
      url: resource.url || "",
    });

    setEditingId(resource._id);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  // Facilitators only
  async function handleSubmit(event) {
    event.preventDefault();

    if (user?.role !== "facilitator") {
      return;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/resources", {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          editingId
            ? { ...form, id: editingId }
            : form
        ),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Failed to save resource"
        );
      }

      closeForm();
      await loadResources();
    } catch (error) {
      console.error("Resource save error:", error);
      alert(error.message);
    } finally {
      setSaving(false);
    }
  }

  // Facilitators only
  async function deleteResource(id) {
    if (user?.role !== "facilitator") {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this resource?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `/api/resources?id=${id}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Failed to delete resource"
        );
      }

      await loadResources();
    } catch (error) {
      console.error("Resource delete error:", error);
      alert(error.message);
    }
  }

  function getIcon(type) {
    switch (type) {
      case "Video":
        return Video;

      case "Documentation":
        return FileText;

      case "Course":
        return BookOpen;

      case "Tutorial":
        return Globe;

      default:
        return LinkIcon;
    }
  }

  const filteredResources = resources.filter((resource) => {
    const searchText = search.toLowerCase();

    return (
      resource.title?.toLowerCase().includes(searchText) ||
      resource.description?.toLowerCase().includes(searchText) ||
      resource.category?.toLowerCase().includes(searchText) ||
      resource.type?.toLowerCase().includes(searchText)
    );
  });

  return (
    <div className="min-h-screen bg-gray-100 p-6 md:p-8">

      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

        <div className="flex items-center gap-3">

          <div className="rounded-xl bg-blue-100 p-3">
            <BookOpen
              size={25}
              className="text-blue-700"
            />
          </div>

          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Learning Resources
            </h1>

            <p className="mt-1 text-gray-500">
              Access learning materials for DCC students.
            </p>
          </div>

        </div>

        {/* Facilitators only */}
        {user?.role === "facilitator" && (
          <button
            onClick={openAddForm}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
          >
            <Plus size={18} />
            Add Resource
          </button>
        )}

      </div>

      {/* Search */}
      <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">

        <div className="relative max-w-xl">

          <Search
            size={19}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            type="text"
            placeholder="Search resources..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />

        </div>

      </div>

      {/* Form - Facilitators only */}
      {user?.role === "facilitator" && showForm && (
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">

          <div className="mb-6 flex items-center justify-between">

            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {editingId
                  ? "Edit Resource"
                  : "Add Learning Resource"}
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Add useful learning material for students.
              </p>
            </div>

            <button
              onClick={closeForm}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            >
              <X size={20} />
            </button>

          </div>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 gap-5 md:grid-cols-2"
          >

            <div className="md:col-span-2">

              <label className="mb-2 block text-sm font-medium text-gray-700">
                Resource Title
              </label>

              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. JavaScript Fundamentals"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />

            </div>

            <div className="md:col-span-2">

              <label className="mb-2 block text-sm font-medium text-gray-700">
                Description
              </label>

              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Briefly describe this resource..."
                rows={4}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />

            </div>

            <div>

              <label className="mb-2 block text-sm font-medium text-gray-700">
                Resource Type
              </label>

              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              >
                {resourceTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

            </div>

            <div>

              <label className="mb-2 block text-sm font-medium text-gray-700">
                Category
              </label>

              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              >
                {categories.map((category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category}
                  </option>
                ))}
              </select>

            </div>

            <div className="md:col-span-2">

              <label className="mb-2 block text-sm font-medium text-gray-700">
                Resource URL
              </label>

              <input
                name="url"
                type="url"
                value={form.url}
                onChange={handleChange}
                placeholder="https://example.com/resource"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />

            </div>

            <div className="flex justify-end gap-3 md:col-span-2">

              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
              >
                {editingId ? (
                  <Save size={17} />
                ) : (
                  <Plus size={17} />
                )}

                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Resource"
                    : "Save Resource"}
              </button>

            </div>

          </form>

        </div>
      )}

      {/* Resources */}
      <section className="rounded-xl bg-white shadow-sm">

        <div className="border-b border-gray-200 p-6">

          <div className="flex items-center justify-between">

            <div>

              <h2 className="text-xl font-bold text-gray-900">
                Resources
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {filteredResources.length} resource
                {filteredResources.length !== 1
                  ? "s"
                  : ""}
              </p>

            </div>

          </div>

        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-500">
            Loading resources...
          </div>
        ) : filteredResources.length === 0 ? (

          <div className="p-12 text-center">

            <BookOpen
              size={42}
              className="mx-auto text-gray-300"
            />

            <h3 className="mt-4 font-semibold text-gray-700">
              No resources found
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              {user?.role === "facilitator"
                ? "Add your first learning resource to get started."
                : "No learning resources are currently available."}
            </p>

          </div>

        ) : (

          <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2 xl:grid-cols-3">

            {filteredResources.map((resource) => {

              const Icon = getIcon(resource.type);

              return (
                <article
                  key={resource._id}
                  className="group rounded-xl border border-gray-200 p-5 transition hover:border-blue-300 hover:shadow-md"
                >

                  <div className="flex items-start justify-between">

                    <div className="rounded-lg bg-blue-50 p-3">
                      <Icon
                        size={22}
                        className="text-blue-700"
                      />
                    </div>

                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                      {resource.type}
                    </span>

                  </div>

                  <h3 className="mt-5 text-lg font-bold text-gray-900">
                    {resource.title}
                  </h3>

                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-500">
                    {resource.description}
                  </p>

                  <div className="mt-4">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                      {resource.category}
                    </span>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">

                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900"
                    >
                      Open Resource
                      <ExternalLink size={15} />
                    </a>

                    {/* Facilitators only */}
                    {user?.role === "facilitator" && (
                      <div className="flex items-center gap-1">

                        <button
                          onClick={() =>
                            openEditForm(resource)
                          }
                          className="rounded-lg p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-700"
                          title="Edit resource"
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          onClick={() =>
                            deleteResource(resource._id)
                          }
                          className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
                          title="Delete resource"
                        >
                          <Trash2 size={17} />
                        </button>

                      </div>
                    )}

                  </div>

                </article>
              );

            })}

          </div>

        )}

      </section>

    </div>
  );
}