import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FileText, FileCheck, Package, Camera, ImagePlus, Lock, Clock3, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";

type DocumentCategory = {
  type: "plans" | "reports" | "photos" | "chef";
  title: string;
  description: string;
  icon: React.ReactNode;
  count: number;
  adminOnly?: boolean;
};

const ProjectOverview = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [materialCount, setMaterialCount] = useState(0);
  const [disturbanceCount, setDisturbanceCount] = useState(0);
  const [projectHoursTotal, setProjectHoursTotal] = useState(0);
  const [categories, setCategories] = useState<DocumentCategory[]>([
    {
      type: "photos",
      title: "Fotos",
      description: "Baufortschritt und Dokumentationsfotos",
      icon: <Camera className="h-8 w-8" />,
      count: 0,
    },
    {
      type: "plans",
      title: "Pläne",
      description: "Baupläne und technische Zeichnungen",
      icon: <FileText className="h-8 w-8" />,
      count: 0,
    },
    {
      type: "reports",
      title: "Arbeitsberichte",
      description: "Bautagebücher und Stundenberichte",
      icon: <FileCheck className="h-8 w-8" />,
      count: 0,
    },
    {
      type: "chef",
      title: "🔒 Chefordner",
      description: "Vertrauliche Chef-Dokumente",
      icon: <Lock className="h-8 w-8" />,
      count: 0,
      adminOnly: true,
    },
  ]);

  useEffect(() => {
    if (projectId) {
      checkAdminStatus();
      fetchProjectName();
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      fetchFileCounts();
      fetchMaterialCount();
      fetchProjectHoursTotal();
      fetchDisturbanceCount();
    }
  }, [projectId, isAdmin]);

  const checkAdminStatus = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "administrator")
      .maybeSingle();

    setIsAdmin(!!data);
  };

  const fetchProjectName = async () => {
    if (!projectId) return;

    const { data } = await supabase.from("projects").select("name").eq("id", projectId).single();

    if (data) {
      setProjectName(data.name);
    }
  };

  const fetchMaterialCount = async () => {
    if (!projectId) return;

    const { count } = await supabase
      .from("material_entries")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId);

    setMaterialCount(count || 0);
  };

  const fetchProjectHoursTotal = async () => {
    if (!projectId) return;

    const { data, error } = await supabase
      .from("time_entries")
      .select("stunden")
      .eq("project_id", projectId)
      .not("project_id", "is", null);

    if (!error) {
      const total = (data || []).reduce((sum, entry) => sum + Number(entry.stunden || 0), 0);
      setProjectHoursTotal(total);
    }
  };

  const fetchDisturbanceCount = async () => {
    if (!projectId) return;
    const { count } = await supabase
      .from("disturbances")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId);
    setDisturbanceCount(count || 0);
  };

  const fetchFileCounts = async () => {
    if (!projectId) return;

    const bucketMap: Record<string, string> = {
      plans: "project-plans",
      reports: "project-reports",
      photos: "project-photos",
      chef: "project-chef",
    };

    const updatedCategories = await Promise.all(
      categories.map(async (category) => {
        if (category.type === "chef" && !isAdmin) {
          return { ...category, count: 0 };
        }

        const bucket = bucketMap[category.type];
        const { data } = await supabase.storage.from(bucket).list(projectId);

        return {
          ...category,
          count: data?.length || 0,
        };
      })
    );

    setCategories(updatedCategories);
  };

  const handleQuickPhotoUpload = () => {
    navigate(`/projects/${projectId}/photos`);
  };

  const handleOpenProjectHours = () => {
    navigate(`/hours-report?tab=projekte&projectId=${projectId}`);
  };

  const visibleCategories = categories.filter((category) => !category.adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title={projectName} backPath="/projects" />

      <main className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">{projectName}</h1>
          <p className="text-muted-foreground">Dokumentation und Dateien</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {visibleCategories.map((category) => (
            <Card
              key={category.type}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(`/projects/${projectId}/${category.type}`)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="text-primary">{category.icon}</div>
                  <div className="text-2xl font-bold">{category.count}</div>
                </div>
                <CardTitle className="text-xl">{category.title}</CardTitle>
                <CardDescription>{category.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  Öffnen
                </Button>
              </CardContent>
            </Card>
          ))}

          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate(`/projects/${projectId}/materials`)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="text-primary">
                  <Package className="h-8 w-8" />
                </div>
                <div className="text-2xl font-bold">{materialCount}</div>
              </div>
              <CardTitle className="text-xl">Materialliste</CardTitle>
              <CardDescription>Verwendete Materialien dokumentieren</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                Öffnen
              </Button>
            </CardContent>
          </Card>

          {disturbanceCount > 0 && (
            <Card
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(`/disturbances`)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="text-primary">
                    <Zap className="h-8 w-8" />
                  </div>
                  <div className="text-2xl font-bold">{disturbanceCount}</div>
                </div>
                <CardTitle className="text-xl">Arbeitsberichte</CardTitle>
                <CardDescription>Zugeordnete Arbeitsberichte für dieses Projekt</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  Anzeigen
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={handleOpenProjectHours}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="text-primary">
                  <Clock3 className="h-8 w-8" />
                </div>
                <div className="text-2xl font-bold">{projectHoursTotal.toFixed(2)} h</div>
              </div>
              <CardTitle className="text-xl">Projektstunden</CardTitle>
              <CardDescription>Gesamte gebuchte Stunden für dieses Projekt anzeigen</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                Zur Auswertung
              </Button>
            </CardContent>
          </Card>
        </div>

        <Button
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg"
          size="icon"
          onClick={handleQuickPhotoUpload}
        >
          <ImagePlus className="h-6 w-6" />
        </Button>
      </main>
    </div>
  );
};

export default ProjectOverview;
