import { Outlet } from "@tanstack/react-router";

function GolfIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="inline-block mr-2 align-middle"
    >
      <ellipse cx="16" cy="26" rx="12" ry="4" fill="#22c55e" />
      <rect x="15" y="6" width="2" height="16" rx="1" fill="#374151" />
      <path d="M16 6L24 10L16 14V6Z" fill="#ef4444" />
      <circle
        cx="16"
        cy="6"
        r="1.5"
        fill="#fff"
        stroke="#374151"
        strokeWidth="0.5"
      />
    </svg>
  );
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-green-50 via-white to-green-50">
      <header className="border-b bg-white/95 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-3">
              <GolfIcon />
              <h1 className="text-2xl font-bold text-gray-900">
                Golf Scorecard
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center w-full">
        <main className="w-full max-w-6xl px-4 py-8 flex-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8 min-h-[70vh]">
            <Outlet />
          </div>
        </main>
      </div>

      <footer className="bg-white border-t border-gray-200 py-6 mt-auto">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <GolfIcon />
            <span className="font-medium text-gray-900">Golf Scorecard</span>
          </div>
          <p className="text-sm text-gray-600">
            &copy; {new Date().getFullYear()} Golf Scorecard. Made with ❤️ for
            golf enthusiasts.
          </p>
        </div>
      </footer>
    </div>
  );
}
