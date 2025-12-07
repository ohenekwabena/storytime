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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] md:hidden" onClick={() => setOpen(false)}>
          <div
            className="fixed left-0 top-0 h-full w-3/4 max-w-sm bg-background border-r border-border shadow-xl p-6 flex flex-col overflow-y-auto transform transition-transform duration-300 ease-in-out z-[101]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="font-bold gradient-text">StoryTime AI</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <nav className="flex flex-col gap-2 flex-1">
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
