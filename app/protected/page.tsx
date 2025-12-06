import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Sparkles, Plus, Film, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
        return "bg-gray-500";
      case "generating":
        return "bg-blue-500";
      case "ready":
        return "bg-green-500";
      case "rendering":
        return "bg-yellow-500";
      case "completed":
        return "bg-purple-500";
      case "failed":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">My Stories</h1>
          <p className="text-muted-foreground">Create and manage your animated stories</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Credits</p>
            <p className="text-2xl font-bold">{profile?.credits || 0}</p>
          </div>
          <Link href="/protected/create">
            <Button size="lg">
              <Plus className="w-5 h-5 mr-2" />
              Create New Story
            </Button>
          </Link>
        </div>
      </div>

      {stories.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2">No stories yet</h2>
            <p className="text-muted-foreground mb-6">Start creating your first animated story!</p>
            <Link href="/protected/create">
              <Button size="lg">
                <Plus className="w-5 h-5 mr-2" />
                Create Your First Story
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stories.map((story) => (
            <Link key={story.id} href={`/protected/story/${story.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <Badge className={getStatusColor(story.status)}>{story.status}</Badge>
                    <Badge variant="outline">{story.style}</Badge>
                  </div>
                  <CardTitle className="line-clamp-2">{story.title}</CardTitle>
                  <CardDescription className="line-clamp-3">{story.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {new Date(story.created_at).toLocaleDateString()}
                    </div>
                    {story.status === "completed" && (
                      <div className="flex items-center gap-1">
                        <Film className="w-4 h-4" />
                        Ready
                      </div>
                    )}
                    {story.status === "generating" && (
                      <div className="flex items-center gap-1">
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
