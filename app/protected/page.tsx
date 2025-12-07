import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Sparkles, Plus, Film, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddCreditsButton } from "@/components/add-credits-button";
import { Suspense } from "react";

async function getUserStories() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Get user profile with credits
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("credits, subscription_tier")
    .eq("user_id", user.id)
    .single();

  // Get user's stories
  const { data: stories } = await supabase
    .from("stories")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return { profile, stories: stories || [] };
}

async function StoriesContent() {
  const { profile, stories } = await getUserStories();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gradient-to-r from-slate-500 to-slate-600";
      case "generating":
        return "bg-gradient-to-r from-blue-500 to-cyan-500 animate-pulse";
      case "ready":
        return "bg-gradient-to-r from-emerald-500 to-green-500";
      case "rendering":
        return "bg-gradient-to-r from-amber-500 to-orange-500 animate-pulse";
      case "completed":
        return "bg-gradient-to-r from-purple-500 to-pink-500";
      case "failed":
        return "bg-gradient-to-r from-red-500 to-rose-600";
      default:
        return "bg-gradient-to-r from-gray-500 to-gray-600";
    }
  };

  return (
    <>
      {/* Header with gradient background */}
      <div className="mb-12 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 rounded-3xl blur-3xl -z-10" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-8 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm">
          <div className="flex-1">
            <h1 className="text-4xl md:text-5xl font-bold mb-3 gradient-text">My Stories</h1>
            <p className="text-lg text-muted-foreground">Create and manage your animated stories with AI magic</p>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <Link href="/protected/create" className="flex-1 md:flex-initial">
              <Button
                size="lg"
                className="w-full gradient-primary text-white hover:opacity-90 transition-all shadow-lg hover:shadow-xl"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Story
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {stories.length === 0 ? (
        <Card className="text-center py-16 border-2 border-dashed border-border/50 bg-card/50 backdrop-blur-sm animate-fade-in">
          <CardContent>
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-full blur-xl opacity-30 animate-pulse" />
              <Sparkles className="relative w-20 h-20 mx-auto text-primary" />
            </div>
            <h2 className="text-3xl font-bold mb-3 gradient-text">No stories yet</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
              Start your creative journey! Create your first animated story with the power of AI.
            </p>
            <Link href="/protected/create">
              <Button
                size="lg"
                className="gradient-primary text-white hover:opacity-90 transition-all shadow-lg hover:shadow-xl"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Your First Story
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
          {stories.map((story, index) => (
            <Link
              key={story.id}
              href={`/protected/story/${story.id}`}
              style={{ animationDelay: `${index * 0.1}s` }}
              className="animate-slide-up"
            >
              <Card className="card-hover h-full border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden group">
                {/* Gradient background effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-secondary/0 to-accent/0 group-hover:from-primary/10 group-hover:via-secondary/10 group-hover:to-accent/10 transition-all duration-500 -z-10" />

                <CardHeader className="space-y-4">
                  <div className="flex justify-between items-start gap-2">
                    <Badge className={`${getStatusColor(story.status)} text-white border-0 shadow-md`}>
                      {story.status}
                    </Badge>
                    <Badge variant="outline" className="border-primary/30 text-primary">
                      {story.style}
                    </Badge>
                  </div>
                  <CardTitle className="line-clamp-2 text-xl group-hover:text-primary transition-colors">
                    {story.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-3 text-base">{story.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {new Date(story.created_at).toLocaleDateString()}
                    </div>
                    {story.status === "completed" && (
                      <div className="flex items-center gap-1.5 text-success">
                        <Film className="w-4 h-4" />
                        Ready
                      </div>
                    )}
                    {story.status === "generating" && (
                      <div className="flex items-center gap-1.5 text-info">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

export default function ProtectedPage() {
  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        }
      >
        <StoriesContent />
      </Suspense>
    </div>
  );
}
