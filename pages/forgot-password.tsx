import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Head from "next/head";
import Link from "next/link";

export default function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setMessage(
        "Password reset instructions sent! Check your email to continue."
      );
    } catch (error) {
      console.error("Error:", error);
      setMessage("Error sending reset instructions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>YouZit - Reset Password</title>
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">
              Reset your password
            </h2>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
            <div>
              <label
                htmlFor="email"
                className="block text-sm text-gray-700 mb-2"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-[#111827] hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Sending..." : "Send Reset Instructions"}
              </button>
            </div>

            {message && (
              <div
                className={`text-sm text-center ${
                  message.includes("Error") ? "text-red-600" : "text-green-600"
                }`}
              >
                {message}
              </div>
            )}
          </form>

          <div className="space-y-2 text-center text-sm">
            <p>
              <Link
                href="/signin"
                className="text-blue-600 hover:text-blue-700"
              >
                Back to Sign In
              </Link>
            </p>
          </div>

          {/* Footer */}
          <div className="absolute bottom-4 left-0 right-0 text-center">
            <p className="text-sm text-gray-600">
              By continuing, I agree to the{" "}
              <Link href="/terms" className="text-blue-600 hover:text-blue-700">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="text-blue-600 hover:text-blue-700"
              >
                Privacy Policy
              </Link>
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Having trouble logging in?{" "}
              <Link href="/help" className="text-blue-600 hover:text-blue-700">
                Click Here
              </Link>{" "}
              and try again.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
