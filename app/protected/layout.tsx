import { DeployButton } from "@/components/deploy-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { MobileNav } from "@/components/mobile-nav";
import Link from "next/link";
import { Suspense } from "react";
import { Sparkles, Home, BookOpen } from "lucide-react";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Modern Navigation with gradient background */}
      <nav className="w-full border-b border-border/50 backdrop-blur-lg bg-background/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Brand */}
            <div className="flex items-center gap-6">
              <MobileNav />
              <Link
                href="/protected"
                className="flex items-center gap-2 font-bold text-lg gradient-text hover:opacity-80 transition-opacity"
              >
                <Sparkles className="w-6 h-6 text-primary" />
                <span className="hidden sm:inline">StoryTime AI</span>
              </Link>

              {/* Desktop Navigation Links */}
              <div className="hidden md:flex items-center gap-4">
                <Link
                  href="/protected"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-sm font-medium"
                >
                  <BookOpen className="w-4 h-4" />
                  My Stories
                </Link>
              </div>
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-3">
              <ThemeSwitcher />
              <Suspense>
                <AuthButton />
              </Suspense>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content with gradient background */}
      <div className="flex-1 relative">
        {/* Gradient background effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</div>
      </div>

      {/* Modern Footer */}
      <footer className="w-full border-t border-border/50 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>
                Powered by <span className="font-semibold gradient-text"> AI Magic</span>
              </span>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link href="/protected" className="hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link href="/protected" className="hover:text-foreground transition-colors">
                Terms
              </Link>
              <Link href="/protected" className="hover:text-foreground transition-colors">
                Support
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
