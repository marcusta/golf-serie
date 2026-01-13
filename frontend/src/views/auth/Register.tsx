import { useState, useEffect } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useAuth } from "../../hooks/useAuth";
import TapScoreLogo from "../../components/ui/TapScoreLogo";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { AlertCircle, CheckCircle2, Lock } from "lucide-react";
import type { AutoEnrollment } from "../../api/auth";

export default function Register() {
  const navigate = useNavigate();
  const searchParams = useSearch({ from: "/register" });
  const { register } = useAuth();

  // Get email from URL params if present
  const emailFromUrl = searchParams.email || "";
  const isEmailFromUrl = !!searchParams.email;

  const [email, setEmail] = useState(emailFromUrl);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoEnrollments, setAutoEnrollments] = useState<
    AutoEnrollment[] | null
  >(null);

  // Update email when URL param changes
  useEffect(() => {
    if (emailFromUrl) {
      setEmail(emailFromUrl);
    }
  }, [emailFromUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    try {
      const user = await register({ email, password });

      // Check for auto-enrollments
      if (user.auto_enrollments && user.auto_enrollments.length > 0) {
        setAutoEnrollments(user.auto_enrollments);
        // Don't navigate immediately - show success message first
      } else {
        navigate({ to: "/player" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  // If user was auto-enrolled, show success message
  if (autoEnrollments && autoEnrollments.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-scorecard to-rough flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-scorecard rounded-lg p-8">
            <div className="flex justify-center mb-8">
              <TapScoreLogo size="lg" variant="color" layout="vertical" />
            </div>

            <div className="text-center mb-8">
              <CheckCircle2 className="w-12 h-12 text-turf mx-auto mb-4" />
              <h1 className="text-display-md text-charcoal mb-2">
                Welcome to TapScore!
              </h1>
              <p className="text-body-lg text-charcoal/70">
                Your account has been created successfully.
              </p>
            </div>

            <div className="border-l-4 border-turf bg-turf/5 pl-4 py-4 mb-8">
              <h2 className="text-sm font-semibold text-turf mb-3">
                You've been enrolled in{" "}
                {autoEnrollments.length === 1
                  ? "a tour"
                  : `${autoEnrollments.length} tours`}
                :
              </h2>
              <ul className="space-y-2">
                {autoEnrollments.map((enrollment) => (
                  <li
                    key={enrollment.enrollment_id}
                    className="flex items-center gap-2 text-charcoal"
                  >
                    <CheckCircle2 className="w-4 h-4 text-turf flex-shrink-0" />
                    <span>{enrollment.tour_name}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Button
              onClick={() => navigate({ to: "/player" })}
              className="w-full bg-turf hover:bg-fairway text-scorecard border-turf hover:border-fairway"
            >
              Continue to Player View
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-scorecard to-rough flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-scorecard rounded-lg p-8">
          <div className="flex justify-center mb-8">
            <TapScoreLogo size="lg" variant="color" layout="vertical" />
          </div>

          <h1 className="text-display-md text-charcoal text-center mb-8">
            Create Account
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
              {isEmailFromUrl ? (
                <>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      readOnly
                      className="border-turf/50 bg-turf/5 cursor-not-allowed pr-10"
                    />
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-turf" />
                  </div>
                  <p className="text-xs text-turf">
                    This email was provided via your invitation link
                  </p>
                </>
              ) : (
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-soft-grey focus-visible:ring-turf"
                  placeholder="you@example.com"
                />
              )}
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

            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-charcoal"
              >
                Confirm Password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              {isLoading ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-soft-grey/50 space-y-3">
            <p className="text-sm text-charcoal/70 text-center">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-turf hover:text-fairway font-medium"
              >
                Sign In
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
