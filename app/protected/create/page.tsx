"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { generateStoryAction } from "@/app/actions/ai-actions";
import { Loader2, Sparkles, BookOpen, Users, Image as ImageIcon } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CreateStoryPage() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<"cartoon" | "anime" | "realistic" | "comic">("cartoon");
  const [targetLength, setTargetLength] = useState<"short" | "medium" | "long">("short");
  const [ageGroup, setAgeGroup] = useState<"toddler" | "preschool" | "elementary">("preschool");
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a story prompt");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateStoryAction({
        prompt,
        style,
        targetLength,
        ageGroup,
      });

      if (result.error) {
        setError(result.error);
      } else if (result.story) {
        // Navigate to story editor
        router.push(`/protected/story/${result.story.id}`);
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const examplePrompts = [
    "A brave little bunny who learns to overcome their fear of the dark",
    "Two best friends who discover a magical garden in their backyard",
    "A curious kitten who goes on an adventure to find the perfect birthday gift",
    "A young dragon who wants to be a chef instead of scary",
  ];

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center justify-center gap-2">
            <Sparkles className="w-8 h-8 text-yellow-500" />
            Create Your Story
          </h1>
          <p className="text-muted-foreground">
            Describe your story idea and let AI bring it to life with characters and animations
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Story Details</CardTitle>
            <CardDescription>Tell us about the story you want to create</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Prompt Input */}
            <div className="space-y-2">
              <Label htmlFor="prompt">Story Idea</Label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your story idea..."
                className="w-full min-h-[120px] p-3 rounded-md border border-input bg-background"
                disabled={isGenerating}
              />
              <p className="text-sm text-muted-foreground">
                Be specific about characters, setting, and what happens in the story
              </p>
            </div>

            {/* Example Prompts */}
            <div className="space-y-2">
              <Label>Need inspiration? Try these:</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {examplePrompts.map((example, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    onClick={() => setPrompt(example)}
                    disabled={isGenerating}
                    className="text-left justify-start h-auto py-2 whitespace-normal"
                  >
                    {example}
                  </Button>
                ))}
              </div>
            </div>

            {/* Style Selection */}
            <div className="space-y-2">
              <Label>Animation Style</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {(["cartoon", "anime", "realistic", "comic"] as const).map((s) => (
                  <Button
                    key={s}
                    variant={style === s ? "default" : "outline"}
                    onClick={() => setStyle(s)}
                    disabled={isGenerating}
                    className="capitalize"
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    {s}
                  </Button>
                ))}
              </div>
            </div>

            {/* Length Selection */}
            <div className="space-y-2">
              <Label>Story Length</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["short", "medium", "long"] as const).map((len) => (
                  <Button
                    key={len}
                    variant={targetLength === len ? "default" : "outline"}
                    onClick={() => setTargetLength(len)}
                    disabled={isGenerating}
                    className="capitalize"
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    {len}
                  </Button>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">Short: 2-3 min • Medium: 4-6 min • Long: 7-10 min</p>
            </div>

            {/* Age Group Selection */}
            <div className="space-y-2">
              <Label>Age Group</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["toddler", "preschool", "elementary"] as const).map((age) => (
                  <Button
                    key={age}
                    variant={ageGroup === age ? "default" : "outline"}
                    onClick={() => setAgeGroup(age)}
                    disabled={isGenerating}
                    className="capitalize"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    {age}
                  </Button>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive rounded-md text-destructive text-sm">
                {error}
              </div>
            )}

            {/* Generate Button */}
            <Button onClick={handleGenerate} disabled={isGenerating || !prompt.trim()} className="w-full" size="lg">
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Your Story...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Story (10 Credits)
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Info Cards */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">What happens next?</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              AI will generate a complete story script with scenes, characters, and dialogue
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Automatic Generation</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Characters and backgrounds will be created based on your story
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Edit & Export</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Customize scenes, then export your animated video
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}
