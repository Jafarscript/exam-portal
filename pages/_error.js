import Link from 'next/link';

function Error({ statusCode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4 text-center">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm border border-primary-100">
        <h1 className="font-display text-4xl font-semibold text-primary-800 mb-2">
          {statusCode ? `${statusCode}` : 'Error'}
        </h1>
        <p className="text-ink/70 mb-6">
          {statusCode
            ? `An error ${statusCode} occurred on server`
            : 'An unexpected error occurred'}
        </p>
        <Link href="/" className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-medium px-6 py-2.5 rounded-lg">
          Return to Home
        </Link>
      </div>
    </div>
  );
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
