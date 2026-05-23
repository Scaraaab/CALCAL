import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import BottomNav from './BottomNav';

export default function Layout() {
  const loc = useLocation();
  return (
    <div className="min-h-screen bg-ink-950 text-white">
      <main className="max-w-md mx-auto pb-32">
        <motion.div
          key={loc.pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Outlet />
        </motion.div>
      </main>
      <BottomNav />
    </div>
  );
}
