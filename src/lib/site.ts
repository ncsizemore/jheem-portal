// Public destinations shared by the portal and the research group.
export const CIPHER_URL = 'https://cipher-epi.vercel.app';
export const TEAM_URL = `${CIPHER_URL}/team`;
export const PUBLICATIONS_URL = `${CIPHER_URL}/publications?project=jheem`;

// Group contact settings; personal researcher profile addresses remain separate.
export const CONTACT_EMAIL = 'CIPHERteam@jh.edu';
export const CONTACT_HREF = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Collaborating with JHEEM')}`;
