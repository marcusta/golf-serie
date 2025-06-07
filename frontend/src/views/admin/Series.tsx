import { useState } from "react";
import {
  useSeries,
  useCreateSeries,
  useUpdateSeries,
  useDeleteSeries,
  type Series,
} from "@/api/series";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Trophy,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Image,
  Users,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Link } from "@tanstack/react-router";

function SeriesSkeleton() {
  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-[200px]" />
          <Skeleton className="h-5 w-[80px] rounded-full" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-[150px]" />
      </CardContent>
    </Card>
  );
}

export default function AdminSeries() {
  const { data: series, isLoading, error } = useSeries();
  const createSeries = useCreateSeries();
  const updateSeries = useUpdateSeries();
  const deleteSeries = useDeleteSeries();

  const [showDialog, setShowDialog] = useState(false);
  const [editingSeries, setEditingSeries] = useState<Series | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    banner_image_url: "",
    is_public: true,
  });

  const handleCreate = () => {
    setEditingSeries(null);
    setFormData({
      name: "",
      description: "",
      banner_image_url: "",
      is_public: true,
    });
    setShowDialog(true);
  };

  const handleEdit = (series: Series) => {
    setEditingSeries(series);
    setFormData({
      name: series.name,
      description: series.description || "",
      banner_image_url: series.banner_image_url || "",
      is_public: series.is_public,
    });
    setShowDialog(true);
  };

  const handleDelete = async (series: Series) => {
    if (
      window.confirm(`Are you sure you want to delete series "${series.name}"?`)
    ) {
      try {
        await deleteSeries.mutateAsync(series.id);
      } catch (error) {
        console.error("Failed to delete series:", error);
        alert("Failed to delete series. Please try again.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const data = {
        name: formData.name,
        description: formData.description || undefined,
        banner_image_url: formData.banner_image_url || undefined,
        is_public: formData.is_public,
      };

      if (editingSeries) {
        await updateSeries.mutateAsync({ id: editingSeries.id, data });
      } else {
        await createSeries.mutateAsync(data);
      }
      setShowDialog(false);
    } catch (error) {
      console.error("Failed to save series:", error);
      alert("Failed to save series. Please try again.");
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (isLoading) {
    return (
      <>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Trophy className="h-8 w-8 text-blue-600" />
              <h2 className="text-3xl font-bold text-gray-900">Series</h2>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="text-sm">
                Loading...
              </Badge>
              <Button
                onClick={handleCreate}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Series
              </Button>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <SeriesSkeleton key={i} />
            ))}
          </div>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingSeries ? "Edit Series" : "Create New Series"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Series Name
                </label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter series name"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Description
                </label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter series description (optional)"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="banner_image_url"
                  className="text-sm font-medium"
                >
                  Banner Image URL
                </label>
                <Input
                  id="banner_image_url"
                  name="banner_image_url"
                  type="url"
                  value={formData.banner_image_url}
                  onChange={handleInputChange}
                  placeholder="https://example.com/banner.jpg (optional)"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_public"
                  checked={formData.is_public}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_public: checked }))
                  }
                />
                <label htmlFor="is_public" className="text-sm font-medium">
                  Public series (visible to players)
                </label>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingSeries ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Trophy className="h-8 w-8 text-blue-600" />
              <h2 className="text-3xl font-bold text-gray-900">Series</h2>
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={handleCreate}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Series
              </Button>
            </div>
          </div>
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2 text-red-700">
                <Trophy className="h-5 w-5" />
                <p className="font-medium">Error loading series</p>
              </div>
              <p className="text-red-600 text-sm mt-2">
                Please try refreshing the page or contact support if the problem
                persists. You can still create new series using the button
                above.
              </p>
            </CardContent>
          </Card>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingSeries ? "Edit Series" : "Create New Series"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Series Name
                </label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter series name"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Description
                </label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter series description (optional)"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="banner_image_url"
                  className="text-sm font-medium"
                >
                  Banner Image URL
                </label>
                <Input
                  id="banner_image_url"
                  name="banner_image_url"
                  type="url"
                  value={formData.banner_image_url}
                  onChange={handleInputChange}
                  placeholder="https://example.com/banner.jpg (optional)"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_public"
                  checked={formData.is_public}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_public: checked }))
                  }
                />
                <label htmlFor="is_public" className="text-sm font-medium">
                  Public series (visible to players)
                </label>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingSeries ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Trophy className="h-8 w-8 text-blue-600" />
            <h2 className="text-3xl font-bold text-gray-900">Series</h2>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="text-sm">
              {series?.length || 0} {series?.length === 1 ? "series" : "series"}
            </Badge>
            <Button onClick={handleCreate} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Series
            </Button>
          </div>
        </div>

        {!series || series.length === 0 ? (
          <Card className="border-dashed border-2 border-gray-300">
            <CardContent className="p-12 text-center">
              <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No series yet
              </h3>
              <p className="text-gray-600">
                Create series to organize multiple competitions into
                tournaments.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {series.map((seriesItem) => (
              <Card
                key={seriesItem.id}
                className="hover:shadow-lg transition-shadow duration-200"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-blue-600" />
                        {seriesItem.name}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          #{seriesItem.id}
                        </Badge>
                        <Badge
                          variant={
                            seriesItem.is_public ? "default" : "secondary"
                          }
                          className="text-xs flex items-center gap-1"
                        >
                          {seriesItem.is_public ? (
                            <Eye className="h-3 w-3" />
                          ) : (
                            <EyeOff className="h-3 w-3" />
                          )}
                          {seriesItem.is_public ? "Public" : "Private"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(seriesItem)}
                        className="h-8 w-8"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(seriesItem)}
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {seriesItem.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {seriesItem.description}
                    </p>
                  )}
                  {seriesItem.banner_image_url && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                      <Image className="h-4 w-4" />
                      <span>Has banner image</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <Link
                        to="/admin/teams"
                        className="flex items-center gap-1 hover:text-blue-600"
                      >
                        <Users className="h-4 w-4" />
                        <span>Teams</span>
                      </Link>
                      <Link
                        to="/admin/competitions"
                        className="flex items-center gap-1 hover:text-blue-600"
                      >
                        <Calendar className="h-4 w-4" />
                        <span>Competitions</span>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSeries ? "Edit Series" : "Create New Series"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Series Name
              </label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter series name"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Enter series description (optional)"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="banner_image_url" className="text-sm font-medium">
                Banner Image URL
              </label>
              <Input
                id="banner_image_url"
                name="banner_image_url"
                type="url"
                value={formData.banner_image_url}
                onChange={handleInputChange}
                placeholder="https://example.com/banner.jpg (optional)"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_public"
                checked={formData.is_public}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, is_public: checked }))
                }
              />
              <label htmlFor="is_public" className="text-sm font-medium">
                Public series (visible to players)
              </label>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingSeries ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
