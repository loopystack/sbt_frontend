import React, { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import LeftSidebar from "../../components/LeftSidebar";
import RightSidebar from "../../components/RightSidebar";
import MobileBottomNav from "../../components/MobileBottomNav";

export default function AppShell() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);

  // Hide sidebars on profile and deposit pages
  const shouldHideSidebars = location.pathname === '/profile' || location.pathname === '/deposit';

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleLeftSidebarToggle = () => {
    if (location.pathname !== '/deposit') {
      setIsLeftSidebarOpen(!isLeftSidebarOpen);
    }
  };

  const handleRightSidebarToggle = () => {
    if (location.pathname !== '/profile' && location.pathname !== '/deposit') {
      setIsRightSidebarOpen(!isRightSidebarOpen);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <Header
        onMobileMenuToggle={handleMobileMenuToggle}
        onLeftSidebarToggle={handleLeftSidebarToggle}
        onRightSidebarToggle={handleRightSidebarToggle}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      {/* Left Sidebar - Shown from lg up (1024px); top offset so content is not cut by header; full height so scroll works. */}
      {!shouldHideSidebars && (
        <div className="fixed left-0 bottom-0 top-[var(--header-height,7rem)] z-40 hidden lg:block w-64 xl:w-72 flex flex-col overflow-hidden">
          <LeftSidebar onClose={() => setIsLeftSidebarOpen(false)} />
        </div>
      )}

      {/* Right Sidebar - Shown from lg up (1024px); top offset so content is not cut by header; h-full + overflow so it scrolls. */}
      {!shouldHideSidebars && (
        <div className="fixed right-0 bottom-0 top-[var(--header-height,7rem)] left-[auto] w-auto z-40 hidden lg:block flex flex-col overflow-hidden">
          <RightSidebar />
        </div>
      )}

      {/* Main Content */}
      <main
        className={`flex-1 ${
          location.pathname === '/profile' || location.pathname === '/deposit'
            ? ''
            : isLeftSidebarOpen || (isRightSidebarOpen && location.pathname !== '/profile' && location.pathname !== '/deposit')
            ? 'lg:ml-0'
            : ''
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation - Hidden on profile and deposit pages */}
      {!shouldHideSidebars && (
        <MobileBottomNav
          onLeftSidebarToggle={handleLeftSidebarToggle}
          onRightSidebarToggle={handleRightSidebarToggle}
        />
      )}

      <Footer />
    </div>
  );
}
