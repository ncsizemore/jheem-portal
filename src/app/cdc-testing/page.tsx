'use client';

import EmbeddedShinyApp from '@/components/EmbeddedShinyApp';

const cdcTestingConfig = {
  subtitle: "CDC Testing Strategy Analysis",
  title: "CDC Testing Impact Model",
  description: "Evaluate epidemiological impacts of CDC-funded HIV testing program modifications across cessation, interruption, and restoration scenarios.",
  statsNumber: "3",
  statsLabel: "Testing Scenarios",
  features: [
    {
      title: "Testing Scenarios",
      description: "Model cessation, brief interruption, and prolonged interruption of CDC testing programs",
      color: "from-hopkins-blue to-hopkins-spirit-blue",
      icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    },
    {
      title: "Impact Assessment",
      description: "Quantify epidemiological consequences of different funding cut scenarios",
      color: "from-red-500 to-rose-600",
      icon: "M13 10V3L4 14h7v7l9-11h-7"
    },
    {
      title: "Policy Analysis",
      description: "Strategic insights for CDC testing program resource allocation and planning",
      color: "from-blue-500 to-indigo-600",
      icon: "M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
    }
  ],
  actionText: "Launch the CDC testing strategy analysis tool to explore program impact scenarios.",
  iframeUrl: "https://jheem.shinyapps.io/cdc-testing/",
  iframeTitle: "JHEEM CDC Testing Model",
  loadingTitle: "Initializing Testing Strategy Tool",
  loadingDescription: "Loading JHEEM CDC Testing Model interface...",
  loadingBackground: "bg-gradient-to-br from-amber-50 to-yellow-50/30",
  heroSectionTitle: "Advanced Testing Strategy Modeling",
  heroDescription: "Epidemiological modeling of HIV testing program modifications and their population-level health impacts across diverse intervention scenarios.",
  sessionDescription: "Your testing strategy session is running in the background. Restore to continue where you left off."
};

export default function CdcTestingPage() {
  return <EmbeddedShinyApp appConfig={cdcTestingConfig} />;
}