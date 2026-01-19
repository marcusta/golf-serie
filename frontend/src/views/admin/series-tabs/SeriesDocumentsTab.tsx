import { useState, useEffect } from "react";
import {
  type Series,
  type SeriesDocument,
  useSeriesDocuments,
  useCreateSeriesDocument,
  useUpdateSeriesDocument,
  useDeleteSeriesDocument,
  useUpdateSeries,
} from "@/api/series";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Edit, FileText, Plus, Save, Trash2 } from "lucide-react";
import MarkdownEditor from "@/components/MarkdownEditor";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useNotification } from "@/hooks/useNotification";

interface SeriesDocumentsTabProps {
  seriesId: number;
  series: Series;
}

export function SeriesDocumentsTab({ seriesId, series }: SeriesDocumentsTabProps) {
  const { showError } = useNotification();

  const { data: documents } = useSeriesDocuments(seriesId);
  const createDocument = useCreateSeriesDocument();
  const updateDocument = useUpdateSeriesDocument();
  const deleteDocument = useDeleteSeriesDocument();
  const updateSeries = useUpdateSeries();

  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [editingDocument, setEditingDocument] = useState<SeriesDocument | null>(null);
  const [documentForm, setDocumentForm] = useState({
    title: "",
    content: "",
  });
  const [landingDocumentId, setLandingDocumentId] = useState<number | undefined>(
    series.landing_document_id
  );

  // Sync landing document ID when series changes
  useEffect(() => {
    setLandingDocumentId(series.landing_document_id);
  }, [series.landing_document_id]);

  // Fix scrolling issue when document dialog closes
  useEffect(() => {
    if (!showDocumentDialog) {
      document.body.style.overflow = "";
    }
  }, [showDocumentDialog]);

  // Cleanup body overflow on component unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

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
      showError("Failed to save document. Please try again.");
    }
  };

  const handleDeleteDocument = async (document: SeriesDocument) => {
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
          setLandingDocumentId(undefined);
        }

        await deleteDocument.mutateAsync({
          seriesId,
          documentId: document.id,
        });
      } catch (error) {
        console.error("Failed to delete document:", error);
        showError("Failed to delete document. Please try again.");
      }
    }
  };

  const handleSaveLandingPage = async () => {
    try {
      await updateSeries.mutateAsync({
        id: series.id,
        data: {
          landing_document_id: landingDocumentId,
        },
      });
    } catch (error) {
      console.error("Failed to update landing page:", error);
      showError("Failed to update landing page. Please try again.");
    }
  };

  const selectedDoc = documents?.find((doc) => doc.id === landingDocumentId);

  return (
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
              value={landingDocumentId || ""}
              onChange={(e) => {
                const value = e.target.value;
                setLandingDocumentId(value ? parseInt(value) : undefined);
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
              onClick={handleSaveLandingPage}
              disabled={updateSeries.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Landing Page Settings
            </Button>
            {landingDocumentId && (
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
                    {series.landing_document_id === document.id && (
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

            {!selectedDoc ? (
              <div className="border rounded-lg p-4 bg-gray-50">
                <p className="text-gray-500">
                  No document selected for preview.
                </p>
              </div>
            ) : (
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
            )}
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
    </div>
  );
}
