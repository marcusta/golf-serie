import { useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  useTour,
  useUpdateTour,
  useTourCompetitions,
  useTourEnrollments,
  useAddEnrollment,
  useApproveEnrollment,
  useRemoveEnrollment,
  useTourAdmins,
  useAddTourAdmin,
  useRemoveTourAdmin,
  useTourDocuments,
  useCreateTourDocument,
  useUpdateTourDocument,
  useDeleteTourDocument,
  useTourCategories,
  useCreateTourCategory,
  useUpdateTourCategory,
  useDeleteTourCategory,
  useReorderTourCategories,
  useAssignEnrollmentCategory,
  useUsers,
  type TourEnrollment,
  type TourEnrollmentStatus,
  type TourDocument,
  type TourScoringMode,
  type TourCategory,
  type TourCompetition,
} from "../../api/tours";
import {
  useTourPointTemplates,
  useCreateTourPointTemplate,
  useUpdateTourPointTemplate,
  useDeleteTourPointTemplate,
  type PointTemplate,
  type PointsStructure,
} from "../../api/point-templates";
import { useDeleteCompetition, useCompetition } from "../../api/competitions";
import {
  TourCompetitionList,
  TourCompetitionModal,
} from "../../components/admin/tour";
import {
  Loader2,
  ArrowLeft,
  Plus,
  Users,
  Shield,
  Trophy,
  Check,
  X,
  Copy,
  Mail,
  Trash2,
  UserPlus,
  Globe,
  Lock,
  FileText,
  Edit2,
  Image,
  Star,
  Calculator,
  Layers,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type TabType = "competitions" | "enrollments" | "categories" | "admins" | "documents" | "points" | "settings";

// Type for a single position entry in the point template editor
interface PositionEntry {
  id: string;
  position: string;
  points: string;
}

// Convert PointsStructure to array of entries for the editor
function structureToEntries(structure: PointsStructure): { entries: PositionEntry[]; defaultPoints: string } {
  const entries: PositionEntry[] = [];
  let defaultPoints = "10";

  Object.entries(structure).forEach(([pos, pts]) => {
    if (pos === "default") {
      defaultPoints = String(pts);
    } else {
      entries.push({
        id: crypto.randomUUID(),
        position: pos,
        points: String(pts),
      });
    }
  });

  entries.sort((a, b) => {
    const aNum = parseInt(a.position) || 0;
    const bNum = parseInt(b.position) || 0;
    return aNum - bNum;
  });

  return { entries, defaultPoints };
}

// Convert editor entries back to PointsStructure
function entriesToStructure(entries: PositionEntry[], defaultPoints: string): PointsStructure {
  const structure: PointsStructure = {};

  entries.forEach((entry) => {
    const pos = entry.position.trim();
    const pts = parseInt(entry.points);
    if (pos && !isNaN(pts)) {
      structure[pos] = pts;
    }
  });

  const defaultPts = parseInt(defaultPoints);
  if (!isNaN(defaultPts)) {
    structure["default"] = defaultPts;
  }

  return structure;
}

// Default entries for a new template
function getDefaultEntries(): PositionEntry[] {
  return [
    { id: crypto.randomUUID(), position: "1", points: "100" },
    { id: crypto.randomUUID(), position: "2", points: "80" },
    { id: crypto.randomUUID(), position: "3", points: "65" },
  ];
}

export default function TourDetail() {
  const { id } = useParams({ from: "/admin/tours/$id" });
  const navigate = useNavigate();
  const tourId = parseInt(id);

  const [activeTab, setActiveTab] = useState<TabType>("competitions");
  const [statusFilter, setStatusFilter] = useState<TourEnrollmentStatus | "all">("all");
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);

  // Document state
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [editingDocument, setEditingDocument] = useState<TourDocument | null>(null);
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentContent, setDocumentContent] = useState("");
  const [documentError, setDocumentError] = useState<string | null>(null);

  // Category state
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TourCategory | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // Point template state
  const [showPointTemplateDialog, setShowPointTemplateDialog] = useState(false);
  const [editingPointTemplate, setEditingPointTemplate] = useState<PointTemplate | null>(null);
  const [pointTemplateName, setPointTemplateName] = useState("");
  const [pointTemplateEntries, setPointTemplateEntries] = useState<PositionEntry[]>([]);
  const [pointTemplateDefaultPoints, setPointTemplateDefaultPoints] = useState("10");
  const [pointTemplateError, setPointTemplateError] = useState<string | null>(null);

  // Competition state
  const [showCompetitionModal, setShowCompetitionModal] = useState(false);
  const [editingCompetitionId, setEditingCompetitionId] = useState<number | null>(null);

  // Settings state
  const [bannerImageUrl, setBannerImageUrl] = useState("");
  const [scoringMode, setScoringMode] = useState<TourScoringMode>("gross");
  const [pointTemplateId, setPointTemplateId] = useState<number | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const { data: tour, isLoading: tourLoading } = useTour(tourId);
  const { data: competitions } = useTourCompetitions(tourId);
  const { data: editingCompetition } = useCompetition(editingCompetitionId || 0);
  const deleteCompetitionMutation = useDeleteCompetition();
  const { data: enrollments, isLoading: enrollmentsLoading } = useTourEnrollments(
    tourId,
    statusFilter === "all" ? undefined : statusFilter
  );
  const { data: admins, isLoading: adminsLoading } = useTourAdmins(tourId);
  const { data: documents, isLoading: documentsLoading } = useTourDocuments(tourId);
  const { data: categories, isLoading: categoriesLoading } = useTourCategories(tourId);
  const { data: tourPointTemplates, isLoading: tourPointTemplatesLoading } = useTourPointTemplates(tourId);
  const { data: users } = useUsers();

  const updateTourMutation = useUpdateTour();
  const addEnrollmentMutation = useAddEnrollment();
  const approveEnrollmentMutation = useApproveEnrollment();
  const removeEnrollmentMutation = useRemoveEnrollment();
  const addAdminMutation = useAddTourAdmin();
  const removeAdminMutation = useRemoveTourAdmin();
  const createDocumentMutation = useCreateTourDocument();
  const updateDocumentMutation = useUpdateTourDocument();
  const deleteDocumentMutation = useDeleteTourDocument();
  const createCategoryMutation = useCreateTourCategory();
  const updateCategoryMutation = useUpdateTourCategory();
  const deleteCategoryMutation = useDeleteTourCategory();
  const reorderCategoriesMutation = useReorderTourCategories();
  const assignEnrollmentCategoryMutation = useAssignEnrollmentCategory();
  const createPointTemplateMutation = useCreateTourPointTemplate(tourId);
  const updatePointTemplateMutation = useUpdateTourPointTemplate(tourId);
  const deletePointTemplateMutation = useDeleteTourPointTemplate(tourId);

  const handleAddEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);

    if (!newEmail.trim()) {
      setEmailError("Email is required");
      return;
    }

    try {
      await addEnrollmentMutation.mutateAsync({ tourId, email: newEmail.trim() });
      setNewEmail("");
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "Failed to add enrollment");
    }
  };

  const handleApprove = async (enrollmentId: number) => {
    try {
      await approveEnrollmentMutation.mutateAsync({ tourId, enrollmentId });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to approve");
    }
  };

  const handleRemove = async (enrollmentId: number) => {
    if (confirm("Are you sure you want to remove this enrollment?")) {
      try {
        await removeEnrollmentMutation.mutateAsync({ tourId, enrollmentId });
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to remove");
      }
    }
  };

  const copyRegistrationLink = async (email: string) => {
    const baseUrl = window.location.origin;
    const registrationUrl = `${baseUrl}/register?email=${encodeURIComponent(email)}`;
    try {
      await navigator.clipboard.writeText(registrationUrl);
      setCopiedEmail(email);
      setTimeout(() => setCopiedEmail(null), 2000);
    } catch {
      alert("Failed to copy to clipboard");
    }
  };

  const handleAddAdmin = async () => {
    setAdminError(null);
    if (!selectedUserId) {
      setAdminError("Please select a user");
      return;
    }

    try {
      await addAdminMutation.mutateAsync({ tourId, userId: selectedUserId });
      setSelectedUserId(null);
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : "Failed to add admin");
    }
  };

  const handleRemoveAdmin = async (userId: number) => {
    if (confirm("Are you sure you want to remove this admin?")) {
      try {
        await removeAdminMutation.mutateAsync({ tourId, userId });
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to remove admin");
      }
    }
  };

  // Document handlers
  const openDocumentDialog = (doc?: TourDocument) => {
    if (doc) {
      setEditingDocument(doc);
      setDocumentTitle(doc.title);
      setDocumentContent(doc.content);
    } else {
      setEditingDocument(null);
      setDocumentTitle("");
      setDocumentContent("");
    }
    setDocumentError(null);
    setShowDocumentDialog(true);
  };

  const closeDocumentDialog = () => {
    setShowDocumentDialog(false);
    setEditingDocument(null);
    setDocumentTitle("");
    setDocumentContent("");
    setDocumentError(null);
  };

  const handleSaveDocument = async () => {
    setDocumentError(null);

    if (!documentTitle.trim()) {
      setDocumentError("Title is required");
      return;
    }
    if (!documentContent.trim()) {
      setDocumentError("Content is required");
      return;
    }

    try {
      if (editingDocument) {
        await updateDocumentMutation.mutateAsync({
          tourId,
          documentId: editingDocument.id,
          data: { title: documentTitle, content: documentContent },
        });
      } else {
        await createDocumentMutation.mutateAsync({
          tourId,
          data: { title: documentTitle, content: documentContent },
        });
      }
      closeDocumentDialog();
    } catch (err) {
      setDocumentError(err instanceof Error ? err.message : "Failed to save document");
    }
  };

  const handleDeleteDocument = async (documentId: number) => {
    if (confirm("Are you sure you want to delete this document?")) {
      try {
        await deleteDocumentMutation.mutateAsync({ tourId, documentId });
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to delete document");
      }
    }
  };

  const handleSetLandingDocument = async (documentId: number | null) => {
    try {
      await updateTourMutation.mutateAsync({
        id: tourId,
        data: { landing_document_id: documentId },
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to set landing document");
    }
  };

  // Settings handlers
  const handleSaveSettings = async () => {
    setSettingsError(null);
    setSettingsSaved(false);

    try {
      await updateTourMutation.mutateAsync({
        id: tourId,
        data: {
          banner_image_url: bannerImageUrl || null,
          scoring_mode: scoringMode,
          point_template_id: pointTemplateId,
        },
      });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : "Failed to save settings");
    }
  };

  // Category handlers
  const openCategoryDialog = (category?: TourCategory) => {
    if (category) {
      setEditingCategory(category);
      setCategoryName(category.name);
      setCategoryDescription(category.description || "");
    } else {
      setEditingCategory(null);
      setCategoryName("");
      setCategoryDescription("");
    }
    setCategoryError(null);
    setShowCategoryDialog(true);
  };

  const closeCategoryDialog = () => {
    setShowCategoryDialog(false);
    setEditingCategory(null);
    setCategoryName("");
    setCategoryDescription("");
    setCategoryError(null);
  };

  const handleSaveCategory = async () => {
    setCategoryError(null);

    if (!categoryName.trim()) {
      setCategoryError("Category name is required");
      return;
    }

    try {
      if (editingCategory) {
        await updateCategoryMutation.mutateAsync({
          tourId,
          categoryId: editingCategory.id,
          data: { name: categoryName, description: categoryDescription || undefined },
        });
      } else {
        await createCategoryMutation.mutateAsync({
          tourId,
          data: { name: categoryName, description: categoryDescription || undefined },
        });
      }
      closeCategoryDialog();
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : "Failed to save category");
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (confirm("Are you sure you want to delete this category? Enrolled players will have their category cleared.")) {
      try {
        await deleteCategoryMutation.mutateAsync({ tourId, categoryId });
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to delete category");
      }
    }
  };

  const handleMoveCategory = async (categoryId: number, direction: "up" | "down") => {
    if (!categories) return;

    const currentIndex = categories.findIndex(c => c.id === categoryId);
    if (currentIndex === -1) return;

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= categories.length) return;

    const newOrder = [...categories];
    const [moved] = newOrder.splice(currentIndex, 1);
    newOrder.splice(newIndex, 0, moved);

    try {
      await reorderCategoriesMutation.mutateAsync({
        tourId,
        categoryIds: newOrder.map(c => c.id),
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reorder categories");
    }
  };

  const handleAssignCategory = async (enrollmentId: number, categoryId: number | null) => {
    try {
      await assignEnrollmentCategoryMutation.mutateAsync({
        tourId,
        enrollmentId,
        categoryId,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to assign category");
    }
  };

  // Point template handlers
  const openPointTemplateDialog = (template?: PointTemplate) => {
    if (template) {
      setEditingPointTemplate(template);
      setPointTemplateName(template.name);
      try {
        const parsed = JSON.parse(template.points_structure);
        const { entries, defaultPoints } = structureToEntries(parsed);
        setPointTemplateEntries(entries);
        setPointTemplateDefaultPoints(defaultPoints);
      } catch {
        setPointTemplateEntries(getDefaultEntries());
        setPointTemplateDefaultPoints("10");
      }
    } else {
      setEditingPointTemplate(null);
      setPointTemplateName("");
      setPointTemplateEntries(getDefaultEntries());
      setPointTemplateDefaultPoints("10");
    }
    setPointTemplateError(null);
    setShowPointTemplateDialog(true);
  };

  const closePointTemplateDialog = () => {
    setShowPointTemplateDialog(false);
    setEditingPointTemplate(null);
    setPointTemplateName("");
    setPointTemplateEntries([]);
    setPointTemplateDefaultPoints("10");
    setPointTemplateError(null);
  };

  const addPointTemplateEntry = () => {
    const usedPositions = pointTemplateEntries.map((e) => parseInt(e.position)).filter((n) => !isNaN(n));
    const nextPosition = usedPositions.length > 0 ? Math.max(...usedPositions) + 1 : 1;
    const lastEntry = pointTemplateEntries[pointTemplateEntries.length - 1];
    const lastPoints = lastEntry ? parseInt(lastEntry.points) : 100;
    const suggestedPoints = Math.max(1, lastPoints - 10);

    setPointTemplateEntries([
      ...pointTemplateEntries,
      {
        id: crypto.randomUUID(),
        position: String(nextPosition),
        points: String(suggestedPoints),
      },
    ]);
  };

  const removePointTemplateEntry = (id: string) => {
    setPointTemplateEntries(pointTemplateEntries.filter((e) => e.id !== id));
  };

  const updatePointTemplateEntry = (id: string, field: "position" | "points", value: string) => {
    setPointTemplateEntries(
      pointTemplateEntries.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  const handleSavePointTemplate = async () => {
    setPointTemplateError(null);

    if (!pointTemplateName.trim()) {
      setPointTemplateError("Template name is required");
      return;
    }

    const validEntries = pointTemplateEntries.filter(
      (e) => e.position.trim() && !isNaN(parseInt(e.points))
    );

    if (validEntries.length === 0) {
      setPointTemplateError("Please add at least one position with points");
      return;
    }

    const positions = validEntries.map((e) => e.position.trim());
    const uniquePositions = new Set(positions);
    if (uniquePositions.size !== positions.length) {
      setPointTemplateError("Duplicate positions found. Each position must be unique.");
      return;
    }

    const pointsStructure = entriesToStructure(pointTemplateEntries, pointTemplateDefaultPoints);

    try {
      if (editingPointTemplate) {
        await updatePointTemplateMutation.mutateAsync({
          templateId: editingPointTemplate.id,
          data: { name: pointTemplateName, points_structure: pointsStructure },
        });
      } else {
        await createPointTemplateMutation.mutateAsync({
          name: pointTemplateName,
          points_structure: pointsStructure,
        });
      }
      closePointTemplateDialog();
    } catch (err) {
      setPointTemplateError(err instanceof Error ? err.message : "Failed to save template");
    }
  };

  const handleDeletePointTemplate = async (templateId: number) => {
    if (confirm("Are you sure you want to delete this point template?")) {
      try {
        await deletePointTemplateMutation.mutateAsync(templateId);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to delete template");
      }
    }
  };

  // Competition handlers
  const handleEditCompetition = (competition: TourCompetition) => {
    setEditingCompetitionId(competition.id);
    setShowCompetitionModal(true);
  };

  const handleDeleteCompetition = async (competition: TourCompetition) => {
    if (confirm(`Are you sure you want to delete "${competition.name}"?`)) {
      try {
        await deleteCompetitionMutation.mutateAsync(competition.id);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to delete competition");
      }
    }
  };

  const handleAddCompetition = () => {
    setEditingCompetitionId(null);
    setShowCompetitionModal(true);
  };

  // Initialize settings state when tour loads
  if (tour && bannerImageUrl === "" && tour.banner_image_url) {
    setBannerImageUrl(tour.banner_image_url);
  }
  if (tour && scoringMode !== tour.scoring_mode && tour.scoring_mode) {
    setScoringMode(tour.scoring_mode);
  }
  if (tour && pointTemplateId === null && tour.point_template_id) {
    setPointTemplateId(tour.point_template_id);
  }

  const getStatusBadge = (status: TourEnrollmentStatus) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-fairway/20 text-fairway">
            <Check className="h-3 w-3" />
            Active
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <Mail className="h-3 w-3" />
            Pending
          </span>
        );
      case "requested":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-turf/20 text-turf">
            <UserPlus className="h-3 w-3" />
            Requested
          </span>
        );
    }
  };

  // Get available users (not already admins)
  const availableUsers = users?.filter(
    (user) => !admins?.some((admin) => admin.user_id === user.id) && user.id !== tour?.owner_id
  );

  if (tourLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-fairway" />
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-red-600">Tour not found</h1>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate({ to: "/admin/tours" })}
          className="flex items-center gap-2 text-fairway hover:text-turf mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tours
        </button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-charcoal">{tour.name}</h1>
              <div className="flex gap-1">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    tour.visibility === "public"
                      ? "bg-fairway/20 text-fairway"
                      : "bg-charcoal/10 text-charcoal/70"
                  }`}
                >
                  {tour.visibility === "public" ? (
                    <Globe className="h-3 w-3" />
                  ) : (
                    <Lock className="h-3 w-3" />
                  )}
                  {tour.visibility}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    tour.scoring_mode === "net"
                      ? "bg-amber-100 text-amber-700"
                      : tour.scoring_mode === "both"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-charcoal/10 text-charcoal/70"
                  }`}
                  title={`Scoring: ${tour.scoring_mode}`}
                >
                  <Calculator className="h-3 w-3" />
                  {tour.scoring_mode}
                </span>
              </div>
            </div>
            {tour.description && <p className="text-charcoal/70">{tour.description}</p>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-rough mb-6">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab("competitions")}
            className={`flex items-center gap-2 pb-3 px-1 border-b-2 transition-colors ${
              activeTab === "competitions"
                ? "border-turf text-turf"
                : "border-transparent text-charcoal/60 hover:text-charcoal"
            }`}
          >
            <Trophy className="w-4 h-4" />
            Competitions
          </button>
          <button
            onClick={() => setActiveTab("enrollments")}
            className={`flex items-center gap-2 pb-3 px-1 border-b-2 transition-colors ${
              activeTab === "enrollments"
                ? "border-turf text-turf"
                : "border-transparent text-charcoal/60 hover:text-charcoal"
            }`}
          >
            <Users className="w-4 h-4" />
            Enrollments
            {enrollments && enrollments.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-charcoal/10 rounded-full">
                {enrollments.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={`flex items-center gap-2 pb-3 px-1 border-b-2 transition-colors ${
              activeTab === "categories"
                ? "border-turf text-turf"
                : "border-transparent text-charcoal/60 hover:text-charcoal"
            }`}
          >
            <Layers className="w-4 h-4" />
            Categories
            {categories && categories.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-charcoal/10 rounded-full">
                {categories.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("admins")}
            className={`flex items-center gap-2 pb-3 px-1 border-b-2 transition-colors ${
              activeTab === "admins"
                ? "border-turf text-turf"
                : "border-transparent text-charcoal/60 hover:text-charcoal"
            }`}
          >
            <Shield className="w-4 h-4" />
            Admins
          </button>
          <button
            onClick={() => setActiveTab("documents")}
            className={`flex items-center gap-2 pb-3 px-1 border-b-2 transition-colors ${
              activeTab === "documents"
                ? "border-turf text-turf"
                : "border-transparent text-charcoal/60 hover:text-charcoal"
            }`}
          >
            <FileText className="w-4 h-4" />
            Documents
            {documents && documents.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-charcoal/10 rounded-full">
                {documents.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("points")}
            className={`flex items-center gap-2 pb-3 px-1 border-b-2 transition-colors ${
              activeTab === "points"
                ? "border-turf text-turf"
                : "border-transparent text-charcoal/60 hover:text-charcoal"
            }`}
          >
            <Star className="w-4 h-4" />
            Points
            {tourPointTemplates && tourPointTemplates.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-charcoal/10 rounded-full">
                {tourPointTemplates.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2 pb-3 px-1 border-b-2 transition-colors ${
              activeTab === "settings"
                ? "border-turf text-turf"
                : "border-transparent text-charcoal/60 hover:text-charcoal"
            }`}
          >
            <Image className="w-4 h-4" />
            Settings
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "competitions" && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-charcoal">Competitions</h2>
              {competitions && competitions.length > 0 && (
                <p className="text-sm text-charcoal/60 mt-1">
                  {competitions.length} competition{competitions.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
            <button
              onClick={handleAddCompetition}
              className="flex items-center gap-2 px-4 py-2 bg-fairway text-white rounded-lg hover:bg-turf transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Competition
            </button>
          </div>

          <TourCompetitionList
            tourId={tourId}
            onEdit={handleEditCompetition}
            onDelete={handleDeleteCompetition}
          />
        </div>
      )}

      {activeTab === "enrollments" && (
        <div className="space-y-6">
          {/* Add Enrollment Form */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-charcoal mb-4">Add Player by Email</h3>
            <form onSubmit={handleAddEnrollment} className="flex gap-3">
              <div className="flex-1">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="player@example.com"
                  className="w-full px-4 py-2.5 border-2 border-soft-grey rounded-xl focus:border-turf focus:outline-none transition-colors"
                />
                {emailError && (
                  <p className="text-coral text-sm mt-1">{emailError}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={addEnrollmentMutation.isPending}
                className="flex items-center gap-2 px-4 py-2.5 bg-turf text-white rounded-xl hover:bg-fairway transition-colors disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </form>
            <p className="text-sm text-charcoal/50 mt-2">
              Add an email address to invite a player. They'll receive a pending enrollment
              until they register.
            </p>
          </div>

          {/* Enrollments List */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-charcoal">Enrollments</h3>
              <div className="flex gap-2">
                {(["all", "pending", "requested", "active"] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                      statusFilter === status
                        ? "bg-turf text-white"
                        : "bg-rough/30 text-charcoal hover:bg-rough/50"
                    }`}
                  >
                    {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {enrollmentsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-fairway" />
              </div>
            ) : enrollments && enrollments.length > 0 ? (
              <div className="divide-y divide-soft-grey">
                {enrollments.map((enrollment: TourEnrollment) => (
                  <div
                    key={enrollment.id}
                    className="py-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-charcoal">
                            {enrollment.player_name || enrollment.email}
                          </span>
                          {getStatusBadge(enrollment.status)}
                        </div>
                        {enrollment.player_name && (
                          <p className="text-sm text-charcoal/60">{enrollment.email}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Category selector */}
                      {categories && categories.length > 0 && (
                        <select
                          value={enrollment.category_id || ""}
                          onChange={(e) => handleAssignCategory(
                            enrollment.id,
                            e.target.value ? parseInt(e.target.value) : null
                          )}
                          disabled={assignEnrollmentCategoryMutation.isPending}
                          className="px-2 py-1 text-sm border border-soft-grey rounded-lg focus:border-turf focus:outline-none bg-white"
                          title="Assign category"
                        >
                          <option value="">No category</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      )}
                      {enrollment.status === "pending" && (
                        <button
                          onClick={() => copyRegistrationLink(enrollment.email)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                            copiedEmail === enrollment.email
                              ? "bg-fairway/20 text-fairway"
                              : "bg-rough/30 text-charcoal hover:bg-rough/50"
                          }`}
                          title="Copy registration link"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          {copiedEmail === enrollment.email ? "Copied!" : "Copy Link"}
                        </button>
                      )}
                      {enrollment.status === "requested" && (
                        <button
                          onClick={() => handleApprove(enrollment.id)}
                          disabled={approveEnrollmentMutation.isPending}
                          className="flex items-center gap-1 px-3 py-1.5 bg-fairway text-white rounded-lg text-sm hover:bg-turf transition-colors disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve
                        </button>
                      )}
                      <button
                        onClick={() => handleRemove(enrollment.id)}
                        disabled={removeEnrollmentMutation.isPending}
                        className="p-1.5 text-charcoal/60 hover:text-coral transition-colors"
                        title="Remove enrollment"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-charcoal/60">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No enrollments found.</p>
                <p className="text-sm mt-1">Add players by email to get started.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "admins" && (
        <div className="space-y-6">
          {/* Add Admin Form */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-charcoal mb-4">Add Tour Admin</h3>
            <div className="flex gap-3">
              <div className="flex-1">
                <select
                  value={selectedUserId || ""}
                  onChange={(e) => setSelectedUserId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-4 py-2.5 border-2 border-soft-grey rounded-xl focus:border-turf focus:outline-none transition-colors bg-white"
                >
                  <option value="">Select a user...</option>
                  {availableUsers?.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.email} ({user.role})
                    </option>
                  ))}
                </select>
                {adminError && (
                  <p className="text-coral text-sm mt-1">{adminError}</p>
                )}
              </div>
              <button
                onClick={handleAddAdmin}
                disabled={addAdminMutation.isPending || !selectedUserId}
                className="flex items-center gap-2 px-4 py-2.5 bg-turf text-white rounded-xl hover:bg-fairway transition-colors disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Add Admin
              </button>
            </div>
            <p className="text-sm text-charcoal/50 mt-2">
              Tour admins can manage enrollments and competitions for this tour.
            </p>
          </div>

          {/* Admins List */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-charcoal mb-4">Tour Admins</h3>

            {adminsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-fairway" />
              </div>
            ) : (
              <div className="divide-y divide-soft-grey">
                {/* Owner */}
                <div className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-turf/20 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-turf" />
                    </div>
                    <div>
                      <span className="font-medium text-charcoal">Tour Owner</span>
                      <p className="text-sm text-charcoal/60">Has full control over this tour</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-turf/20 text-turf text-xs rounded-full font-medium">
                    Owner
                  </span>
                </div>

                {/* Admins */}
                {admins && admins.length > 0 ? (
                  admins.map((admin) => (
                    <div
                      key={admin.id}
                      className="py-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-fairway/20 flex items-center justify-center">
                          <Users className="w-5 h-5 text-fairway" />
                        </div>
                        <div>
                          <span className="font-medium text-charcoal">{admin.email}</span>
                          <p className="text-sm text-charcoal/60">{admin.role}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveAdmin(admin.user_id)}
                        disabled={removeAdminMutation.isPending}
                        className="p-2 text-charcoal/60 hover:text-coral transition-colors"
                        title="Remove admin"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-charcoal/60">
                    <p>No additional admins.</p>
                    <p className="text-sm mt-1">Add users to help manage this tour.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "categories" && (
        <div className="space-y-6">
          {/* Categories Info */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-charcoal">Player Categories</h3>
                <p className="text-sm text-charcoal/60 mt-1">
                  Create categories to group players (e.g., Men, Women, Seniors). Categories can be used to filter standings.
                </p>
              </div>
              <button
                onClick={() => openCategoryDialog()}
                className="flex items-center gap-2 px-4 py-2 bg-fairway text-white rounded-lg hover:bg-turf transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Category
              </button>
            </div>
          </div>

          {/* Categories List */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-charcoal mb-4">Categories</h3>

            {categoriesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-fairway" />
              </div>
            ) : categories && categories.length > 0 ? (
              <div className="space-y-2">
                {categories.map((category, index) => (
                  <div
                    key={category.id}
                    className="border border-soft-grey rounded-lg p-4 hover:bg-light-rough/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Reorder buttons */}
                        <div className="flex flex-col">
                          <button
                            onClick={() => handleMoveCategory(category.id, "up")}
                            disabled={index === 0 || reorderCategoriesMutation.isPending}
                            className={`p-0.5 rounded transition-colors ${
                              index === 0
                                ? "text-charcoal/20 cursor-not-allowed"
                                : "text-charcoal/50 hover:text-turf"
                            }`}
                            title="Move up"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleMoveCategory(category.id, "down")}
                            disabled={index === categories.length - 1 || reorderCategoriesMutation.isPending}
                            className={`p-0.5 rounded transition-colors ${
                              index === categories.length - 1
                                ? "text-charcoal/20 cursor-not-allowed"
                                : "text-charcoal/50 hover:text-turf"
                            }`}
                            title="Move down"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-charcoal">{category.name}</h4>
                            <span className="px-2 py-0.5 bg-charcoal/10 text-charcoal/70 text-xs rounded-full">
                              {category.enrollment_count} {category.enrollment_count === 1 ? "player" : "players"}
                            </span>
                          </div>
                          {category.description && (
                            <p className="text-sm text-charcoal/60 mt-0.5">{category.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openCategoryDialog(category)}
                          className="p-2 text-charcoal/60 hover:text-turf transition-colors"
                          title="Edit category"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          disabled={deleteCategoryMutation.isPending}
                          className="p-2 text-charcoal/60 hover:text-coral transition-colors"
                          title="Delete category"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-charcoal/60">
                <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No categories yet.</p>
                <p className="text-sm mt-2">Create categories to organize players into groups.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "documents" && (
        <div className="space-y-6">
          {/* Landing Document Settings */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-charcoal mb-4">Landing Document</h3>
            <p className="text-sm text-charcoal/60 mb-4">
              Select a document to display as the main content when players view this tour.
            </p>
            <select
              value={tour?.landing_document_id || ""}
              onChange={(e) =>
                handleSetLandingDocument(e.target.value ? parseInt(e.target.value) : null)
              }
              className="w-full max-w-md px-4 py-2.5 border-2 border-soft-grey rounded-xl focus:border-turf focus:outline-none transition-colors bg-white"
            >
              <option value="">No landing document (show description)</option>
              {documents?.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.title}
                </option>
              ))}
            </select>
          </div>

          {/* Documents List */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-charcoal">Tour Documents</h3>
              <button
                onClick={() => openDocumentDialog()}
                className="flex items-center gap-2 px-4 py-2 bg-fairway text-white rounded-lg hover:bg-turf transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Document
              </button>
            </div>

            {documentsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-fairway" />
              </div>
            ) : documents && documents.length > 0 ? (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="border border-soft-grey rounded-lg p-4 hover:bg-light-rough/30 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-charcoal">{doc.title}</h4>
                          {tour?.landing_document_id === doc.id && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-turf/20 text-turf">
                              <Star className="w-3 h-3" />
                              Landing Page
                            </span>
                          )}
                        </div>
                        <div className="prose prose-sm prose-gray max-w-none mt-3">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {doc.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => openDocumentDialog(doc)}
                          className="p-2 text-charcoal/60 hover:text-turf transition-colors"
                          title="Edit document"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          disabled={deleteDocumentMutation.isPending}
                          className="p-2 text-charcoal/60 hover:text-coral transition-colors"
                          title="Delete document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-charcoal/60">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No documents yet.</p>
                <p className="text-sm mt-2">Add tour rules, information, or other content.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "points" && (
        <div className="space-y-6">
          {/* Points Templates Info */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-charcoal">Point Templates</h3>
                <p className="text-sm text-charcoal/60 mt-1">
                  Create point templates to define how positions translate to tour points.
                </p>
              </div>
              <button
                onClick={() => openPointTemplateDialog()}
                className="flex items-center gap-2 px-4 py-2 bg-fairway text-white rounded-lg hover:bg-turf transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Template
              </button>
            </div>
          </div>

          {/* Point Templates List */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-charcoal mb-4">Templates</h3>

            {tourPointTemplatesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-fairway" />
              </div>
            ) : tourPointTemplates && tourPointTemplates.length > 0 ? (
              <div className="space-y-4">
                {tourPointTemplates.map((template) => {
                  let points: PointsStructure = {};
                  try {
                    points = JSON.parse(template.points_structure);
                  } catch {
                    // ignore parse errors
                  }

                  const positionEntries = Object.entries(points)
                    .filter(([pos]) => pos !== "default")
                    .map(([pos, pts]) => ({ position: parseInt(pos), points: pts }))
                    .sort((a, b) => a.position - b.position);
                  const defaultPts = points["default"];

                  return (
                    <div
                      key={template.id}
                      className="border border-soft-grey rounded-lg p-4 hover:bg-light-rough/30 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-charcoal">{template.name}</h4>
                          {positionEntries.length > 0 && (
                            <div className="mt-2">
                              <table className="text-sm">
                                <thead>
                                  <tr className="text-charcoal/60 border-b border-rough">
                                    <th className="px-2 py-1 font-medium text-left">Pos</th>
                                    <th className="px-2 py-1 font-medium text-right">Pts</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {positionEntries.slice(0, 5).map(({ position, points: pts }) => (
                                    <tr key={position} className="border-b border-rough/50 last:border-0">
                                      <td className="px-2 py-1 text-charcoal/70">{position}</td>
                                      <td className="px-2 py-1 text-charcoal font-semibold text-right">{pts}</td>
                                    </tr>
                                  ))}
                                  {positionEntries.length > 5 && (
                                    <tr className="text-charcoal/50 text-xs">
                                      <td colSpan={2} className="px-2 py-1">
                                        +{positionEntries.length - 5} more...
                                      </td>
                                    </tr>
                                  )}
                                  {defaultPts !== undefined && (
                                    <tr className="border-t border-rough">
                                      <td className="px-2 py-1 text-charcoal/70 italic">Other</td>
                                      <td className="px-2 py-1 text-charcoal font-semibold text-right">{defaultPts}</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openPointTemplateDialog(template)}
                            className="p-2 text-charcoal/60 hover:text-turf transition-colors"
                            title="Edit template"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePointTemplate(template.id)}
                            disabled={deletePointTemplateMutation.isPending}
                            className="p-2 text-charcoal/60 hover:text-coral transition-colors"
                            title="Delete template"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-charcoal/50">
                <Star className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No point templates yet</p>
                <p className="text-sm mt-1">Create a template to define how standings translate to tour points</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "settings" && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-charcoal mb-6">Tour Settings</h3>

          <div className="space-y-6 max-w-2xl">
            {/* Banner Image URL */}
            <div>
              <label className="block text-sm font-medium text-charcoal mb-2">
                Banner Image URL
              </label>
              <input
                type="url"
                value={bannerImageUrl}
                onChange={(e) => setBannerImageUrl(e.target.value)}
                placeholder="https://example.com/banner.jpg"
                className="w-full px-4 py-2.5 border-2 border-soft-grey rounded-xl focus:border-turf focus:outline-none transition-colors"
              />
              <p className="text-sm text-charcoal/50 mt-1">
                URL to an image that will be displayed as the tour hero banner.
              </p>

              {/* Preview */}
              {bannerImageUrl && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-charcoal mb-2">Preview:</p>
                  <div className="relative h-32 rounded-lg overflow-hidden border border-soft-grey">
                    <img
                      src={bannerImageUrl}
                      alt="Banner preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "";
                        e.currentTarget.alt = "Failed to load image";
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Scoring Mode */}
            <div>
              <label className="block text-sm font-medium text-charcoal mb-2">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  Scoring Mode
                </div>
              </label>
              <select
                value={scoringMode}
                onChange={(e) => setScoringMode(e.target.value as TourScoringMode)}
                className="w-full max-w-md px-4 py-2.5 border-2 border-soft-grey rounded-xl focus:border-turf focus:outline-none transition-colors bg-white"
              >
                <option value="gross">Gross (Raw Scores)</option>
                <option value="net">Net (Handicap-Adjusted)</option>
                <option value="both">Both (Gross & Net)</option>
              </select>
              <p className="text-sm text-charcoal/50 mt-1">
                {scoringMode === "gross" && "Standings based on raw scores without handicap adjustments."}
                {scoringMode === "net" && "Standings based on handicap-adjusted net scores."}
                {scoringMode === "both" && "Display both gross and net scores in standings."}
              </p>
            </div>

            {/* Point Template */}
            <div>
              <label className="block text-sm font-medium text-charcoal mb-2">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Point Template
                </div>
              </label>
              <select
                value={pointTemplateId || ""}
                onChange={(e) => setPointTemplateId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full max-w-md px-4 py-2.5 border-2 border-soft-grey rounded-xl focus:border-turf focus:outline-none transition-colors bg-white"
              >
                <option value="">No point template (no standings points)</option>
                {tourPointTemplates?.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              <p className="text-sm text-charcoal/50 mt-1">
                Point template defines how standings points are awarded based on finishing position.
              </p>
              {pointTemplateId && tourPointTemplates && (
                <div className="mt-2 p-3 bg-rough/20 rounded-lg">
                  <p className="text-xs text-charcoal/70 font-medium mb-1">Points Structure:</p>
                  <p className="text-sm text-charcoal">
                    {(() => {
                      const template = tourPointTemplates.find(t => t.id === pointTemplateId);
                      if (!template) return "N/A";
                      try {
                        const structure = JSON.parse(template.points_structure);
                        return Object.entries(structure)
                          .slice(0, 5)
                          .map(([pos, pts]) => `${pos}: ${pts}pts`)
                          .join(", ") + (Object.keys(structure).length > 5 ? "..." : "");
                      } catch {
                        return "Invalid structure";
                      }
                    })()}
                  </p>
                </div>
              )}
            </div>

            {settingsError && (
              <p className="text-coral text-sm">{settingsError}</p>
            )}

            {settingsSaved && (
              <p className="text-fairway text-sm flex items-center gap-1">
                <Check className="w-4 h-4" />
                Settings saved successfully!
              </p>
            )}

            <button
              onClick={handleSaveSettings}
              disabled={updateTourMutation.isPending}
              className="flex items-center gap-2 px-6 py-2.5 bg-turf text-white rounded-xl hover:bg-fairway transition-colors disabled:opacity-50"
            >
              {updateTourMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Save Settings
            </button>
          </div>
        </div>
      )}

      {/* Document Dialog */}
      {showDocumentDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-soft-grey">
              <h2 className="text-xl font-semibold text-charcoal">
                {editingDocument ? "Edit Document" : "Create Document"}
              </h2>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={documentTitle}
                  onChange={(e) => setDocumentTitle(e.target.value)}
                  placeholder="Document title"
                  className="w-full px-4 py-2.5 border-2 border-soft-grey rounded-xl focus:border-turf focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal mb-2">
                  Content (Markdown supported)
                </label>
                <textarea
                  value={documentContent}
                  onChange={(e) => setDocumentContent(e.target.value)}
                  placeholder="Write your document content here. Markdown is supported."
                  rows={12}
                  className="w-full px-4 py-2.5 border-2 border-soft-grey rounded-xl focus:border-turf focus:outline-none transition-colors resize-none font-mono text-sm"
                />
              </div>

              {documentError && (
                <p className="text-coral text-sm">{documentError}</p>
              )}
            </div>

            <div className="p-6 border-t border-soft-grey flex justify-end gap-3">
              <button
                onClick={closeDocumentDialog}
                className="px-4 py-2 text-charcoal/70 hover:text-charcoal transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDocument}
                disabled={createDocumentMutation.isPending || updateDocumentMutation.isPending}
                className="flex items-center gap-2 px-6 py-2 bg-turf text-white rounded-lg hover:bg-fairway transition-colors disabled:opacity-50"
              >
                {(createDocumentMutation.isPending || updateDocumentMutation.isPending) ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {editingDocument ? "Save Changes" : "Create Document"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Dialog */}
      {showCategoryDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-soft-grey">
              <h2 className="text-xl font-semibold text-charcoal">
                {editingCategory ? "Edit Category" : "Create Category"}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-2">
                  Name <span className="text-coral">*</span>
                </label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="e.g., Men, Women, Seniors"
                  className="w-full px-4 py-2.5 border-2 border-soft-grey rounded-xl focus:border-turf focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={categoryDescription}
                  onChange={(e) => setCategoryDescription(e.target.value)}
                  placeholder="Optional description for this category"
                  rows={3}
                  className="w-full px-4 py-2.5 border-2 border-soft-grey rounded-xl focus:border-turf focus:outline-none transition-colors resize-none"
                />
              </div>

              {categoryError && (
                <p className="text-coral text-sm">{categoryError}</p>
              )}
            </div>

            <div className="p-6 border-t border-soft-grey flex justify-end gap-3">
              <button
                onClick={closeCategoryDialog}
                className="px-4 py-2 text-charcoal/70 hover:text-charcoal transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCategory}
                disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                className="flex items-center gap-2 px-6 py-2 bg-turf text-white rounded-lg hover:bg-fairway transition-colors disabled:opacity-50"
              >
                {(createCategoryMutation.isPending || updateCategoryMutation.isPending) ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {editingCategory ? "Save Changes" : "Create Category"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Point Template Dialog */}
      {showPointTemplateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-soft-grey">
              <h2 className="text-xl font-semibold text-charcoal">
                {editingPointTemplate ? "Edit Point Template" : "Create Point Template"}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-2">
                  Name <span className="text-coral">*</span>
                </label>
                <input
                  type="text"
                  value={pointTemplateName}
                  onChange={(e) => setPointTemplateName(e.target.value)}
                  placeholder="e.g., Standard Points, Major Points"
                  className="w-full px-4 py-2.5 border-2 border-soft-grey rounded-xl focus:border-turf focus:outline-none transition-colors"
                />
              </div>

              {/* Position Entries */}
              <div>
                <label className="block text-sm font-medium text-charcoal mb-2">
                  Points by Position
                </label>
                <div className="space-y-2">
                  {pointTemplateEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-2">
                      <div className="flex-1 flex items-center gap-2">
                        <span className="text-sm text-charcoal/60 w-6">#</span>
                        <input
                          type="number"
                          min="1"
                          value={entry.position}
                          onChange={(e) => updatePointTemplateEntry(entry.id, "position", e.target.value)}
                          className="w-16 px-3 py-2 border-2 border-soft-grey rounded-lg focus:border-turf focus:outline-none transition-colors text-center"
                          placeholder="Pos"
                        />
                        <span className="text-sm text-charcoal/60">=</span>
                        <input
                          type="number"
                          min="0"
                          value={entry.points}
                          onChange={(e) => updatePointTemplateEntry(entry.id, "points", e.target.value)}
                          className="w-24 px-3 py-2 border-2 border-soft-grey rounded-lg focus:border-turf focus:outline-none transition-colors text-center"
                          placeholder="Points"
                        />
                        <span className="text-sm text-charcoal/60">pts</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePointTemplateEntry(entry.id)}
                        className="p-2 text-charcoal/40 hover:text-coral transition-colors"
                        title="Remove position"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addPointTemplateEntry}
                  className="mt-3 flex items-center gap-2 text-sm text-turf hover:text-fairway transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Position
                </button>
              </div>

              {/* Default Points */}
              <div className="pt-2 border-t border-soft-grey">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-charcoal">
                    Default points
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={pointTemplateDefaultPoints}
                    onChange={(e) => setPointTemplateDefaultPoints(e.target.value)}
                    className="w-24 px-3 py-2 border-2 border-soft-grey rounded-lg focus:border-turf focus:outline-none transition-colors text-center"
                  />
                  <span className="text-sm text-charcoal/60">pts</span>
                </div>
                <p className="text-xs text-charcoal/60 mt-1">
                  Points awarded to positions not listed above
                </p>
              </div>

              {pointTemplateError && (
                <p className="text-coral text-sm">{pointTemplateError}</p>
              )}
            </div>

            <div className="p-6 border-t border-soft-grey flex justify-end gap-3">
              <button
                onClick={closePointTemplateDialog}
                className="px-4 py-2 text-charcoal/70 hover:text-charcoal transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePointTemplate}
                disabled={createPointTemplateMutation.isPending || updatePointTemplateMutation.isPending}
                className="flex items-center gap-2 px-6 py-2 bg-turf text-white rounded-lg hover:bg-fairway transition-colors disabled:opacity-50"
              >
                {(createPointTemplateMutation.isPending || updatePointTemplateMutation.isPending) ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {editingPointTemplate ? "Save Changes" : "Create Template"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Competition Modal */}
      <TourCompetitionModal
        tourId={tourId}
        open={showCompetitionModal}
        onOpenChange={(open) => {
          setShowCompetitionModal(open);
          if (!open) {
            setEditingCompetitionId(null);
          }
        }}
        competition={editingCompetition}
      />
    </div>
  );
}
