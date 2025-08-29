'use client';

import { motion } from 'framer-motion';

export default function Footer() {
  return (
    <section className="bg-gradient-to-br from-hopkins-blue via-hopkins-spirit-blue to-slate-900 py-20">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <div className="w-12 h-px bg-gradient-to-r from-hopkins-gold to-transparent mb-8"></div>
              <h2 className="text-3xl font-extralight text-white mb-8 leading-tight">
                Research <span className="font-medium">Funding</span><br />
                <span className="text-hopkins-gold text-xl font-light">& Institutional Support</span>
              </h2>
              
              <p className="text-blue-100 leading-relaxed mb-8 font-light text-lg">
                This research is supported by grants from the National Institute of Mental Health 
                and the National Institute of Allergy and Infectious Diseases.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 bg-hopkins-gold rounded-full"></div>
                  <span className="text-white font-mono text-sm">K08MH118094</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 bg-hopkins-gold rounded-full"></div>
                  <span className="text-white font-mono text-sm">K01AI138853</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 bg-hopkins-gold rounded-full"></div>
                  <span className="text-white font-mono text-sm">P30-AI094189</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-hopkins-gold to-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <span className="text-hopkins-blue font-bold text-xl">JH</span>
                </div>
                <h3 className="text-xl font-medium text-white mb-2">
                  Johns Hopkins Bloomberg School of Public Health
                </h3>
                <p className="text-hopkins-gold text-sm font-medium tracking-wider uppercase mb-4">
                  Computational Epidemiology Research Group
                </p>
                <div className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
                <p className="text-blue-100 text-sm mt-4 font-light">
                  Advancing mathematical modeling for HIV prevention and control
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}