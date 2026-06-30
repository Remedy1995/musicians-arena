import { useEffect, useState } from "react";
import { Image, ImageStyle, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";

import { theme } from "../theme/theme";

type ProfileAvatarProps = {
  label: string;
  imageUri?: string | null;
  size?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export function ProfileAvatar({
  label,
  imageUri,
  size = 52,
  borderRadius = size / 2,
  style,
  imageStyle,
  textStyle,
}: ProfileAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUri]);

  const shapeStyle = {
    width: size,
    height: size,
    borderRadius,
  } as const;
  const shouldShowImage = Boolean(imageUri) && !imageFailed;

  return (
    <View style={[styles.avatar, shapeStyle, style]}>
      {shouldShowImage ? (
        <Image
          source={{ uri: imageUri! }}
          style={[styles.image, shapeStyle, imageStyle]}
          resizeMode="cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <Text style={[styles.label, { fontSize: Math.max(14, Math.round(size * 0.34)) }, textStyle]}>{getInitials(label)}</Text>
      )}
    </View>
  );
}

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

const styles = StyleSheet.create({
  avatar: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.ink[900],
  },
  image: {
    width: "100%",
    height: "100%",
  },
  label: {
    fontFamily: theme.typography.fontFamily.displayMedium,
    color: theme.semanticColors.textOnDark,
  },
});
