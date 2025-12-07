import { SignUpForm } from "@/components/sign-up-form";
import { Sparkles, Zap, Film, Wand2 } from "lucide-react";
import Link from "next/link";

export default function Page() {
  return (
    <div className="flex min-h-screen w-full">
      {/* Left side - Gradient background with branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 gradient-primary animate-gradient" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />

        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
            <Sparkles className="w-8 h-8" />
            <span>StoryTime AI</span>
          </Link>

          <div className="space-y-8">
            <h1 className="text-5xl font-bold leading-tight">
              Start Your
              <br />
              Creative Journey
              <br />
              Today
            </h1>
            <p className="text-xl text-white/90 max-w-md">
              Join thousands of creators making amazing animated stories with AI.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="glass-effect p-4 rounded-xl">
                <Zap className="w-6 h-6 mb-2" />
                <p className="text-sm font-medium">Fast Generation</p>
              </div>
              <div className="glass-effect p-4 rounded-xl">
                <Film className="w-6 h-6 mb-2" />
                <p className="text-sm font-medium">HD Quality</p>
              </div>
              <div className="glass-effect p-4 rounded-xl">
                <Wand2 className="w-6 h-6 mb-2" />
                <p className="text-sm font-medium">AI Powered</p>
              </div>
              <div className="glass-effect p-4 rounded-xl">
                <Sparkles className="w-6 h-6 mb-2" />
                <p className="text-sm font-medium">Easy to Use</p>
              </div>
            </div>
          </div>

          <div className="text-sm text-white/60">© 2025 StoryTime AI. All rights reserved.</div>
        </div>
      </div>

      {/* Right side - Sign up form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-10 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link href="/" className="flex lg:hidden items-center gap-2 mb-8">
            <Sparkles className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold gradient-text">StoryTime AI</span>
          </Link>

          <SignUpForm />
        </div>
      </div>
    </div>
  );
}
