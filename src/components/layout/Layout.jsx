import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

export default function Layout() {
  return (
    <div className="min-h-screen bg-ink-950 text-white">
      {/*
        pt-safe-top empuja el contenido por debajo de la barra de estado / notch.
        Cada página interna añade su propio padding visual encima de esto.
      */}
      <main className="max-w-md mx-auto pt-safe-top pb-32 animate-fade-in">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
