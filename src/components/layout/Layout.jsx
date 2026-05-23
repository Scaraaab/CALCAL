import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

export default function Layout() {
  return (
    <div className="min-h-screen bg-ink-950 text-white">
      <main className="max-w-md mx-auto pb-32 animate-fade-in">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
