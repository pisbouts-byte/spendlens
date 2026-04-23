import { useNavigate } from "react-router-dom";
import { Home, ArrowLeft } from "lucide-react";

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-8">
      <div className="max-w-md text-center">
        <p className="text-7xl font-bold text-brand-600">404</p>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">Page not found</h1>
        <p className="mt-2 text-sm text-gray-500">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            <Home className="h-4 w-4" />
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
