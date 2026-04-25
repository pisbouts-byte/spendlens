import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button.tsx";
import { Input } from "../components/ui/Input.tsx";
import { Card, CardContent } from "../components/ui/Card.tsx";
import { forgotPassword } from "../api/auth.ts";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await forgotPassword(email);
      setSuccess(true);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Something went wrong. Please try again.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-brand-600">Budget Wisely</h1>
          <p className="mt-1 text-sm text-gray-500">Reset your password</p>
        </div>

        <Card>
          <CardContent>
            {success ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
                  If an account with that email exists, a password reset link has been sent.
                  Check your email for instructions.
                </div>
                <p className="text-center text-sm text-gray-500">
                  <Link to="/login" className="text-brand-600 hover:text-brand-700 font-medium">
                    Back to Sign In
                  </Link>
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <p className="text-sm text-gray-600">
                  Enter your email address and we'll send you a link to reset your password.
                </p>

                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />

                <Button
                  type="submit"
                  className="w-full"
                  isLoading={isLoading}
                >
                  Send Reset Link
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-sm text-gray-500">
          Remember your password?{" "}
          <Link to="/login" className="text-brand-600 hover:text-brand-700 font-medium">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
