export type Bubble = {
  id: string;
  label: string;
  icon: string;
  description: string;
};

export const bubbles: Bubble[] = [
  {
    id: 'charming_suit_fit',
    label: 'Charming Suit',
    icon: '👔',
    description: 'Elegant tailored suit, professional look',
  },
  {
    id: 'gym_fit',
    label: 'Gym Fit',
    icon: '💪',
    description: 'Athletic fitness styling',
  },
  {
    id: 'vintage_store',
    label: 'Vintage Style',
    icon: '👞',
    description: 'Classic vintage aesthetic',
  },
  {
    id: 'biz_casual_outdoor',
    label: 'Business Casual',
    icon: '💼',
    description: 'Professional outdoor look',
  },
  {
    id: 'editorial_studio',
    label: 'Editorial Studio',
    icon: '📸',
    description: 'High-end studio portrait',
  },
  {
    id: 'streetwear_night',
    label: 'Streetwear Night',
    icon: '🌃',
    description: 'Urban nighttime style',
  },
];

export const bubbleMap: Record<string, string> = {
  charming_suit_fit:
    'full-body or half-body portrait, elegant tailored suit, slightly athletic build, confident relaxed posture, soft key light, neutral background, subtle vignetting',
  gym_fit:
    'Ein hyperrealistisches digitales Porträt einer jungen frau am Strand. Er ist athletisch und durchtrainiert, mit definierten Muskeln und gesunder, sonnengebräunter Haut. Das Licht der Sonne wirft sanfte goldene Reflexe auf seinen Körper. Sein Gesicht wirkt charismatisch, gepflegt und leicht lächelnd, mit markanten Gesichtszügen. Im Hintergrund tropische Felsen und Palmen, die Szene wirkt lebendig, modern und kraftvoll. Der Stil kombiniert Fotorealismus mit künstlerischer Glätte und perfekter Ästhetik. und mach das er fit und wach wirkt keine augenringe',
  vintage_store:
    'vintage clothing boutique, curated rack background, warm film grain, muted earthy palette, classic lenses feel, timeless styling, gentle halation',
  biz_casual_outdoor:
    'business casual look, city street backdrop, overcast daylight, soft reflections, modern architecture hints, candid editorial vibe',
  editorial_studio:
    'studio backdrop, controlled softbox lighting, clean gradient background, strong jawline definition, refined retouching, flagship editorial magazine style',
  streetwear_night:
    'urban night scene, subtle neon accents, reflective surfaces, crisp jacket textures, cinematic contrast, shallow DoF',
};

export const baseMods =
  'photographic, ultra-detailed facial features, flattering light, crisp focus, natural skin texture, subtle color grading, editorial quality, minimalistic modern aesthetic, clean composition, shallow depth of field, professional portrait lens';

export function buildPrompt(ids: string[], notes?: string): string {
  const selectedParts = ids.map((id) => bubbleMap[id]).filter(Boolean);
  const parts = [baseMods, ...selectedParts];
  if (notes?.trim()) {
    parts.push(`User notes: ${notes.trim()}`);
  }
  return parts.join(', ');
}

export function getAspectRatio(ids: string[]): string {
  return ids.includes('editorial_studio') ? '3:4' : '1:1';
}

