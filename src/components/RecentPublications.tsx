'use client';

import { motion } from 'framer-motion';

interface Publication {
  id: string;
  title: string;
  authors: string;
  journal: string;
  year: string;
  doi?: string;
  url?: string;
  keyFindings?: string;
}

interface RecentPublicationsProps {
  publications: Publication[];
}

export default function RecentPublications({ publications }: RecentPublicationsProps) {
  if (!publications || publications.length === 0) {
    return (
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <p className="text-gray-600">No publications available</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <div className="grid lg:grid-cols-12 gap-16">
            <div className="lg:col-span-3">
              <div className="sticky top-32">
                <div className="w-8 h-px bg-hopkins-blue mb-6"></div>
                <h2 className="text-3xl font-extralight text-gray-900 mb-6">
                  Recent<br />
                  <span className="font-medium">Research</span>
                </h2>
                <p className="text-sm text-gray-500 uppercase tracking-widest font-medium mb-8">
                  Latest JHEEM Publications
                </p>
                <a
                  href="https://jhu-comp-epi.vercel.app/publications?project=jheem"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-hopkins-blue hover:text-hopkins-spirit-blue transition-colors duration-300 font-medium text-sm group"
                >
                  <span>View All Publications</span>
                  <svg
                    className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </a>
              </div>
            </div>

            <div className="lg:col-span-9">
              <div className="space-y-12">
                {publications.map((publication, index) => (
                  <motion.article
                    key={publication.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.8 + index * 0.1 }}
                    className="group"
                  >
                    <a
                      href={publication.url || `https://doi.org/${publication.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <div className="bg-slate-50/50 rounded-2xl p-8 group-hover:bg-slate-50 transition-colors duration-300 border border-transparent group-hover:border-hopkins-blue/20">
                        <div className="flex items-start gap-3 mb-3">
                          <span className="inline-block px-3 py-1 bg-hopkins-blue text-white text-xs font-bold rounded-lg">
                            {publication.year}
                          </span>
                          {publication.keyFindings && (
                            <span className="inline-block px-3 py-1 bg-hopkins-gold/20 text-hopkins-blue text-xs font-bold rounded-lg">
                              Featured
                            </span>
                          )}
                        </div>
                        <h3 className="text-xl font-light text-gray-900 leading-relaxed mb-4 group-hover:text-hopkins-blue transition-colors duration-300">
                          {publication.title.split(':').map((part, i, arr) => (
                            <span key={i}>
                              {i > 0 && i < arr.length && ': '}
                              {i === 1 ? <span className="font-medium">{part}</span> : part}
                            </span>
                          ))}
                        </h3>
                        <div className="flex items-center gap-4 text-sm mb-4">
                          <span className="text-hopkins-blue font-medium italic">{publication.journal}</span>
                          <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                          <span className="text-gray-600">{publication.authors.split(',')[0]} et al.</span>
                        </div>
                        {publication.keyFindings && (
                          <p className="text-gray-700 text-sm leading-relaxed border-l-2 border-hopkins-blue/30 pl-4">
                            {publication.keyFindings}
                          </p>
                        )}
                      </div>
                    </a>
                  </motion.article>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
