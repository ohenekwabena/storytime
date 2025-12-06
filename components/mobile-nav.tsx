"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Home, BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(!open)}>
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        <span className="sr-only">Toggle menu</span>
      </Button>

      {/* Mobile menu overlay */}
      {open && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden" onClick={() => setOpen(false)}>
          <div
            className="fixed left-0 top-16 bottom-0 w-64 bg-card border-r border-border shadow-lg p-6 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-8">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="font-bold gradient-text">StoryTime AI</span>
            </div>
            <nav className="flex flex-col gap-2">
              <Link
                href="/protected"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors"
              >
                <Home className="w-5 h-5" />
                <span className="font-medium">Dashboard</span>
              </Link>
              <Link
                href="/protected"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors"
              >
                <BookOpen className="w-5 h-5" />
                <span className="font-medium">My Stories</span>
              </Link>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
