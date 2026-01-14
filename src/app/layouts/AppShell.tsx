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

      {/* Left Sidebar - Hidden on profile and deposit pages */}
      {!shouldHideSidebars && (
        <div className="fixed top-0 left-0 h-full z-40 hidden xl:block">
          <LeftSidebar onClose={() => setIsLeftSidebarOpen(false)} />
        </div>
      )}

      {/* Right Sidebar - Hidden on profile and deposit pages */}
      {!shouldHideSidebars && (
        <div className="fixed top-0 right-0 h-full z-40 hidden xl:block">
          <RightSidebar />
        </div>
      )}

      {/* Main Content */}
      <main
        className={`flex-1 ${
          location.pathname === '/profile' || location.pathname === '/deposit'
            ? ''
            : isLeftSidebarOpen || (isRightSidebarOpen && location.pathname !== '/profile' && location.pathname !== '/deposit')
            ? 'xl:ml-0'
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
