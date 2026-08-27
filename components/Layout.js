import Navbar from './Navbar';
import OfflineBanner from './OfflineBanner';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <Navbar />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>
      <OfflineBanner />
    </div>
  );
}
