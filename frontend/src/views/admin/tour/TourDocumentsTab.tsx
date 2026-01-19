import { useState } from "react";
import {
  Loader2,
  Plus,
  FileText,
  Edit2,
  Trash2,
  Check,
  Star,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  useTourDocuments,
  useCreateTourDocument,
  useUpdateTourDocument,
  useDeleteTourDocument,
  useUpdateTour,
  type TourDocument,
  type Tour,
} from "../../../api/tours";
import { useNotification, formatErrorMessage } from "@/hooks/useNotification";

interface TourDocumentsTabProps {
  tourId: number;
  tour: Tour;
}

export function TourDocumentsTab({ tourId, tour }: TourDocumentsTabProps) {
  const { showError } = useNotification();
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [editingDocument, setEditingDocument] = useState<TourDocument | null>(null);
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentContent, setDocumentContent] = useState("");
  const [documentError, setDocumentError] = useState<string | null>(null);

  const { data: documents, isLoading: documentsLoading } = useTourDocuments(tourId);

  const createDocumentMutation = useCreateTourDocument();
  const updateDocumentMutation = useUpdateTourDocument();
  const deleteDocumentMutation = useDeleteTourDocument();
  const updateTourMutation = useUpdateTour();

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
        showError(formatErrorMessage(err, "Failed to delete document"));
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
      showError(formatErrorMessage(err, "Failed to set landing document"));
    }
  };

  return (
    <div className="space-y-6">
      {/* Landing Document Settings */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-charcoal mb-4">Landing Document</h3>
        <p className="text-sm text-charcoal/60 mb-4">
          Select a document to display as the main content when players view this tour.
        </p>
        <select
          value={tour.landing_document_id || ""}
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
                      {tour.landing_document_id === doc.id && (
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
    </div>
  );
}
