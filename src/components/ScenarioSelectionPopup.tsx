'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CityData } from '../data/cities';

interface ScenarioSelectionPopupProps {
  city: CityData | null;
  onScenarioSelect: (city: CityData, scenario: string) => void;
  onClose: () => void;
}

interface ScenarioInfo {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

const SCENARIO_INFO: ScenarioInfo[] = [
  {
    id: 'cessation',
    title: 'Cessation',
    description: 'Ryan White funding completely ceases',
    icon: '🛑',
    color: 'red'
  },
  {
    id: 'brief_interruption', 
    title: 'Brief Interruption',
    description: 'Ryan White funding is briefly interrupted',
    icon: '⏸️',
    color: 'orange'
  },
  {
    id: 'prolonged_interruption',
    title: 'Prolonged Interruption', 
    description: 'Ryan White funding is interrupted for an extended period',
    icon: '⏳',
    color: 'amber'
  }
];

export default function ScenarioSelectionPopup({ 
  city, 
  onScenarioSelect, 
  onClose 
}: ScenarioSelectionPopupProps) {
  if (!city) return null;

  const availableScenarios = city.availableScenarios || [];
  const availableScenarioInfo = SCENARIO_INFO.filter(scenario => 
    availableScenarios.includes(scenario.id)
  );

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[55] flex items-center justify-center p-4"
      >
        {/* Popup Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-1">
                  {city.name.split(',')[0]}
                </h2>
                <p className="text-slate-300 text-sm">
                  {city.name.split(',').slice(1).join(',').trim()}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-slate-300 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mt-4">
              <p className="text-slate-300 text-sm">
                Select whether Ryan White funding is briefly interrupted, completely ceases, or interrupted for an extended period
              </p>
            </div>
          </div>

          {/* Scenario Options */}
          <div className="p-6">
            <div className="space-y-3">
              {availableScenarioInfo.map((scenario) => (
                <motion.button
                  key={scenario.id}
                  onClick={() => onScenarioSelect(city, scenario.id)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-lg group
                    ${scenario.color === 'red' ? 'border-red-200 hover:border-red-400 hover:bg-red-50' :
                      scenario.color === 'orange' ? 'border-orange-200 hover:border-orange-400 hover:bg-orange-50' :
                      'border-amber-200 hover:border-amber-400 hover:bg-amber-50'
                    }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-2xl">{scenario.icon}</div>
                    <div className="flex-1">
                      <div className={`font-semibold text-lg mb-1 group-hover:
                        ${scenario.color === 'red' ? 'text-red-900' :
                          scenario.color === 'orange' ? 'text-orange-900' :
                          'text-amber-900'
                        }`}>
                        {scenario.title}
                      </div>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {scenario.description}
                      </p>
                    </div>
                    <svg className={`w-5 h-5 transition-colors group-hover:
                      ${scenario.color === 'red' ? 'text-red-600' :
                        scenario.color === 'orange' ? 'text-orange-600' :
                        'text-amber-600'
                      }`} 
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </motion.button>
              ))}
            </div>

            {availableScenarioInfo.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="font-medium">No analysis data available</p>
                <p className="text-sm text-gray-400 mt-1">This city doesn&apos;t have scenario data yet</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t">
            <p className="text-xs text-gray-600 text-center">
              Each scenario shows different HIV outcomes based on funding changes
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}