import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View style={styles.container}>
        <Text style={styles.title}>Page not found</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to home</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
  link: {
    marginTop: 16,
  },
  linkText: {
    fontSize: 16,
    color: Colors.primary,
    fontFamily: "Inter_500Medium",
  },
});
