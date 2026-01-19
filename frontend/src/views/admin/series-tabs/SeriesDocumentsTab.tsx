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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Edit, FileText, Plus, Save, Trash2 } from "lucide-react";
import MarkdownEditor from "@/components/MarkdownEditor";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useNotification } from "@/hooks/useNotification";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";

interface SeriesDocumentsTabProps {
  seriesId: number;
  series: Series;
}

export function SeriesDocumentsTab({ seriesId, series }: SeriesDocumentsTabProps) {
  const { showError } = useNotification();
  const { confirm, dialog } = useConfirmDialog();

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
    const shouldDelete = await confirm({
      title: "Delete document?",
      description: isLandingPage
        ? `Deleting "${document.title}" will unset the landing page.`
        : `Delete "${document.title}"?`,
      confirmLabel: "Delete document",
      variant: "destructive",
    });
    if (!shouldDelete) return;
    try {
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
    <>
      <div className="space-y-6">
      {/* Landing Page Settings Section */}
      <div className="bg-white border border-soft-grey rounded-lg p-4">
        <div className="text-sm font-semibold uppercase tracking-wide text-charcoal mb-3">
          Landing Page Settings
        </div>
        <div className="space-y-2">
          <label
            htmlFor="landing-document"
            className="text-xs font-semibold uppercase tracking-wide text-charcoal/70"
          >
            Landing Page Document
          </label>
          <Select
            value={landingDocumentId ? landingDocumentId.toString() : "none"}
            onValueChange={(value) =>
              setLandingDocumentId(value === "none" ? undefined : parseInt(value))
            }
          >
            <SelectTrigger className="w-full h-9">
              <SelectValue placeholder="None (use series description)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None (use series description)</SelectItem>
              {documents?.map((doc) => (
                <SelectItem key={doc.id} value={doc.id.toString()}>
                  {doc.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-charcoal/60">
            Select which document players will see as the main content for this series.
          </p>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveLandingPage}
            disabled={updateSeries.isPending}
            className="h-8 px-2 rounded-md text-sm"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Landing Page Settings
          </Button>
          {landingDocumentId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreviewDialog(true)}
              className="h-8 px-2 rounded-md text-sm"
            >
              Preview
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-charcoal">
          Series Documents
        </h3>
        <Button onClick={handleCreateDocument} className="h-9 px-3 rounded-md text-sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Document
        </Button>
      </div>

      <div className="bg-white border border-soft-grey rounded-lg overflow-hidden">
        {documents && documents.length > 0 ? (
          <>
            <div className="grid grid-cols-[minmax(220px,2fr)_160px_140px] gap-4 px-4 py-2 text-xs font-semibold text-charcoal/70 uppercase tracking-wide border-b border-soft-grey bg-soft-grey/30">
              <div>Document</div>
              <div>Status</div>
              <div className="text-right">Actions</div>
            </div>
            <div className="divide-y divide-soft-grey">
              {documents.map((document) => (
                <div
                  key={document.id}
                  className="grid grid-cols-[minmax(220px,2fr)_160px_140px] gap-4 px-4 py-2 text-sm items-center"
                >
                  <div>
                    <div className="font-medium text-charcoal">{document.title}</div>
                    <div className="text-xs text-charcoal/60 line-clamp-1">
                      {document.content}
                    </div>
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-charcoal/60">
                    {series.landing_document_id === document.id ? "Landing" : "Standard"}
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditDocument(document)}
                      className="h-8 px-2 rounded-md text-sm"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteDocument(document)}
                      className="h-8 px-2 rounded-md text-sm text-flag hover:text-flag hover:bg-flag/10"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-10 text-charcoal/60">
            <FileText className="h-10 w-10 text-charcoal/40 mx-auto mb-3" />
            <p>No documents created yet.</p>
            <Button
              variant="outline"
              onClick={handleCreateDocument}
              className="mt-4 h-9 px-3 rounded-md text-sm"
            >
              Create your first document
            </Button>
          </div>
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
              <label
                htmlFor="document-title"
                className="text-xs font-semibold uppercase tracking-wide text-charcoal/70"
              >
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
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="document-content"
                className="text-xs font-semibold uppercase tracking-wide text-charcoal/70"
              >
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
                className="h-9 px-3 rounded-md text-sm"
              >
                Cancel
              </Button>
              <Button type="submit" className="h-9 px-3 rounded-md text-sm">
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
            <p className="text-sm text-charcoal/60">
              This is how players will see the landing page for this series:
            </p>

            {!selectedDoc ? (
              <div className="border border-soft-grey rounded-md p-4 bg-soft-grey/30">
                <p className="text-charcoal/60">
                  No document selected for preview.
                </p>
              </div>
            ) : (
              <div className="border border-soft-grey rounded-md overflow-hidden">
                {/* Preview header */}
                <div className="bg-soft-grey/30 border-b border-soft-grey px-4 py-2">
                  <h3 className="font-medium text-charcoal">
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
              className="h-9 px-3 rounded-md text-sm"
            >
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
      {dialog}
    </>
  );
}
