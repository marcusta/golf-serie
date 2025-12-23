import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "../../hooks/useAuth";
import TapScoreLogo from "../../components/ui/TapScoreLogo";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login({ email, password });
      navigate({ to: "/player" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-scorecard to-rough flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-scorecard rounded-2xl shadow-lg p-8 border-2 border-soft-grey">
          <div className="flex justify-center mb-6">
            <TapScoreLogo size="lg" variant="color" layout="vertical" />
          </div>

          <h1 className="text-2xl font-bold text-charcoal text-center mb-6 font-['Inter']">
            Admin Login
          </h1>

          {error && (
            <div className="bg-coral/10 border border-coral text-coral rounded-lg p-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-charcoal mb-1 font-['Inter']"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 border-2 border-soft-grey rounded-xl focus:border-turf focus:outline-none transition-colors font-['Inter']"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-charcoal mb-1 font-['Inter']"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 border-2 border-soft-grey rounded-xl focus:border-turf focus:outline-none transition-colors font-['Inter']"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-turf text-scorecard rounded-xl font-semibold hover:bg-fairway transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-['Inter']"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-charcoal/70 font-['Inter']">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="text-turf hover:text-fairway font-medium"
              >
                Register
              </Link>
            </p>
          </div>

          <div className="mt-4 text-center">
            <Link
              to="/player"
              className="text-sm text-charcoal/50 hover:text-charcoal font-['Inter']"
            >
              ← Back to Player View
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
