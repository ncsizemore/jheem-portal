'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Check if we should show Ryan White submenu
  const showRyanWhiteSubmenu = pathname === '/ryan-white' || 
                               pathname === '/prerun' || 
                               pathname === '/custom';

  const isRyanWhiteActive = pathname === '/ryan-white' || showRyanWhiteSubmenu;
  const isStateLevelActive = pathname === '/ryan-white-state-level';
  const isCdcTestingActive = pathname === '/cdc-testing';

  return (
    <header className="bg-hopkins-blue shadow-lg sticky top-0 z-50 border-b border-hopkins-blue/30">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Navigation */}
        <div className="flex justify-between items-center h-20">
          {/* Logo and Branding */}
          <Link href="/" className="flex items-center group relative overflow-hidden">
            <div className="flex-shrink-0 flex items-center">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-hopkins-spirit-blue to-hopkins-blue rounded-lg flex items-center justify-center group-hover:from-hopkins-gold group-hover:to-hopkins-spirit-blue transition-all duration-300 shadow-lg">
                  <span className="text-white font-bold text-lg">J</span>
                </div>
              </div>
              
              <div className="border-l border-white/30 mx-4 h-12 hidden md:block"></div>
              
              <div className="hidden md:block">
                <div className="text-white font-bold text-xl group-hover:text-hopkins-gold transition-colors duration-300">JHEEM Portal</div>
                <div className="text-white/80 text-xs tracking-wider group-hover:text-white transition-colors duration-300">HIV TRANSMISSION MODELING</div>
              </div>
            </div>
            {/* Subtle hover effect - animated underline */}
            <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-hopkins-gold transition-all duration-300 group-hover:w-full"></div>
          </Link>
          
          {/* Desktop Global Model Menu */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              href="/ryan-white" 
              className="text-white hover:text-hopkins-gold font-medium transition-all relative group py-2"
            >
              <span>Ryan White Model</span>
              <span className={`absolute bottom-0 left-0 h-0.5 bg-hopkins-gold transition-all duration-300 ${
                isRyanWhiteActive ? 'w-full' : 'w-0 group-hover:w-full'
              }`}></span>
            </Link>
            <Link 
              href="/ryan-white-state-level" 
              className="text-white hover:text-hopkins-gold font-medium transition-all relative group py-2"
            >
              <span>State Level Model</span>
              <span className={`absolute bottom-0 left-0 h-0.5 bg-hopkins-gold transition-all duration-300 ${
                isStateLevelActive ? 'w-full' : 'w-0 group-hover:w-full'
              }`}></span>
            </Link>
            <Link 
              href="/cdc-testing" 
              className="text-white hover:text-hopkins-gold font-medium transition-all relative group py-2"
            >
              <span>CDC Testing Model</span>
              <span className={`absolute bottom-0 left-0 h-0.5 bg-hopkins-gold transition-all duration-300 ${
                isCdcTestingActive ? 'w-full' : 'w-0 group-hover:w-full'
              }`}></span>
            </Link>
          </nav>
          
          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-white p-2 rounded-md hover:bg-white/10 transition-colors"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
        
        {/* Ryan White Specific Sub-Navigation */}
        <AnimatePresence>
          {showRyanWhiteSubmenu && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="border-t border-white/20 overflow-hidden"
            >
              <div className="py-4">
                <div className="flex items-center space-x-8">
                  <span className="text-xs font-semibold text-hopkins-gold uppercase tracking-wider">
                    Ryan White Interfaces
                  </span>
                  <div className="flex items-center space-x-6">
                    <Link 
                      href="/prerun" 
                      className="text-white hover:text-hopkins-gold font-medium transition-all relative group py-1"
                    >
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Prerun Scenarios
                      </span>
                      <span className={`absolute bottom-0 left-0 h-0.5 bg-hopkins-gold transition-all duration-300 ${
                        pathname === '/prerun' ? 'w-full' : 'w-0 group-hover:w-full'
                      }`}></span>
                    </Link>
                    <Link 
                      href="/custom" 
                      className="text-white hover:text-hopkins-gold font-medium transition-all relative group py-1"
                    >
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                        </svg>
                        Custom Simulations
                      </span>
                      <span className={`absolute bottom-0 left-0 h-0.5 bg-hopkins-gold transition-all duration-300 ${
                        pathname === '/custom' ? 'w-full' : 'w-0 group-hover:w-full'
                      }`}></span>
                    </Link>
                    <Link 
                      href="/explore" 
                      className="text-white hover:text-hopkins-gold font-medium transition-all relative group py-1"
                    >
                      <span className="flex items-center">
                        <span className="bg-hopkins-gold text-hopkins-blue text-xs font-bold px-2 py-0.5 rounded-full mr-2 shadow-md">
                          NEW
                        </span>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 10m0 7V10m0 0L9 7" />
                        </svg>
                        Interactive Explorer
                      </span>
                      <span className={`absolute bottom-0 left-0 h-0.5 bg-hopkins-gold transition-all duration-300 w-0 group-hover:w-full`}></span>
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="md:hidden border-t border-slate-600/50 overflow-hidden"
            >
              <div className="py-4 space-y-3">
                {/* Mobile Global Menu */}
                <div className="space-y-1">
                  <Link 
                    href="/ryan-white"
                    className={`block px-3 py-2 rounded-lg font-medium transition-colors ${
                      isRyanWhiteActive 
                        ? 'bg-blue-600 text-white' 
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    Ryan White Model
                  </Link>
                  <Link 
                    href="/ryan-white-state-level"
                    className={`block px-3 py-2 rounded-lg font-medium transition-colors ${
                      isStateLevelActive 
                        ? 'bg-blue-600 text-white' 
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    State Level Model
                  </Link>
                  <Link 
                    href="/cdc-testing"
                    className={`block px-3 py-2 rounded-lg font-medium transition-colors ${
                      isCdcTestingActive 
                        ? 'bg-blue-600 text-white' 
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    CDC Testing Model
                  </Link>
                </div>
                
                {/* Mobile Ryan White Submenu */}
                {showRyanWhiteSubmenu && (
                  <div className="border-t border-slate-600/50 pt-3 mt-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-3">
                      Ryan White Interfaces
                    </p>
                    <div className="space-y-1">
                      <Link 
                        href="/prerun"
                        className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          pathname === '/prerun'
                            ? 'bg-emerald-600 text-white' 
                            : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                        }`}
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Prerun Scenarios
                      </Link>
                      <Link 
                        href="/custom"
                        className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          pathname === '/custom'
                            ? 'bg-purple-600 text-white' 
                            : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                        }`}
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                        </svg>
                        Custom Simulations
                      </Link>
                      <Link 
                        href="/explore"
                        className="flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors relative text-slate-300 hover:text-white hover:bg-slate-700/50"
                      >
                        <span className="absolute -top-1 left-1 bg-gradient-to-r from-emerald-400 to-emerald-500 text-emerald-900 text-xs font-bold px-1.5 py-0.5 rounded-full">
                          NEW
                        </span>
                        <svg className="w-4 h-4 mr-2 ml-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 10m0 7V10m0 0L9 7" />
                        </svg>
                        Interactive Explorer
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
}