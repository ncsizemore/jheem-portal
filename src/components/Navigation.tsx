'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [modelsDropdownOpen, setModelsDropdownOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
    setModelsDropdownOpen(false);
  }, [pathname]);

  // Check if we should show Ryan White submenu
  const showRyanWhiteSubmenu = pathname === '/ryan-white' ||
                               pathname === '/ryan-white/explorer' ||
                               pathname === '/shiny/ryan-white-custom' ||
                               pathname === '/explore'; // legacy route

  // Check if we should show State Level submenu
  const showStateLevelSubmenu = pathname === '/ryan-white-state-level' ||
                                pathname?.startsWith('/ryan-white-state-level/explorer');

  const isRyanWhiteActive = pathname === '/ryan-white' || showRyanWhiteSubmenu;
  const isStateLevelActive = pathname === '/ryan-white-state-level' || showStateLevelSubmenu;
  const isCdcTestingActive = pathname === '/cdc-testing';
  const isHIVAgeProjectionsActive = pathname === '/aging';
  const isAnyModelActive = isRyanWhiteActive || isStateLevelActive || isCdcTestingActive || isHIVAgeProjectionsActive;

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
                <div className="text-white/80 text-xs tracking-wider group-hover:text-white transition-colors duration-300">Dynamic HIV modeling across US metropolitan areas</div>
              </div>
            </div>
            {/* Subtle hover effect - animated underline */}
            <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-hopkins-gold transition-all duration-300 group-hover:w-full"></div>
          </Link>
          
          {/* Desktop Navigation with Models Dropdown */}
          <nav className="hidden md:flex items-center space-x-8">
            <div
              className="relative"
              onMouseEnter={() => setModelsDropdownOpen(true)}
              onMouseLeave={() => setModelsDropdownOpen(false)}
            >
              <button
                className="text-white hover:text-hopkins-gold font-medium transition-all relative group py-2 flex items-center gap-2"
              >
                <span>Research Applications</span>
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${modelsDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                <span className={`absolute bottom-0 left-0 h-0.5 bg-hopkins-gold transition-all duration-300 ${
                  isAnyModelActive ? 'w-full' : 'w-0 group-hover:w-full'
                }`}></span>
              </button>

              {/* Dropdown Menu */}
              <AnimatePresence>
                {modelsDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full right-0 pt-2 z-50"
                  >
                    {/* Bridge to prevent hover gap */}
                    <div className="w-full h-2 bg-transparent -mt-2"></div>

                    <div className="w-96 bg-gradient-to-br from-white to-blue-50 rounded-lg shadow-xl border border-gray-200 overflow-hidden">
                      <div className="py-2">
                        {/* Ryan White with submenu indicator */}
                        <Link
                          href="/ryan-white"
                          className={`block px-5 py-3 transition-all duration-200 border-l-4 ${
                            isRyanWhiteActive
                              ? 'bg-hopkins-blue/5 border-l-hopkins-blue'
                              : 'border-l-transparent hover:bg-hopkins-blue/5 hover:border-l-hopkins-blue/30'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className={`text-sm font-semibold ${
                                isRyanWhiteActive ? 'text-hopkins-blue' : 'text-gray-900'
                              }`}>
                                Ryan White: City-Level
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                Metropolitan areas nationwide
                              </div>
                            </div>
                            {isRyanWhiteActive && (
                              <svg className="w-5 h-5 text-hopkins-blue ml-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </Link>

                        {/* Show Ryan White submenu if active */}
                        {isRyanWhiteActive && (
                          <div className="bg-gray-50 border-y border-gray-200 py-1">
                            <Link
                              href="/ryan-white/explorer"
                              className={`block px-10 py-2 text-xs font-medium transition-colors ${
                                pathname === '/ryan-white/explorer'
                                  ? 'text-hopkins-blue bg-white'
                                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                              }`}
                            >
                              Prerun Explorer
                            </Link>
                            <Link
                              href="/shiny/ryan-white-custom"
                              className={`block px-10 py-2 text-xs font-medium transition-colors ${
                                pathname === '/shiny/ryan-white-custom'
                                  ? 'text-hopkins-blue bg-white'
                                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                              }`}
                            >
                              Custom Simulations
                            </Link>
                          </div>
                        )}

                        <Link
                          href="/ryan-white-state-level"
                          className={`block px-5 py-3 transition-all duration-200 border-l-4 ${
                            isStateLevelActive
                              ? 'bg-hopkins-blue/5 border-l-hopkins-blue'
                              : 'border-l-transparent hover:bg-hopkins-blue/5 hover:border-l-hopkins-blue/30'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className={`text-sm font-semibold ${
                                isStateLevelActive ? 'text-hopkins-blue' : 'text-gray-900'
                              }`}>
                                Ryan White: State-Level
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                Statewide analysis
                              </div>
                            </div>
                            {isStateLevelActive && (
                              <svg className="w-5 h-5 text-hopkins-blue ml-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </Link>

                        {/* Show State Level submenu if active */}
                        {isStateLevelActive && (
                          <div className="bg-gray-50 border-y border-gray-200 py-1">
                            <Link
                              href="/ryan-white-state-level/explorer/ajph"
                              className={`block px-10 py-2 text-xs font-medium transition-colors ${
                                pathname === '/ryan-white-state-level/explorer/ajph'
                                  ? 'text-hopkins-blue bg-white'
                                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                              }`}
                            >
                              AJPH Explorer (11 States)
                            </Link>
                            <Link
                              href="/ryan-white-state-level/explorer/croi"
                              className={`block px-10 py-2 text-xs font-medium transition-colors ${
                                pathname === '/ryan-white-state-level/explorer/croi'
                                  ? 'text-hopkins-blue bg-white'
                                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                              }`}
                            >
                              CROI Explorer (30 States)
                            </Link>
                          </div>
                        )}

                        <Link
                          href="/cdc-testing"
                          className={`block px-5 py-3 transition-all duration-200 border-l-4 ${
                            isCdcTestingActive
                              ? 'bg-hopkins-blue/5 border-l-hopkins-blue'
                              : 'border-l-transparent hover:bg-hopkins-blue/5 hover:border-l-hopkins-blue/30'
                          }`}
                        >
                          <div className={`text-sm font-semibold ${
                            isCdcTestingActive ? 'text-hopkins-blue' : 'text-gray-900'
                          }`}>
                            CDC Testing Model
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            CDC-funded HIV testing program impacts
                          </div>
                        </Link>

                        <Link
                          href="/aging"
                          className={`block px-5 py-3 transition-all duration-200 border-l-4 ${
                            isHIVAgeProjectionsActive
                              ? 'bg-hopkins-blue/5 border-l-hopkins-blue'
                              : 'border-l-transparent hover:bg-hopkins-blue/5 hover:border-l-hopkins-blue/30'
                          }`}
                        >
                          <div className={`text-sm font-semibold ${
                            isHIVAgeProjectionsActive ? 'text-hopkins-blue' : 'text-gray-900'
                          }`}>
                            HIV Age Projections
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            Aging trends among people with HIV
                          </div>
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
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
        
        {/* Ryan White City-Level Sub-Navigation */}
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
                    Ryan White Tools
                  </span>
                  <div className="flex items-center space-x-6">
                    <Link
                      href="/ryan-white/explorer"
                      className="text-white hover:text-hopkins-gold font-medium transition-all relative group py-1"
                    >
                      <span>Prerun Explorer</span>
                      <span className={`absolute bottom-0 left-0 h-0.5 bg-hopkins-gold transition-all duration-300 ${
                        pathname === '/ryan-white/explorer' ? 'w-full' : 'w-0 group-hover:w-full'
                      }`}></span>
                    </Link>
                    <Link
                      href="/shiny/ryan-white-custom"
                      className="text-white hover:text-hopkins-gold font-medium transition-all relative group py-1"
                    >
                      <span>Custom Simulations</span>
                      <span className={`absolute bottom-0 left-0 h-0.5 bg-hopkins-gold transition-all duration-300 ${
                        pathname === '/shiny/ryan-white-custom' ? 'w-full' : 'w-0 group-hover:w-full'
                      }`}></span>
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ryan White State-Level Sub-Navigation */}
        <AnimatePresence>
          {showStateLevelSubmenu && (
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
                    State-Level Tools
                  </span>
                  <div className="flex items-center space-x-6">
                    <Link
                      href="/ryan-white-state-level/explorer/ajph"
                      className="text-white hover:text-hopkins-gold font-medium transition-all relative group py-1"
                    >
                      <span>AJPH Explorer</span>
                      <span className={`absolute bottom-0 left-0 h-0.5 bg-hopkins-gold transition-all duration-300 ${
                        pathname === '/ryan-white-state-level/explorer/ajph' ? 'w-full' : 'w-0 group-hover:w-full'
                      }`}></span>
                    </Link>
                    <Link
                      href="/ryan-white-state-level/explorer/croi"
                      className="text-white hover:text-hopkins-gold font-medium transition-all relative group py-1"
                    >
                      <span>CROI Explorer</span>
                      <span className={`absolute bottom-0 left-0 h-0.5 bg-hopkins-gold transition-all duration-300 ${
                        pathname === '/ryan-white-state-level/explorer/croi' ? 'w-full' : 'w-0 group-hover:w-full'
                      }`}></span>
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
              className="md:hidden border-t border-white/20 overflow-hidden"
            >
              <div className="py-4 space-y-2">
                {/* Models Section */}
                <div className="px-3">
                  <p className="text-xs font-semibold text-hopkins-gold uppercase tracking-wider mb-2">
                    Research Applications
                  </p>
                  <div className="space-y-1">
                    <Link
                      href="/ryan-white"
                      className={`block px-3 py-2 rounded-lg font-medium transition-colors ${
                        isRyanWhiteActive
                          ? 'bg-white/10 text-white'
                          : 'text-white/80 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      Ryan White: City-Level
                    </Link>

                    {/* Ryan White Submenu */}
                    {isRyanWhiteActive && (
                      <div className="ml-3 space-y-1 border-l-2 border-hopkins-gold/30 pl-3">
                        <Link
                          href="/ryan-white/explorer"
                          className={`block px-3 py-1.5 rounded text-sm transition-colors ${
                            pathname === '/ryan-white/explorer'
                              ? 'text-hopkins-gold font-medium'
                              : 'text-white/70 hover:text-white'
                          }`}
                        >
                          Prerun Explorer
                        </Link>
                        <Link
                          href="/shiny/ryan-white-custom"
                          className={`block px-3 py-1.5 rounded text-sm transition-colors ${
                            pathname === '/shiny/ryan-white-custom'
                              ? 'text-hopkins-gold font-medium'
                              : 'text-white/70 hover:text-white'
                          }`}
                        >
                          Custom Simulations
                        </Link>
                      </div>
                    )}

                    <Link
                      href="/ryan-white-state-level"
                      className={`block px-3 py-2 rounded-lg font-medium transition-colors ${
                        isStateLevelActive
                          ? 'bg-white/10 text-white'
                          : 'text-white/80 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      Ryan White: State-Level
                    </Link>
                    <Link
                      href="/cdc-testing"
                      className={`block px-3 py-2 rounded-lg font-medium transition-colors ${
                        isCdcTestingActive
                          ? 'bg-white/10 text-white'
                          : 'text-white/80 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      CDC Testing Model
                    </Link>
                    <Link
                      href="/aging"
                      className={`block px-3 py-2 rounded-lg font-medium transition-colors ${
                        isHIVAgeProjectionsActive
                          ? 'bg-white/10 text-white'
                          : 'text-white/80 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      HIV Age Projections
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
}