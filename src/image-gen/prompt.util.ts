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

export const hairStyleMap: Record<string, string> = {
  curly_volume: 'curly, voluminous hairstyle',
  slick_back: 'sleek, slicked-back hairstyle',
  bob_cut: 'clean bob cut',
  long_waves: 'long, soft waves',
  buzz_cut: 'short buzz cut',
};

export function bubbleLabels(ids: string[]): string[] {
  const index = new Map(bubbles.map((b) => [b.id, b.label] as const));
  return ids.map((id) => index.get(id) || id);
}

export function buildStylingPrompt(
  ids: string[],
  opts: {
    notes?: string;
    gender?: string;
    hairColorFrom?: string;
    hairColorTo?: string;
    hairstyleId?: string;
    hairstyleLabel?: string;
    framing?: 'face' | 'full_body' | 'collection' | string;
  } = {},
): string {
  const gender = (opts.gender || 'unspecified').trim();
  const hairstyle = (opts.hairstyleLabel || (opts.hairstyleId ? hairStyleMap[opts.hairstyleId] : undefined) || 'original hairstyle').trim();
  const labels = bubbleLabels(ids);
  const notes = (opts.notes && opts.notes.trim()) || 'no extra notes';
  const from = opts.hairColorFrom?.trim();
  const to = opts.hairColorTo?.trim();
  const framing = (opts.framing || '').trim();

  let hairColorLine = 'Keep natural hair color.';
  if (from && to && from !== to) {
    hairColorLine = `Apply a smooth hair color gradient from ${from} to ${to}.`;
  } else if (from) {
    hairColorLine = `Apply a solid hair color of ${from}.`;
  }

  const prompt = [
    'You are an expert portrait stylist. Enhance the input photo accordingly.',
    `Subject gender: ${gender}.`,
    `Desired hairstyle: ${hairstyle}.`,
    framing === 'face'
      ? 'Crop to a close-up face portrait (head and a bit of shoulders).'
      : framing === 'full_body'
      ? 'Show the full body from head to toe.'
      : framing === 'collection'
      ? 'Generate three variants: (1) close-up face, (2) half-body (waist-up), and (3) full body.'
      : undefined,
    'Hair color:',
    hairColorLine,
    `Additional style bubbles: ${labels.length ? labels.join(', ') : 'none'}.`,
    `User notes: ${notes}.`,
    'Output: high-resolution, realistic portrait, balanced lighting, natural skin texture.',
    baseMods,
  ].filter(Boolean).join('\n');

  return prompt;
}
