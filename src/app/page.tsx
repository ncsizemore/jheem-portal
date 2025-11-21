import HomePageWrapper from './page-wrapper';

// Server component that fetches publications at build time
export const revalidate = 3600; // Revalidate every hour (ISR)

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

async function getRecentPublications(): Promise<Publication[]> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_GROUP_WEBSITE_URL || 'https://jhu-comp-epi.vercel.app';
    const response = await fetch(
      `${apiUrl}/api/publications?project=jheem&limit=3`,
      {
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch publications:', response.statusText);
      return [];
    }

    const data = await response.json();
    return data.publications || [];
  } catch (error) {
    console.error('Error fetching publications:', error);
    return [];
  }
}

export default async function Home() {
  const publications = await getRecentPublications();

  return <HomePageWrapper publications={publications} />;
}
