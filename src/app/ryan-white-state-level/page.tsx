'use client';

import EmbeddedShinyApp from '@/components/EmbeddedShinyApp';

const ryanWhiteConfig = {
  subtitle: "State-Level Program Analysis",
  title: "Ryan White State Analysis",
  description: "Comprehensive state-level analysis of Ryan White HIV/AIDS Program funding impacts on HIV care continuum and transmission dynamics.",
  statsNumber: "50",
  statsLabel: "US States & Territories",
  features: [
    {
      title: "State Comparisons",
      description: "Compare HIV outcomes and program effectiveness across all US states and territories",
      color: "from-hopkins-blue to-hopkins-spirit-blue",
      icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    },
    {
      title: "Policy Scenarios",
      description: "Model different funding scenarios and their population-level health impacts",
      color: "from-green-500 to-emerald-600",
      icon: "M13 10V3L4 14h7v7l9-11h-7z"
    },
    {
      title: "Interactive Analysis",
      description: "Dynamic parameter adjustment with real-time visualization of model outcomes",
      color: "from-purple-500 to-violet-600",
      icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 10m0 7V10m0 0L9 7"
    }
  ],
  actionText: "Launch the state-level analysis tool to explore Ryan White program impacts.",
  iframeUrl: "https://jheem.shinyapps.io/ryan-white-state-level/",
  iframeTitle: "JHEEM Ryan White State Level Model",
  loadingTitle: "Initializing State Analysis Tool",
  loadingDescription: "Loading JHEEM State Level Model interface...",
  loadingBackground: "bg-gradient-to-br from-slate-50 to-blue-50/30",
  heroSectionTitle: "Comprehensive Policy Impact Analysis",
  heroDescription: "Mathematical modeling of HIV care outcomes and transmission dynamics across all US states and territories with customizable intervention scenarios.",
  sessionDescription: "Your analysis session is running in the background. Restore to continue where you left off."
};

export default function RyanWhiteStateLevelPage() {
  return <EmbeddedShinyApp appConfig={ryanWhiteConfig} />;
}