import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "../../hooks/useAuth";
import TapScoreLogo from "../../components/ui/TapScoreLogo";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { AlertCircle } from "lucide-react";

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
        <div className="bg-scorecard rounded-lg p-8">
          <div className="flex justify-center mb-8">
            <TapScoreLogo size="lg" variant="color" layout="vertical" />
          </div>

          <h1 className="text-display-md text-charcoal text-center mb-8">
            Admin Login
          </h1>

          {error && (
            <Alert
              variant="destructive"
              className="mb-6 bg-coral/10 border-coral/30 text-coral"
            >
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-charcoal"
              >
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-soft-grey focus-visible:ring-turf"
                placeholder="admin@example.com"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-charcoal"
              >
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-soft-grey focus-visible:ring-turf"
                placeholder="••••••••"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-turf hover:bg-fairway text-scorecard border-turf hover:border-fairway"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-soft-grey/50 space-y-3">
            <p className="text-sm text-charcoal/70 text-center">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="text-turf hover:text-fairway font-medium"
              >
                Register
              </Link>
            </p>

            <div className="text-center">
              <Link
                to="/player"
                className="text-sm text-charcoal/50 hover:text-charcoal transition-colors"
              >
                ← Back
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
