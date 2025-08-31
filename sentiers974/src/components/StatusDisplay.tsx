import React from "react";
import { Text } from "react-native";
import { useSessionStore } from "../store/useSessionStore";

export default function StatusDisplay() {
  const { status } = useSessionStore();

  return (
    <Text
      className={`text-lg text-center mt-4 ${
        status === "running"
          ? "text-green-600"
          : status === "paused"
          ? "text-orange-600"
          : "text-gray-600"
      }`}
    >
      Status: {status}
    </Text>
  );
}