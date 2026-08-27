import Link from 'next/link';

export default function Custom500() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4 text-center">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm border border-primary-100">
        <h1 className="font-display text-4xl font-semibold text-primary-800 mb-2">500</h1>
        <p className="text-ink/70 mb-6">Something went wrong on our end. Please try again later.</p>
        <Link href="/" className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-medium px-6 py-2.5 rounded-lg">
          Return to Home
        </Link>
      </div>
    </div>
  );
}
