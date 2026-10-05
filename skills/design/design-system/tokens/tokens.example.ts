/*
 * EXAMPLE token set as data, for React Native / iOS / any JS consumer.
 * Mirrors CHEATSHEET.md and tokens.example.css; scripts/check.mjs fails when
 * they drift. `vars` (light/default) and `darkVars` are the only sources the
 * checker reads: keep keys as quoted CSS custom-property names and values as
 * string or number literals. Everything below them is derived.
 *
 * Pure data, no React Native imports, so plain `node --test` can load it.
 */

export const vars = {
  '--color-neutral-1': '#f8f9fa',
  '--color-neutral-2': '#f1f3f5',
  '--color-neutral-3': '#e9ecef',
  '--color-neutral-4': '#dee2e6',
  '--color-neutral-5': '#adb5bd',
  '--color-neutral-6': '#868e96',
  '--color-neutral-7': '#495057',
  '--color-neutral-8': '#343a40',
  '--color-neutral-9': '#212529',
  '--color-neutral-10': '#0b0c0e',

  '--color-bg': '#ffffff',
  '--color-surface': '#ffffff',
  '--color-border': '#0000001a',

  '--color-accent': '#3b5bdb',
  '--color-on-accent': '#ffffff',

  '--color-info': '#1c7ed6',
  '--color-success': '#2f9e44',
  '--color-warning': '#e67700',
  '--color-danger': '#e03131',

  // Platform font names differ from CSS stacks; the cheatsheet documents
  // font tokens without a value, so only their presence is checked.
  '--font-sans': 'System',
  '--font-mono': 'Menlo',
  '--font-weight-regular': 400,
  '--font-weight-medium': 500,
  '--font-weight-semibold': 600,

  '--text-display': 32,
  '--text-display--line-height': 40,
  '--text-title': 20,
  '--text-title--line-height': 28,
  '--text-body': 16,
  '--text-body--line-height': 24,
  '--text-secondary': 14,
  '--text-secondary--line-height': 20,
  '--text-meta': 12,
  '--text-meta--line-height': 16,
  '--text-eyebrow': 11,
  '--text-eyebrow--line-height': 14,
  '--text-eyebrow--letter-spacing': '0.08em',
  '--text-mono': 13,
  '--text-mono--line-height': 20,

  '--space-1': 4,
  '--space-2': 8,
  '--space-3': 12,
  '--space-4': 16,
  '--space-5': 24,
  '--space-6': 32,

  '--radius-sm': 4,
  '--radius-md': 8,
  '--radius-lg': 12,
  '--radius-xl': 16,
  '--radius-pill': 999,

  '--shadow-whisper': '0 4px 24px #0000000d',
  '--color-scrim': '#0b0c0e66',
  '--blur-overlay': 24,

  '--duration-press': 100,
  '--duration-fade': 150,
  '--duration-settle': 200,
  '--duration-glide': 280,
  '--ease-enter': 'cubic-bezier(0.23, 1, 0.32, 1)',
  '--ease-move': 'cubic-bezier(0.77, 0, 0.175, 1)',
  '--ease-linear': 'linear',

  '--z-base': 0,
  '--z-sticky': 100,
  '--z-dropdown': 200,
  '--z-overlay': 300,
  '--z-modal': 400,
  '--z-toast': 500,

  '--touch-min': 44,
} as const;

export type TokenName = keyof typeof vars;

export const darkVars: Partial<Record<TokenName, string | number>> = {
  '--color-neutral-1': '#111214',
  '--color-neutral-2': '#1a1b1e',
  '--color-neutral-3': '#25262b',
  '--color-neutral-4': '#2c2e33',
  '--color-neutral-5': '#5c5f66',
  '--color-neutral-6': '#909296',
  '--color-neutral-7': '#a6a7ab',
  '--color-neutral-8': '#c1c2c5',
  '--color-neutral-9': '#e9ecef',
  '--color-neutral-10': '#f8f9fa',
  '--color-bg': '#0e0f11',
  '--color-surface': '#1a1b1e',
  '--color-border': '#ffffff1a',
  '--color-accent': '#748ffc',
  '--color-on-accent': '#0b0c0e',
  '--color-info': '#4dabf7',
  '--color-success': '#51cf66',
  '--color-warning': '#ffa94d',
  '--color-danger': '#ff6b6b',
  '--color-scrim': '#00000099',
};

/* ---- Derived views (edit the maps above, not these) ------------------- */

export type ThemeName = 'light' | 'dark';

export function token(name: TokenName, theme: ThemeName = 'light') {
  return (theme === 'dark' ? darkVars[name] : undefined) ?? vars[name];
}

export const typeRoles = [
  'display',
  'title',
  'body',
  'secondary',
  'meta',
  'eyebrow',
  'mono',
] as const;
export type TypeRole = (typeof typeRoles)[number];

/** Absolute size/line-height per role, ready for a RN `Text` style. */
export function typeStyle(role: TypeRole) {
  const size = vars[`--text-${role}`] as number;
  const lineHeight = vars[`--text-${role}--line-height`] as number;
  const tracking =
    role === 'eyebrow' ? vars['--text-eyebrow--letter-spacing'] : undefined;
  return {
    fontSize: size,
    lineHeight,
    ...(tracking ? { letterSpacing: Number.parseFloat(tracking) * size } : {}),
  };
}

export const space = [
  vars['--space-1'],
  vars['--space-2'],
  vars['--space-3'],
  vars['--space-4'],
  vars['--space-5'],
  vars['--space-6'],
] as const;

/* ---- Contrast helpers, for a "accent >= 4.5:1 on bg" test -------------- */

function channel(value: number) {
  const srgb = value / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string) {
  const value = Number.parseInt(hex.slice(1, 7), 16);
  return (
    0.2126 * channel((value >> 16) & 0xff) +
    0.7152 * channel((value >> 8) & 0xff) +
    0.0722 * channel(value & 0xff)
  );
}

export function contrastRatio(a: string, b: string) {
  const [dark, light] = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (light + 0.05) / (dark + 0.05);
}
