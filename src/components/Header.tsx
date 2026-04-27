import { Link, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Salad, BookmarkCheck, Target, LogOut, LogIn } from "lucide-react";

export function Header() {
  const { user, signOut } = useAuth();
  const loc = useLocation();
  const isActive = (p: string) => loc.pathname === p;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Salad className="h-4 w-4" />
          </span>
          <span className="text-lg">MacroChef</span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link to="/search" search={{ q: "", subs: true }}>
            <Button variant={isActive("/search") ? "secondary" : "ghost"} size="sm">
              Search
            </Button>
          </Link>
          {user ? (
            <>
              <Link to="/saved">
                <Button variant={isActive("/saved") ? "secondary" : "ghost"} size="sm">
                  <BookmarkCheck className="mr-1.5 h-4 w-4" /> Saved
                </Button>
              </Link>
              <Link to="/goals">
                <Button variant={isActive("/goals") ? "secondary" : "ghost"} size="sm">
                  <Target className="mr-1.5 h-4 w-4" /> Goals
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Link to="/auth">
              <Button size="sm">
                <LogIn className="mr-1.5 h-4 w-4" /> Sign in
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
