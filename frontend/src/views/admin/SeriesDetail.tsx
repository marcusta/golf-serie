import { useState, useEffect } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  useSingleSeries,
  useUpdateSeries,
  useSeriesTeams,
  useAvailableTeams,
  useAddTeamToSeries,
  useRemoveTeamFromSeries,
  useSeriesDocuments,
  useCreateSeriesDocument,
  useUpdateSeriesDocument,
  useDeleteSeriesDocument,
  useSeriesAdmins,
  useAddSeriesAdmin,
  useRemoveSeriesAdmin,
  type SeriesDocument,
} from "@/api/series";
import { useDeleteCompetition, type Competition } from "@/api/competitions";
import { type Team } from "@/api/teams";
import { useUsers } from "@/api/tours";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Edit,
  Save,
  Plus,
  Trash2,
  Users,
  FileText,
  Settings,
  X,
  Trophy,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import MarkdownEditor from "@/components/MarkdownEditor";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  SeriesCompetitionList,
  SeriesCompetitionModal,
} from "@/components/admin/series";

export default function AdminSeriesDetail() {
  const { serieId } = useParams({ from: "/admin/series/$serieId" });
  const seriesId = parseInt(serieId);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Check if user is SUPER_ADMIN or owner
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  // API hooks
  const { data: series, isLoading: seriesLoading } = useSingleSeries(seriesId);
  const updateSeries = useUpdateSeries();
  const { data: seriesTeams } = useSeriesTeams(seriesId);
  const { data: availableTeams } = useAvailableTeams(seriesId);
  const addTeamToSeries = useAddTeamToSeries();
  const removeTeamFromSeries = useRemoveTeamFromSeries();
  const { data: documents } = useSeriesDocuments(seriesId);
  const createDocument = useCreateSeriesDocument();
  const updateDocument = useUpdateSeriesDocument();
  const deleteDocument = useDeleteSeriesDocument();
  const deleteCompetition = useDeleteCompetition();
  const { data: admins } = useSeriesAdmins(seriesId);
  const addAdminMutation = useAddSeriesAdmin();
  const removeAdminMutation = useRemoveSeriesAdmin();
  const { data: users } = useUsers();

  // Check if user can manage admins (owner or SUPER_ADMIN)
  const canManageAdmins = isSuperAdmin || series?.owner_id === user?.id;

  // Filter users available to add as admin (not already admin and not owner)
  const availableUsers = users?.filter(
    (u) =>
      !admins?.some((admin) => admin.user_id === u.id) &&
      u.id !== series?.owner_id
  );

  // Local state
  const [activeTab, setActiveTab] = useState<
    "competitions" | "settings" | "teams" | "documents" | "admins"
  >("competitions");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [isEditingBasic, setIsEditingBasic] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    banner_image_url: "",
    is_public: true,
    landing_document_id: undefined as number | undefined,
  });

  // Competition management state
  const [showCompetitionModal, setShowCompetitionModal] = useState(false);
  const [editingCompetition, setEditingCompetition] = useState<Competition | null>(null);
  const [deletingCompetition, setDeletingCompetition] = useState<Competition | null>(null);

  // Document management state
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [editingDocument, setEditingDocument] = useState<SeriesDocument | null>(
    null
  );
  const [documentForm, setDocumentForm] = useState({
    title: "",
    content: "",
  });

  // Initialize form data when series loads
  useEffect(() => {
    if (series) {
      setFormData({
        name: series.name,
        banner_image_url: series.banner_image_url || "",
        is_public: series.is_public,
        landing_document_id: series.landing_document_id,
      });
    }
  }, [series]);

  // Fix scrolling issue when document dialog closes
  useEffect(() => {
    if (!showDocumentDialog) {
      // Reset body overflow when dialog closes
      document.body.style.overflow = "";
    }
  }, [showDocumentDialog]);

  // Cleanup body overflow on component unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleBasicInfoSave = async () => {
    if (!series) return;
    try {
      await updateSeries.mutateAsync({
        id: series.id,
        data: {
          name: formData.name,
          banner_image_url: formData.banner_image_url || undefined,
          is_public: formData.is_public,
          landing_document_id: formData.landing_document_id,
        },
      });
      setIsEditingBasic(false);
    } catch (error) {
      console.error("Failed to update series:", error);
      alert("Failed to update series. Please try again.");
    }
  };

  const handleAddTeam = async (teamId: number) => {
    try {
      await addTeamToSeries.mutateAsync({
        seriesId,
        teamId,
      });
    } catch (error) {
      console.error("Failed to add team to series:", error);
      alert("Failed to add team to series. Please try again.");
    }
  };

  const handleRemoveTeam = async (teamId: number) => {
    try {
      await removeTeamFromSeries.mutateAsync({
        seriesId,
        teamId,
      });
    } catch (error) {
      console.error("Failed to remove team from series:", error);
      alert("Failed to remove team from series. Please try again.");
    }
  };

  const handleCreateDocument = () => {
    setEditingDocument(null);
    setDocumentForm({ title: "", content: "" });
    setShowDocumentDialog(true);
  };

  const handleEditDocument = (document: SeriesDocument) => {
    setEditingDocument(document);
    setDocumentForm({ title: document.title, content: document.content });
    setShowDocumentDialog(true);
  };

  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDocument) {
        await updateDocument.mutateAsync({
          seriesId,
          documentId: editingDocument.id,
          data: documentForm,
        });
      } else {
        await createDocument.mutateAsync({
          seriesId,
          data: documentForm,
        });
      }
      setShowDocumentDialog(false);
    } catch (error) {
      console.error("Failed to save document:", error);
      alert("Failed to save document. Please try again.");
    }
  };

  // Competition handlers
  const handleEditCompetition = (competition: Competition) => {
    setEditingCompetition(competition);
    setShowCompetitionModal(true);
  };

  const handleDeleteCompetitionClick = (competition: Competition) => {
    setDeletingCompetition(competition);
  };

  const handleConfirmDeleteCompetition = async () => {
    if (!deletingCompetition) return;
    try {
      await deleteCompetition.mutateAsync(deletingCompetition.id);
      queryClient.invalidateQueries({ queryKey: ["series", seriesId, "competitions"] });
      setDeletingCompetition(null);
    } catch (error) {
      console.error("Failed to delete competition:", error);
      alert("Failed to delete competition. Please try again.");
    }
  };

  const handleDeleteDocument = async (document: SeriesDocument) => {
    if (!series) return;

    const isLandingPage = series.landing_document_id === document.id;
    const confirmMessage = isLandingPage
      ? `Are you sure you want to delete "${document.title}"? This is currently set as the landing page and will be unset.`
      : `Are you sure you want to delete "${document.title}"?`;

    if (window.confirm(confirmMessage)) {
      try {
        // If deleting the landing page document, unset it first
        if (isLandingPage) {
          await updateSeries.mutateAsync({
            id: series.id,
            data: {
              landing_document_id: undefined,
            },
          });
          setFormData((prev) => ({
            ...prev,
            landing_document_id: undefined,
          }));
        }

        await deleteDocument.mutateAsync({
          seriesId,
          documentId: document.id,
        });
      } catch (error) {
        console.error("Failed to delete document:", error);
        alert("Failed to delete document. Please try again.");
      }
    }
  };

  // Admin handlers
  const handleAddAdmin = async () => {
    setAdminError(null);
    if (!selectedUserId) {
      setAdminError("Please select a user");
      return;
    }

    try {
      await addAdminMutation.mutateAsync({ seriesId, userId: selectedUserId });
      setSelectedUserId(null);
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : "Failed to add admin");
    }
  };

  const handleRemoveAdmin = async (userId: number) => {
    if (confirm("Are you sure you want to remove this admin?")) {
      try {
        await removeAdminMutation.mutateAsync({ seriesId, userId });
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to remove admin");
      }
    }
  };

  if (seriesLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-[300px]" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!series) {
    return <div>Series not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/admin/series"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Series
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{series.name}</h1>
            <p className="text-gray-600">Series #{series.id}</p>
          </div>
        </div>
        <Badge variant={series.is_public ? "default" : "secondary"}>
          {series.is_public ? "Public" : "Private"}
        </Badge>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab("competitions")}
            className={`flex items-center gap-2 pb-3 px-1 border-b-2 transition-colors ${
              activeTab === "competitions"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Trophy className="h-4 w-4" />
            Competitions
          </button>
          <button
            onClick={() => setActiveTab("teams")}
            className={`flex items-center gap-2 pb-3 px-1 border-b-2 transition-colors ${
              activeTab === "teams"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Users className="h-4 w-4" />
            Teams
          </button>
          <button
            onClick={() => setActiveTab("documents")}
            className={`flex items-center gap-2 pb-3 px-1 border-b-2 transition-colors ${
              activeTab === "documents"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <FileText className="h-4 w-4" />
            Documents
            {documents && documents.length > 0 && (
              <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                {documents.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("admins")}
            className={`flex items-center gap-2 pb-3 px-1 border-b-2 transition-colors ${
              activeTab === "admins"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Shield className="h-4 w-4" />
            Admins
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2 pb-3 px-1 border-b-2 transition-colors ${
              activeTab === "settings"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "competitions" && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Competitions</h2>
            <Button
              onClick={() => {
                setEditingCompetition(null);
                setShowCompetitionModal(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Competition
            </Button>
          </div>
          <SeriesCompetitionList
            seriesId={seriesId}
            onEdit={handleEditCompetition}
            onDelete={handleDeleteCompetitionClick}
          />
        </div>
      )}

      {activeTab === "settings" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Basic Information</CardTitle>
                {isEditingBasic ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditingBasic(false);
                        setFormData({
                          name: series.name,
                          banner_image_url: series.banner_image_url || "",
                          is_public: series.is_public,
                          landing_document_id: series.landing_document_id,
                        });
                      }}
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleBasicInfoSave}>
                      <Save className="h-4 w-4" />
                      Save
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingBasic(true)}
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Series Name
                </label>
                {isEditingBasic ? (
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Enter series name"
                  />
                ) : (
                  <p className="text-sm text-gray-900">{series.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="banner_image_url"
                  className="text-sm font-medium"
                >
                  Banner Image URL
                </label>
                {isEditingBasic ? (
                  <Input
                    id="banner_image_url"
                    type="url"
                    value={formData.banner_image_url}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        banner_image_url: e.target.value,
                      }))
                    }
                    placeholder="https://example.com/banner.jpg"
                  />
                ) : (
                  <p className="text-sm text-gray-900">
                    {series.banner_image_url || "No banner image set"}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_public"
                  checked={
                    isEditingBasic ? formData.is_public : series.is_public
                  }
                  onCheckedChange={
                    isEditingBasic
                      ? (checked) =>
                          setFormData((prev) => ({
                            ...prev,
                            is_public: checked,
                          }))
                      : undefined
                  }
                  disabled={!isEditingBasic}
                />
                <label htmlFor="is_public" className="text-sm font-medium">
                  Public series (visible to players)
                </label>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "teams" && (
        <div className="space-y-6">
          {!isSuperAdmin && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                Team management is restricted to super administrators. Contact a
                super admin to add or remove teams from this series.
              </p>
            </div>
          )}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Teams in Series</CardTitle>
              </CardHeader>
              <CardContent>
                {seriesTeams && seriesTeams.length > 0 ? (
                  <div className="space-y-2">
                    {seriesTeams.map((team: Team) => (
                      <div
                        key={team.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">{team.name}</span>
                        </div>
                        {isSuperAdmin && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveTeam(team.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">
                    No teams in this series yet.
                  </p>
                )}
              </CardContent>
            </Card>

            {isSuperAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle>Available Teams</CardTitle>
                </CardHeader>
                <CardContent>
                  {availableTeams && availableTeams.length > 0 ? (
                    <div className="space-y-2">
                      {availableTeams.map((team: Team) => (
                        <div
                          key={team.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-600" />
                            <span className="font-medium">{team.name}</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddTeam(team.id)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            Add to Series
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">
                      All teams are already in this series.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {activeTab === "documents" && (
        <div className="space-y-6">
          {/* Landing Page Settings Section */}
          <Card>
            <CardHeader>
              <CardTitle>Landing Page Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="landing-document"
                  className="text-sm font-medium"
                >
                  Landing Page Document
                </label>
                <select
                  id="landing-document"
                  value={formData.landing_document_id || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      landing_document_id: value ? parseInt(value) : undefined,
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">None (use series description)</option>
                  {documents?.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.title}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">
                  Select which document players will see as the main content for
                  this series.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBasicInfoSave}
                  disabled={updateSeries.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Landing Page Settings
                </Button>
                {formData.landing_document_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreviewDialog(true)}
                  >
                    Preview
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Series Documents</h3>
            <Button onClick={handleCreateDocument}>
              <Plus className="h-4 w-4 mr-2" />
              Add Document
            </Button>
          </div>

          <div className="grid gap-4">
            {documents && documents.length > 0 ? (
              documents.map((document) => (
                <Card key={document.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">
                          {document.title}
                        </CardTitle>
                        {series?.landing_document_id === document.id && (
                          <Badge
                            variant="default"
                            className="bg-blue-100 text-blue-800 hover:bg-blue-100"
                          >
                            Landing Page
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditDocument(document)}
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteDocument(document)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-gray max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {document.content}
                      </ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No documents created yet.</p>
                  <Button
                    variant="outline"
                    onClick={handleCreateDocument}
                    className="mt-4"
                  >
                    Create your first document
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {activeTab === "admins" && (
        <div className="space-y-6">
          {/* Add Admin Form - only visible to owners and SUPER_ADMIN */}
          {canManageAdmins && (
            <Card>
              <CardHeader>
                <CardTitle>Add Series Admin</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <select
                      value={selectedUserId || ""}
                      onChange={(e) =>
                        setSelectedUserId(
                          e.target.value ? parseInt(e.target.value) : null
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select a user...</option>
                      {availableUsers?.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.email} ({u.role})
                        </option>
                      ))}
                    </select>
                    {adminError && (
                      <p className="text-red-600 text-sm mt-1">{adminError}</p>
                    )}
                  </div>
                  <Button
                    onClick={handleAddAdmin}
                    disabled={addAdminMutation.isPending || !selectedUserId}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Admin
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Series admins can manage competitions and documents for this
                  series.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Admins List */}
          <Card>
            <CardHeader>
              <CardTitle>Series Admins</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-gray-200">
                {/* Owner */}
                {series?.owner_id && (
                  <div className="py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Shield className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">
                          Series Owner
                        </span>
                        <p className="text-sm text-gray-500">
                          Has full control over this series
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="default"
                      className="bg-blue-100 text-blue-800"
                    >
                      Owner
                    </Badge>
                  </div>
                )}

                {/* Admins */}
                {admins && admins.length > 0 ? (
                  admins.map((admin) => (
                    <div
                      key={admin.id}
                      className="py-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <Users className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <span className="font-medium text-gray-900">
                            {admin.email}
                          </span>
                          <p className="text-sm text-gray-500">{admin.role}</p>
                        </div>
                      </div>
                      {canManageAdmins && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAdmin(admin.user_id)}
                          disabled={removeAdminMutation.isPending}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-gray-500">
                    <p>No additional admins.</p>
                    {canManageAdmins && (
                      <p className="text-sm mt-1">
                        Add users to help manage this series.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Document Dialog */}
      <Dialog open={showDocumentDialog} onOpenChange={setShowDocumentDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingDocument ? "Edit Document" : "Create Document"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveDocument} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="document-title" className="text-sm font-medium">
                Document Title
              </label>
              <Input
                id="document-title"
                value={documentForm.title}
                onChange={(e) =>
                  setDocumentForm((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                placeholder="Enter document title"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="document-content" className="text-sm font-medium">
                Content (Markdown)
              </label>
              <MarkdownEditor
                value={documentForm.content}
                onChange={(content) =>
                  setDocumentForm((prev) => ({ ...prev, content }))
                }
                height={300}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDocumentDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingDocument ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Landing Page Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              This is how players will see the landing page for this series:
            </p>

            {(() => {
              const selectedDoc = documents?.find(
                (doc) => doc.id === formData.landing_document_id
              );

              if (!selectedDoc) {
                return (
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <p className="text-gray-500">
                      No document selected for preview.
                    </p>
                  </div>
                );
              }

              return (
                <div className="border rounded-lg overflow-hidden">
                  {/* Preview header */}
                  <div className="bg-gray-50 border-b px-4 py-2">
                    <h3 className="font-medium text-gray-900">
                      {selectedDoc.title}
                    </h3>
                  </div>

                  {/* Preview content */}
                  <div className="p-6">
                    <div className="prose prose-gray max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {selectedDoc.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPreviewDialog(false)}
            >
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Competition Modal */}
      <SeriesCompetitionModal
        seriesId={seriesId}
        open={showCompetitionModal}
        onOpenChange={(open) => {
          setShowCompetitionModal(open);
          if (!open) setEditingCompetition(null);
        }}
        competition={editingCompetition}
      />

      {/* Delete Competition Confirmation */}
      <Dialog
        open={!!deletingCompetition}
        onOpenChange={(open) => !open && setDeletingCompetition(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Competition</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingCompetition?.name}"? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingCompetition(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDeleteCompetition}
              disabled={deleteCompetition.isPending}
            >
              {deleteCompetition.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
