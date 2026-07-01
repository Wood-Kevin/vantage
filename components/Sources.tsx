import * as WebBrowser from "expo-web-browser";
import { ExternalLink } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

export type SourceLink = {
  label: string;
  url: string;
};

type SourcesProps = {
  links: SourceLink[];
};

export function Sources({ links }: SourcesProps) {
  return (
    <View className="mt-3 gap-2 rounded-2xl border border-violet-100 p-3 dark:border-violet-900/40">
      <Text className="text-xs font-semibold uppercase tracking-wider text-violet-500 dark:text-violet-400">
        Sources
      </Text>
      {links.map((link) => (
        <Pressable
          key={link.url}
          onPress={() => WebBrowser.openBrowserAsync(link.url)}
          className="flex-row items-center gap-1.5"
        >
          <ExternalLink size={12} color="#7c3aed" />
          <Text className="flex-1 text-xs text-violet-600 underline dark:text-violet-400">
            {link.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
