// Server base URL derived dynamically from environment or origin
const isSameOrigin = typeof window !== 'undefined' && 
  (window.location.hostname.includes('onrender.com') || window.location.hostname === 'localhost' && window.location.port === '5000');

const API_BASE = isSameOrigin 
  ? '/api' 
  : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api');

export const SERVER_URL = isSameOrigin 
  ? (typeof window !== 'undefined' ? window.location.origin : '') 
  : API_BASE.replace(/\/api\/?$/, '');


// Verified high-quality civic issue and resolution evidence photographs
export const CATEGORY_FALLBACKS = {
  pothole: {
    issue: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80',
    resolution: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&auto=format&fit=crop&q=80'
  },
  garbage: {
    issue: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=600&auto=format&fit=crop&q=80',
    resolution: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format&fit=crop&q=80'
  },
  streetlight: {
    issue: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=600&auto=format&fit=crop&q=80',
    resolution: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=600&auto=format&fit=crop&q=80'
  },
  water: {
    issue: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80',
    resolution: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&auto=format&fit=crop&q=80'
  },
  default: {
    issue: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80',
    resolution: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&auto=format&fit=crop&q=80'
  }
};

export function getCategoryFallback(categoryName = '', isResolution = false) {
  const cat = (categoryName || '').toLowerCase();
  let key = 'default';
  if (cat.includes('pothole') || cat.includes('road')) key = 'pothole';
  else if (cat.includes('garbage') || cat.includes('waste') || cat.includes('dump') || cat.includes('litter')) key = 'garbage';
  else if (cat.includes('light') || cat.includes('electr') || cat.includes('lamp') || cat.includes('pole')) key = 'streetlight';
  else if (cat.includes('water') || cat.includes('drain') || cat.includes('leak') || cat.includes('pipe')) key = 'water';

  const pair = CATEGORY_FALLBACKS[key] || CATEGORY_FALLBACKS.default;
  return isResolution ? pair.resolution : pair.issue;
}

export function getImageUrl(path, categoryName = '', isResolution = false) {
  if (!path || typeof path !== 'string' || path.trim() === '') {
    return getCategoryFallback(categoryName, isResolution);
  }

  const trimmed = path.trim();

  // If already absolute or data URI
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  // If it's a demo seed placeholder that doesn't exist on remote deployment
  if (trimmed.includes('demo_issue') || trimmed.includes('demo_resolution')) {
    return getCategoryFallback(categoryName, isResolution);
  }

  // Prepend backend server URL
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${SERVER_URL}${cleanPath}`;
}
