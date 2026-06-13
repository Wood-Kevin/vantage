import { useEffect, useState } from "react";
import Purchases from "react-native-purchases";

const RC_API_KEY = process.env.EXPO_PUBLIC_RC_API_KEY ?? "";

// ─── Initialization ───────────────────────────────────────────────────────────

let configured = false;

export function configureRevenueCat(): void {
  if (configured) return;
  if (!RC_API_KEY) {
    console.log("[RevenueCat] No API key — skipping configure");
    return;
  }
  Purchases.configure({ apiKey: RC_API_KEY });
  configured = true;
  console.log("[RevenueCat] Configured");
}

// ─── Status ───────────────────────────────────────────────────────────────────

export async function isPremium(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active["premium"] !== undefined;
  } catch {
    return false;
  }
}

export function usePremium(): { isPremium: boolean; isLoading: boolean } {
  // SCREENSHOT MODE
  return { isPremium: true, isLoading: false };
}

// ─── Purchases ────────────────────────────────────────────────────────────────

export async function purchaseLifetime(): Promise<boolean> {
  try {
    const offerings = await Purchases.getOfferings();
    const pkg = offerings.current?.lifetime;
    if (!pkg) {
      console.log("[RevenueCat] Lifetime package not found in current offering");
      return false;
    }
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const unlocked = customerInfo.entitlements.active["premium"] !== undefined;
    console.log("[RevenueCat] purchaseLifetime success:", unlocked);
    return unlocked;
  } catch (e: any) {
    if (!e?.userCancelled) {
      console.log("[RevenueCat] purchaseLifetime error:", e);
    }
    return false;
  }
}

export async function purchaseMonthly(): Promise<boolean> {
  try {
    const offerings = await Purchases.getOfferings();
    const pkg = offerings.current?.monthly;
    if (!pkg) {
      console.log("[RevenueCat] Monthly package not found in current offering");
      return false;
    }
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const unlocked = customerInfo.entitlements.active["premium"] !== undefined;
    console.log("[RevenueCat] purchaseMonthly success:", unlocked);
    return unlocked;
  } catch (e: any) {
    if (!e?.userCancelled) {
      console.log("[RevenueCat] purchaseMonthly error:", e);
    }
    return false;
  }
}

export async function restorePurchases(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    const unlocked = customerInfo.entitlements.active["premium"] !== undefined;
    console.log("[RevenueCat] restorePurchases — premium:", unlocked);
    return unlocked;
  } catch (e) {
    console.log("[RevenueCat] restorePurchases error:", e);
    return false;
  }
}
