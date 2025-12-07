import { LoginForm } from "@/components/login-form";
import { Sparkles } from "lucide-react";
import Link from "next/link";

export default function Page() {
  return (
    <div className="flex min-h-screen w-full">
      {/* Left side - Gradient background with branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 gradient-primary animate-gradient" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />

        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
            <Sparkles className="w-8 h-8" />
            <span>StoryTime AI</span>
          </Link>

          <div className="space-y-6">
            <h1 className="text-5xl font-bold leading-tight">
              Create Amazing
              <br />
              Animated Stories
              <br />
              with AI
            </h1>
            <p className="text-xl text-white/90 max-w-md">
              Transform your ideas into stunning animated videos with the power of artificial intelligence.
            </p>
            <div className="flex items-center gap-4 pt-4">
              <div className="flex -space-x-2">
                <div className="w-10 h-10 rounded-full bg-white/20 border-2 border-white backdrop-blur-sm" />
                <div className="w-10 h-10 rounded-full bg-white/20 border-2 border-white backdrop-blur-sm" />
                <div className="w-10 h-10 rounded-full bg-white/20 border-2 border-white backdrop-blur-sm" />
              </div>
              <p className="text-sm text-white/80">Join 1000+ creators</p>
            </div>
          </div>

          <div className="text-sm text-white/60">© 2025 StoryTime AI. All rights reserved.</div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-10 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link href="/" className="flex lg:hidden items-center gap-2 mb-8">
            <Sparkles className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold gradient-text">StoryTime AI</span>
          </Link>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}
