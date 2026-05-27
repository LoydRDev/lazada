import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const peso_fmt = (n) => '₱' + Number(n || 0).toLocaleString('en-PH');

export const getDiscountPercent = (product, activePrice = product?.price) => {
  const price = Number(activePrice || 0);
  const originalPrice = Number(product?.originalPrice || 0);
  if (!price || !originalPrice || originalPrice <= price) return 0;
  return Math.max(0, Math.round((1 - price / originalPrice) * 100));
};
