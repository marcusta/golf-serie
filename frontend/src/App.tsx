import { Outlet, useRouterState } from "@tanstack/react-router";
import TapScoreLogo from "./components/ui/TapScoreLogo";
import { Toaster } from "@/components/ui/sonner";

export default function App() {
  const { location } = useRouterState();

  // Check if we're in a competition round (full-screen mode)
  const isCompetitionRound =
    location.pathname.includes("/competitions/") &&
    (location.pathname.includes("/tee-times/") ||
      location.pathname.match(/\/competitions\/\d+$/));

  // Check if we're in a layout that already has its own header
  const hasOwnHeader =
    location.pathname.includes("/admin") ||
    location.pathname.includes("/player") ||
    location.pathname === "/login" ||
    location.pathname === "/register";

  if (isCompetitionRound || hasOwnHeader) {
    // Full-screen layout for competition rounds or layouts with their own headers
    return (
      <>
        <Outlet />
        <Toaster />
      </>
    );
  }

  // Regular layout for other pages (fallback/landing pages)
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-scorecard via-scorecard to-rough">
      <header className="border-b-2 border-soft-grey bg-fairway shadow-[0_2px_8px_rgba(27,67,50,0.15)] sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-center">
            <TapScoreLogo size="md" variant="color" layout="horizontal" />
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center w-full">
        <main className="w-full max-w-6xl px-4 py-8 flex-1">
          <div className="bg-scorecard rounded-xl shadow-[0_2px_8px_rgba(27,67,50,0.08)] border-2 border-soft-grey p-6 lg:p-8 min-h-[70vh]">
            <Outlet />
          </div>
        </main>
      </div>
      <Toaster />
    </div>
  );
}
