export interface Project {
  id: string;
  title: string;
  style: string;
  area: string;
  city: string;
  imageUrl?: string;
  /** Все кадры галереи (первая обычно совпадает с обложкой карточки). Из CMS: image + поле gallery. */
  galleryUrls?: string[];
  imagePlaceholder?: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  price: string;
  featured?: boolean;
  features?: string[];
}

export interface ProcessStep {
  number: string;
  title: string;
  description: string;
}

export interface ContactFormData {
  name: string;
  phone: string;
  email: string;
  message: string;
}

export interface SiteContent {
  meta: {
    title: string;
    description: string;
  };
  hero: {
    badge: string;
    headline: string[];
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
    /** URL фонового фото (Hero / топовая работа), например из Directus */
    backgroundImageUrl?: string;
  };
  portfolio: {
    eyebrow: string;
    title: string;
    subtitle: string;
    projects: Project[];
  };
  services: {
    eyebrow: string;
    title: string;
    items: Service[];
  };
  process: {
    eyebrow: string;
    title: string[];
    description: string;
    steps: ProcessStep[];
  };
  contact: {
    eyebrow: string;
    title: string;
    description: string;
    form: {
      namePlaceholder: string;
      phonePlaceholder: string;
      emailPlaceholder: string;
      messagePlaceholder: string;
      submitLabel: string;
    };
  };
  footer: {
    copyright: string;
  };
}
