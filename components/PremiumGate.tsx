import { Gem, X } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";

import {
  purchaseLifetime,
  purchaseMonthly,
  restorePurchases,
} from "@/lib/entitlements";

type Props = {
  toolName: string;
  onClose: () => void;
};

export default function PremiumGate({ toolName, onClose }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleLifetime() {
    setLoading(true);
    const unlocked = await purchaseLifetime();
    setLoading(false);
    if (unlocked) onClose();
  }

  async function handleMonthly() {
    setLoading(true);
    const unlocked = await purchaseMonthly();
    setLoading(false);
    if (unlocked) onClose();
  }

  async function handleRestore() {
    setLoading(true);
    const unlocked = await restorePurchases();
    setLoading(false);
    if (unlocked) onClose();
  }

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/60 px-6">
        <View className="w-full rounded-3xl bg-white p-6 dark:bg-zinc-800">
          {/* Close button */}
          <Pressable
            onPress={onClose}
            className="absolute right-4 top-4 rounded-full p-1"
            hitSlop={8}
            disabled={loading}
          >
            <X size={20} color="#a1a1aa" />
          </Pressable>

          {/* Icon */}
          <View className="mb-4 items-center">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 dark:bg-violet-900">
              <Gem size={28} color="#7c3aed" />
            </View>
          </View>

          {/* Heading */}
          <Text className="mb-2 text-center text-xl font-bold text-zinc-900 dark:text-white">
            Unlock {toolName}
          </Text>

          {/* Subtext */}
          <Text className="mb-6 text-center text-sm leading-5 text-zinc-500 dark:text-zinc-400">
            Get access to all 25+ tools with a one-time purchase
          </Text>

          {/* Primary button — lifetime */}
          <Pressable
            onPress={handleLifetime}
            disabled={loading}
            android_ripple={{ color: "#6d28d9" }}
            className="mb-3 items-center rounded-2xl bg-violet-600 py-4"
            style={({ pressed }) => (pressed && !loading ? { opacity: 0.85 } : {})}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-base font-bold text-white">
                Lifetime Access — $9.99
              </Text>
            )}
          </Pressable>

          {/* Secondary button — monthly */}
          <Pressable
            onPress={handleMonthly}
            disabled={loading}
            android_ripple={{ color: "#f4f4f5" }}
            className="mb-5 items-center rounded-2xl border border-zinc-200 py-4 dark:border-zinc-600"
            style={({ pressed }) => (pressed && !loading ? { opacity: 0.7 } : {})}
          >
            {loading ? (
              <ActivityIndicator color="#7c3aed" />
            ) : (
              <Text className="text-base font-semibold text-zinc-700 dark:text-zinc-200">
                $1.99 / month
              </Text>
            )}
          </Pressable>

          {/* Restore link */}
          <Pressable
            onPress={handleRestore}
            disabled={loading}
            className="items-center"
          >
            <Text className="text-sm text-zinc-400 dark:text-zinc-500">
              Restore Purchases
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
