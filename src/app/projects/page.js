"use client";

import { useEffect, useState } from "react";
import {
  FolderKanban,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Save,
  ExternalLink,
  Code2,
  Users,
  Target,
} from "lucide-react";

const emptyForm = {
  title: "",
  description: "",
  studentId: "",
  technology: "",
  status: "Planning",
  progress: 0,
  projectUrl: "",
  githubUrl: "",
};

const statuses = [
  "Planning",
  "In Progress",
  "Completed",
  "On Hold",
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);

  async function loadData() {
    try {
      setLoading(true);

      /*
       * Authentication is optional for viewing projects.
       * Visitors can see projects without logging in.
       */
      let currentUser = null;

      try {
        const meResponse = await fetch("/api/auth/me");

        if (meResponse.ok) {
          const meData = await meResponse.json();
          currentUser = meData.user || meData;
        }
      } catch (error) {
        console.log("No authenticated user.");
      }

      setUser(currentUser);

      /*
       * Load public projects.
       */
      const projectsResponse = await fetch("/api/projects");

      if (!projectsResponse.ok) {
        const projectError = await projectsResponse
          .json()
          .catch(() => ({}));

        throw new Error(
          projectError.message ||
            projectError.error ||
            "Failed to load projects."
        );
      }

      const projectsData = await projectsResponse.json();

      setProjects(
        Array.isArray(projectsData)
          ? projectsData
          : Array.isArray(projectsData.projects)
            ? projectsData.projects
            : []
      );

      /*
       * Only facilitators need the student management list.
       */
      if (currentUser?.role === "facilitator") {
        const studentsResponse = await fetch("/api/students");

        if (!studentsResponse.ok) {
          const studentsError = await studentsResponse
            .json()
            .catch(() => ({}));

          throw new Error(
            studentsError.message ||
              studentsError.error ||
              "Failed to load students."
          );
        }

        const studentsData = await studentsResponse.json();

        setStudents(
          Array.isArray(studentsData)
            ? studentsData
            : Array.isArray(studentsData.students)
              ? studentsData.students
              : []
        );
      } else {
        setStudents([]);
      }
    } catch (error) {
      console.error("Project loading error:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  /*
   * A facilitator or logged-in student can open the
   * Add Project form.
   */
  function openAddForm() {
    if (
      user?.role !== "facilitator" &&
      user?.role !== "student"
    ) {
      return;
    }

    setForm({
      ...emptyForm,
      studentId:
        user?.role === "facilitator"
          ? ""
          : user?.studentId || "",
    });

    setEditingId(null);
    setShowForm(true);
  }

  /*
   * Facilitators can edit any project.
   *
   * Students can edit only their own project.
   */
  function openEditForm(project) {
    if (!user) {
      return;
    }

    const isFacilitator =
      user.role === "facilitator";

    const isOwner =
      user.role === "student" &&
      user.studentId &&
      project.studentId &&
      user.studentId.toString() ===
        project.studentId.toString();

    if (!isFacilitator && !isOwner) {
      return;
    }

    setForm({
      title: project.title || "",
      description: project.description || "",
      studentId: project.studentId || "",
      technology: project.technology || "",
      status: project.status || "Planning",
      progress: project.progress || 0,
      projectUrl: project.projectUrl || "",
      githubUrl: project.githubUrl || "",
    });

    setEditingId(project._id);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (
      user?.role !== "facilitator" &&
      user?.role !== "student"
    ) {
      return;
    }

    try {
      setSaving(true);

      /*
       * Students do not control studentId.
       * The API gets their studentId from their session.
       */
      const payload = {
        title: form.title,
        description: form.description,
        technology: form.technology,
        status: form.status,
        progress: form.progress,
        projectUrl: form.projectUrl,
        githubUrl: form.githubUrl,
      };

      /*
       * Facilitators can assign the project to a student.
       */
      if (user.role === "facilitator") {
        payload.studentId = form.studentId;
      }

      if (editingId) {
        payload.id = editingId;
      }

      const response = await fetch("/api/projects", {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Failed to save project."
        );
      }

      closeForm();
      await loadData();
    } catch (error) {
      console.error("Project save error:", error);
      alert(error.message);
    } finally {
      setSaving(false);
    }
  }

  /*
   * Only facilitators can delete projects.
   */
  async function deleteProject(id) {
    if (user?.role !== "facilitator") {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this project?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `/api/projects?id=${id}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Failed to delete project."
        );
      }

      await loadData();
    } catch (error) {
      console.error("Project delete error:", error);
      alert(error.message);
    }
  }

  const filteredProjects = projects.filter(
    (project) => {
      const searchText = search.toLowerCase();

      const matchesSearch =
        project.title
          ?.toLowerCase()
          .includes(searchText) ||
        project.studentName
          ?.toLowerCase()
          .includes(searchText) ||
        project.technology
          ?.toLowerCase()
          .includes(searchText);

      const matchesStatus =
        statusFilter === "All" ||
        project.status === statusFilter;

      return matchesSearch && matchesStatus;
    }
  );

  const activeProjects = projects.filter(
    (project) =>
      project.status === "In Progress" ||
      project.status === "Planning"
  ).length;

  const completedProjects = projects.filter(
    (project) =>
      project.status === "Completed"
  ).length;

  return (
    <div className="min-h-screen bg-gray-100 p-6 md:p-8">

      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

        <div className="flex items-center gap-3">

          <div className="rounded-xl bg-blue-100 p-3">
            <FolderKanban
              size={25}
              className="text-blue-700"
            />
          </div>

          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Student Projects
            </h1>

            <p className="mt-1 text-gray-500">
              Explore and showcase student projects.
            </p>
          </div>

        </div>

        {/* Students and facilitators can add projects */}
        {(user?.role === "student" ||
          user?.role === "facilitator") && (
          <button
            onClick={openAddForm}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
          >
            <Plus size={18} />
            Add Project
          </button>
        )}

      </div>

      {/* Statistics */}
      <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-3">

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">

            <div>
              <p className="text-sm text-gray-500">
                Total Projects
              </p>

              <p className="mt-2 text-3xl font-bold text-gray-900">
                {projects.length}
              </p>
            </div>

            <FolderKanban
              size={27}
              className="text-blue-600"
            />

          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">

            <div>
              <p className="text-sm text-gray-500">
                Active Projects
              </p>

              <p className="mt-2 text-3xl font-bold text-blue-700">
                {activeProjects}
              </p>
            </div>

            <Target
              size={27}
              className="text-blue-600"
            />

          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">

            <div>
              <p className="text-sm text-gray-500">
                Completed
              </p>

              <p className="mt-2 text-3xl font-bold text-green-600">
                {completedProjects}
              </p>
            </div>

            <Users
              size={27}
              className="text-green-600"
            />

          </div>
        </div>

      </div>

      {/* Search & Filter */}
      <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">

        <div className="flex flex-col gap-4 md:flex-row">

          <div className="relative flex-1">

            <Search
              size={19}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              placeholder="Search projects, students or technology..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />

          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600"
          >
            <option value="All">
              All Statuses
            </option>

            {statuses.map((status) => (
              <option
                key={status}
                value={status}
              >
                {status}
              </option>
            ))}
          </select>

        </div>

      </div>

      {/* Project Form */}
      {showForm && (
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">

          <div className="mb-6 flex items-center justify-between">

            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {editingId
                  ? "Edit Project"
                  : "Add Project"}
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {user?.role === "student"
                  ? "Add or update your project."
                  : "Add project information and assign it to a student."}
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

            {/* Project Title */}
            <div className="md:col-span-2">

              <label className="mb-2 block text-sm font-medium text-gray-700">
                Project Title
              </label>

              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. Student Portfolio Website"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />

            </div>

            {/* Student selector - facilitator only */}
            {user?.role === "facilitator" && (
              <div className="md:col-span-2">

                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Student
                </label>

                <select
                  name="studentId"
                  value={form.studentId}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">
                    Select student
                  </option>

                  {students.map((student) => (
                    <option
                      key={student._id}
                      value={student._id}
                    >
                      {student.firstName}{" "}
                      {student.lastName}
                    </option>
                  ))}
                </select>

              </div>
            )}

            {/* Student owner information */}
            {user?.role === "student" && (
              <div className="md:col-span-2">

                <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
                  This project will automatically be linked to your student profile.
                </div>

              </div>
            )}

            {/* Description */}
            <div className="md:col-span-2">

              <label className="mb-2 block text-sm font-medium text-gray-700">
                Description
              </label>

              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Describe the project..."
                rows={4}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />

            </div>

            {/* Technology */}
            <div>

              <label className="mb-2 block text-sm font-medium text-gray-700">
                Technology / Stack
              </label>

              <input
                name="technology"
                value={form.technology}
                onChange={handleChange}
                placeholder="e.g. HTML, CSS, JavaScript"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />

            </div>

            {/* Status */}
            <div>

              <label className="mb-2 block text-sm font-medium text-gray-700">
                Status
              </label>

              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600"
              >
                {statuses.map((status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {status}
                  </option>
                ))}
              </select>

            </div>

            {/* Progress */}
            <div>

              <label className="mb-2 block text-sm font-medium text-gray-700">
                Progress (%)
              </label>

              <input
                name="progress"
                type="number"
                min="0"
                max="100"
                value={form.progress}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-600"
              />

            </div>

            {/* Project URL */}
            <div>

              <label className="mb-2 block text-sm font-medium text-gray-700">
                Project URL
              </label>

              <input
                name="projectUrl"
                type="url"
                value={form.projectUrl}
                onChange={handleChange}
                placeholder="https://..."
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-600"
              />

            </div>

            {/* GitHub URL */}
            <div className="md:col-span-2">

              <label className="mb-2 block text-sm font-medium text-gray-700">
                GitHub URL
              </label>

              <input
                name="githubUrl"
                type="url"
                value={form.githubUrl}
                onChange={handleChange}
                placeholder="https://github.com/..."
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-600"
              />

            </div>

            {/* Buttons */}
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
                    ? "Update Project"
                    : "Create Project"}

              </button>

            </div>

          </form>

        </div>
      )}

      {/* Project Cards */}
      <section className="rounded-xl bg-white shadow-sm">

        <div className="border-b border-gray-200 p-6">

          <h2 className="text-xl font-bold text-gray-900">
            Projects
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            {filteredProjects.length} project
            {filteredProjects.length !== 1
              ? "s"
              : ""}
          </p>

        </div>

        {loading ? (

          <div className="p-10 text-center text-gray-500">
            Loading projects...
          </div>

        ) : filteredProjects.length === 0 ? (

          <div className="p-12 text-center">

            <FolderKanban
              size={45}
              className="mx-auto text-gray-300"
            />

            <h3 className="mt-4 font-semibold text-gray-700">
              No projects found
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              {user?.role === "student"
                ? "Add your project to showcase your work."
                : user?.role === "facilitator"
                  ? "Create a project to start tracking student work."
                  : "No projects are currently available."}
            </p>

          </div>

        ) : (

          <div className="grid grid-cols-1 gap-5 p-6 lg:grid-cols-2">

            {filteredProjects.map(
              (project) => {

                const isFacilitator =
                  user?.role ===
                  "facilitator";

                const isOwner =
                  user?.role === "student" &&
                  user.studentId &&
                  project.studentId &&
                  user.studentId.toString() ===
                    project.studentId.toString();

                const canEdit =
                  isFacilitator ||
                  isOwner;

                return (
                  <article
                    key={project._id}
                    className="rounded-xl border border-gray-200 p-5 transition hover:border-blue-300 hover:shadow-md"
                  >

                    <div className="flex items-start justify-between">

                      <div className="rounded-lg bg-blue-50 p-3">
                        <FolderKanban
                          size={22}
                          className="text-blue-700"
                        />
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          project.status ===
                          "Completed"
                            ? "bg-green-100 text-green-700"
                            : project.status ===
                                "In Progress"
                              ? "bg-blue-100 text-blue-700"
                              : project.status ===
                                  "On Hold"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {project.status}
                      </span>

                    </div>

                    <h3 className="mt-5 text-xl font-bold text-gray-900">
                      {project.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-gray-500">
                      {project.description}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">

                      <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
                        {project.technology}
                      </span>

                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                        {project.studentName}
                      </span>

                    </div>

                    <div className="mt-5">

                      <div className="mb-2 flex justify-between text-sm">

                        <span className="font-medium text-gray-700">
                          Progress
                        </span>

                        <span className="font-semibold text-blue-700">
                          {project.progress || 0}%
                        </span>

                      </div>

                      <div className="h-3 overflow-hidden rounded-full bg-gray-200">

                        <div
                          className="h-full rounded-full bg-blue-600"
                          style={{
                            width: `${project.progress || 0}%`,
                          }}
                        />

                      </div>

                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">

                      <div className="flex items-center gap-2">

                        {project.projectUrl && (
                          <a
                            href={
                              project.projectUrl
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                          >
                            <ExternalLink
                              size={16}
                            />
                            Demo
                          </a>
                        )}

                        {project.githubUrl && (
                          <a
                            href={
                              project.githubUrl
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                          >
                            <Code2
                              size={16}
                            />
                            GitHub
                          </a>
                        )}

                      </div>

                      {/* Edit/Delete controls */}
                      <div className="flex items-center gap-1">

                        {canEdit && (
                          <button
                            onClick={() =>
                              openEditForm(
                                project
                              )
                            }
                            className="rounded-lg p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-700"
                            title="Edit project"
                          >
                            <Pencil
                              size={17}
                            />
                          </button>
                        )}

                        {/* Only facilitators can delete */}
                        {isFacilitator && (
                          <button
                            onClick={() =>
                              deleteProject(
                                project._id
                              )
                            }
                            className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
                            title="Delete project"
                          >
                            <Trash2
                              size={17}
                            />
                          </button>
                        )}

                      </div>

                    </div>

                  </article>
                );
              }
            )}

          </div>

        )}

      </section>

    </div>
  );
}