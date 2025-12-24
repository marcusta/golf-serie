import { useState, useEffect } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useAuth } from "../../hooks/useAuth";
import TapScoreLogo from "../../components/ui/TapScoreLogo";
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
  const [autoEnrollments, setAutoEnrollments] = useState<AutoEnrollment[] | null>(null);

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
          <div className="bg-scorecard rounded-2xl shadow-lg p-8 border-2 border-soft-grey">
            <div className="flex justify-center mb-6">
              <TapScoreLogo size="lg" variant="color" layout="vertical" />
            </div>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-turf/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-turf" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-charcoal font-['Inter']">
                Welcome to TapScore!
              </h1>
              <p className="text-charcoal/70 mt-2 font-['Inter']">
                Your account has been created successfully.
              </p>
            </div>

            <div className="bg-turf/5 border border-turf/20 rounded-xl p-4 mb-6">
              <h2 className="text-sm font-semibold text-turf mb-3 font-['Inter']">
                You've been enrolled in {autoEnrollments.length === 1 ? 'a tour' : `${autoEnrollments.length} tours`}:
              </h2>
              <ul className="space-y-2">
                {autoEnrollments.map((enrollment) => (
                  <li key={enrollment.enrollment_id} className="flex items-center gap-2 text-charcoal font-['Inter']">
                    <svg className="w-4 h-4 text-turf flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{enrollment.tour_name}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => navigate({ to: "/player" })}
              className="w-full py-3 bg-turf text-scorecard rounded-xl font-semibold hover:bg-fairway transition-colors font-['Inter']"
            >
              Continue to Player View
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-scorecard to-rough flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-scorecard rounded-2xl shadow-lg p-8 border-2 border-soft-grey">
          <div className="flex justify-center mb-6">
            <TapScoreLogo size="lg" variant="color" layout="vertical" />
          </div>

          <h1 className="text-2xl font-bold text-charcoal text-center mb-6 font-['Inter']">
            Create Account
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
              {isEmailFromUrl ? (
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    value={email}
                    readOnly
                    className="w-full px-4 py-2.5 border-2 border-turf/50 bg-turf/5 rounded-xl text-charcoal font-['Inter'] cursor-not-allowed"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg className="w-5 h-5 text-turf" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </div>
              ) : (
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border-2 border-soft-grey rounded-xl focus:border-turf focus:outline-none transition-colors font-['Inter']"
                  placeholder="you@example.com"
                />
              )}
              {isEmailFromUrl && (
                <p className="text-xs text-turf mt-1 font-['Inter']">
                  This email was provided via your invitation link
                </p>
              )}
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

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-charcoal mb-1 font-['Inter']"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              {isLoading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-charcoal/70 font-['Inter']">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-turf hover:text-fairway font-medium"
              >
                Sign In
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
