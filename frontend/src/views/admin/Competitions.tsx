import { useState } from "react";
import { useCompetitions, type Competition } from "../../api/competitions";
import { useCourses } from "../../api/courses";
import { useSeries } from "../../api/series";
import { Plus, Edit, Trash2, MapPin, Clock, Award } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { API_BASE_URL } from "../../api/config";

export default function AdminCompetitions() {
  const { data: competitions, isLoading, error } = useCompetitions();
  const { data: courses } = useCourses();
  const { data: series } = useSeries();
  const [showForm, setShowForm] = useState(false);
  const [editingCompetition, setEditingCompetition] =
    useState<Competition | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    date: "",
    course_id: "",
    series_id: "",
  });

  if (isLoading) return <div>Loading competitions...</div>;
  if (error) return <div>Error loading competitions</div>;

  const handleEdit = (competition: Competition) => {
    setEditingCompetition(competition);
    setFormData({
      name: competition.name,
      date: competition.date,
      course_id: competition.course_id.toString(),
      series_id: competition.series_id?.toString() || "",
    });
    setShowForm(true);
  };

  const handleDelete = (competitionId: number) => {
    if (confirm("Are you sure you want to delete this competition?")) {
      // TODO: Implement delete functionality
      console.log("Delete competition:", competitionId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API_BASE_URL}/competitions`, {
        method: editingCompetition ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          course_id: parseInt(formData.course_id),
          series_id: formData.series_id
            ? parseInt(formData.series_id)
            : undefined,
          ...(editingCompetition && { id: editingCompetition.id }),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save competition");
      }

      // Reset form and close
      setFormData({ name: "", date: "", course_id: "", series_id: "" });
      setShowForm(false);
      setEditingCompetition(null);
    } catch (error) {
      console.error("Error saving competition:", error);
      alert("Failed to save competition. Please try again.");
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const getCourse = (courseId: number) => {
    return courses?.find((course) => course.id === courseId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Competitions</h2>
          <p className="text-gray-600">
            Manage golf competitions and tournaments
          </p>
        </div>
        <button
          onClick={() => {
            setEditingCompetition(null);
            setFormData({ name: "", date: "", course_id: "", series_id: "" });
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Competition
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">
            {editingCompetition ? "Edit Competition" : "Add New Competition"}
          </h3>
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Competition Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter competition name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Course
              </label>
              <select
                name="course_id"
                value={formData.course_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a course</option>
                {courses?.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Series (Optional)
              </label>
              <select
                name="series_id"
                value={formData.series_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No series (standalone competition)</option>
                {series?.map((seriesItem) => (
                  <option key={seriesItem.id} value={seriesItem.id}>
                    {seriesItem.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {editingCompetition ? "Update" : "Create"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingCompetition(null);
                  setFormData({
                    name: "",
                    date: "",
                    course_id: "",
                    series_id: "",
                  });
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            All Competitions
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {competitions?.map((competition) => {
            const course = getCourse(competition.course_id);
            return (
              <div key={competition.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="text-lg font-medium text-gray-900">
                      {competition.name}
                    </h4>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {course?.name || "Unknown Course"}
                      </div>
                      {competition.series_id && (
                        <div className="flex items-center gap-1 text-blue-600">
                          <Award className="h-4 w-4" />
                          {series?.find((s) => s.id === competition.series_id)
                            ?.name || `Series #${competition.series_id}`}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/admin/competitions/${competition.id}/tee-times`}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Manage tee times"
                    >
                      <Clock className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => handleEdit(competition)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit competition"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(competition.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete competition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
