import { useEffect, useState } from "react";
import Purchases from "react-native-purchases";

export async function isPremium(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active["premium"] !== undefined;
  } catch {
    return false;
  }
}

export function usePremium(): { isPremium: boolean; isLoading: boolean } {
  const [premium, setPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    isPremium().then((result) => {
      setPremium(result);
      setIsLoading(false);
    });
  }, []);

  return { isPremium: premium, isLoading };
}
