import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const MAX_COLOR_STRING_LENGTH = 512;

const HEX6_PATTERN = /^#?[0-9A-Fa-f]{6}$/;
const HEX3_PATTERN = /^#?[0-9A-Fa-f]{3}$/;
const RGB_PATTERN = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)$/;
const HSL_PATTERN = /^hsla?\((\d+),\s*([\d.]+)%,\s*([\d.]+)%(?:,\s*[\d.]+)?\)$/;
const CLEAN_HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

function opacityToByte(opacity: number | string): number {
  let value: number;
  if (typeof opacity === "string") {
    const parsed = Number.parseInt(opacity, 16);
    value = Number.isFinite(parsed) ? parsed : 255;
  } else if (opacity > 1) {
    value = Math.round((opacity / 100) * 255);
  } else {
    value = Math.round(opacity * 255);
  }
  return Math.max(0, Math.min(255, value));
}

export function withOpacity(color: string, opacity: number | string): string {
  if (color.length > MAX_COLOR_STRING_LENGTH) {
    return color;
  }

  const opacityValue = opacityToByte(opacity);
  const opacityHex = opacityValue.toString(16).padStart(2, "0").toUpperCase();
  const alphaRatio = opacityValue / 255;

  if (color.startsWith("var(") || color.startsWith("--")) {
    const colorRef = color.startsWith("var(") ? color : `var(${color})`;
    return `color-mix(in srgb, ${colorRef} ${alphaRatio * 100}%, transparent)`;
  }

  if (HEX6_PATTERN.test(color)) {
    const hex = color.startsWith("#") ? color.slice(1) : color;
    return `#${hex}${opacityHex}`;
  }

  if (HEX3_PATTERN.test(color)) {
    const hex = color.startsWith("#") ? color.slice(1) : color;
    const expanded = hex
      .split("")
      .map((c) => c + c)
      .join("");
    return `#${expanded}${opacityHex}`;
  }

  const rgbMatch = RGB_PATTERN.exec(color);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch;
    return `rgba(${r}, ${g}, ${b}, ${alphaRatio})`;
  }

  const hslMatch = HSL_PATTERN.exec(color);
  if (hslMatch) {
    const [, h, s, l] = hslMatch;
    return `hsla(${h}, ${s}%, ${l}%, ${alphaRatio})`;
  }

  const cleanColor = color.startsWith("#") ? color : `#${color}`;
  if (CLEAN_HEX_PATTERN.test(cleanColor)) {
    return `${cleanColor}${opacityHex}`;
  }

  return color;
}
