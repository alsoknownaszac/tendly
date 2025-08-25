import {
  useAbstraxionAccount,
} from "@burnt-labs/abstraxion-react-native";
import { ReclaimVerification } from "@reclaimprotocol/inapp-rn-sdk";
import { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const reclaimVerification = new ReclaimVerification();

// Twitter follower verification configuration
const reclaimConfig = {
  appId: process.env.EXPO_PUBLIC_RECLAIM_APP_ID ?? "",
  appSecret: process.env.EXPO_PUBLIC_RECLAIM_APP_SECRET ?? "",
  // TODO: Replace with actual Twitter followers provider ID from Reclaim Protocol
  providerId: process.env.EXPO_PUBLIC_RECLAIM_TWITTER_PROVIDER_ID ?? "twitter-followers-provider-id",
};

type Status =
  | "idle"
  | "verifying"
  | "verification_complete"
  | "complete"
  | "error";

interface ReclaimComponentProps {
  onVerificationComplete: (followerCount: number) => void;
  disabled?: boolean;
}

export default function ReclaimComponent({ 
  onVerificationComplete, 
  disabled = false 
}: ReclaimComponentProps) {
  const {
    data: account,
    isConnected,
    login,
    isConnecting,
  } = useAbstraxionAccount();

  const [status, setStatus] = useState<Status>("idle");
  const [loading, setLoading] = useState(false);
  const [verifiedFollowers, setVerifiedFollowers] = useState<number | undefined>(undefined);

  const startVerificationFlow = async () => {
    if (!account?.bech32Address) {
      Alert.alert("Error", "Please connect your wallet first");
      return;
    }

    // Clear previous state if retrying after error
    if (status === "error") {
      setVerifiedFollowers(undefined);
    }

    setLoading(true);
    setStatus("verifying");

    try {
      // Step 1: Verify with Reclaim Protocol
      const verificationResult = await reclaimVerification.startVerification({
        appId: reclaimConfig.appId,
        secret: reclaimConfig.appSecret,
        providerId: reclaimConfig.providerId,
      });

      console.log("Verification result:", verificationResult);
      setStatus("verification_complete");

      // Step 2: Extract follower count from verification result
      const claimData = verificationResult.proofs[0].claimData;
      const parameters = claimData.parameters;
      
      // Extract follower count from parameters
      // The exact structure depends on the Reclaim provider configuration
      let followerCount = 0;
      
      if (typeof parameters === 'string') {
        // Parse JSON string if parameters is a string
        try {
          const parsedParams = JSON.parse(parameters);
          followerCount = parsedParams.followers_count || parsedParams.follower_count || 0;
        } catch (e) {
          // If not JSON, try to extract number from string
          const match = parameters.match(/followers?[_\s]*count[:\s]*(\d+)/i);
          followerCount = match ? parseInt(match[1], 10) : 0;
        }
      } else if (typeof parameters === 'object' && parameters !== null) {
        // Direct object access
        followerCount = (parameters as any).followers_count || 
                       (parameters as any).follower_count || 
                       (parameters as any).followersCount || 0;
      }

      console.log("Extracted follower count:", followerCount);
      setVerifiedFollowers(followerCount);
      setStatus("complete");

      // Step 3: Call the completion callback
      onVerificationComplete(followerCount);

      Alert.alert(
        "Verification Complete! 🎉",
        `Your Twitter account has been verified with ${followerCount.toLocaleString()} followers!`
      );
    } catch (error) {
      console.log("Error in verification flow:", error);
      setStatus("error");

      if (error instanceof ReclaimVerification.ReclaimVerificationException) {
        switch (error.type) {
          case ReclaimVerification.ExceptionType.Cancelled:
            Alert.alert("Cancelled", "Verification was cancelled");
            break;
          case ReclaimVerification.ExceptionType.Dismissed:
            Alert.alert("Dismissed", "Verification was dismissed");
            break;
          case ReclaimVerification.ExceptionType.SessionExpired:
            Alert.alert("Expired", "Verification session expired");
            break;
          case ReclaimVerification.ExceptionType.Failed:
          default:
            Alert.alert("Failed", "Verification failed");
        }
      } else {
        Alert.alert(
          "Error",
          error instanceof Error
            ? error.message
            : "An unknown error occurred during verification"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "idle":
        return "Ready to verify Twitter followers";
      case "verifying":
        return "Verifying with Reclaim Protocol...";
      case "verification_complete":
        return "✓ Verification completed";
      case "complete":
        return "✓ Twitter followers verified!";
      case "error":
        return "❌ Verification failed";
      default:
        return "Unknown status";
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "idle":
        return "#8B7355";
      case "verifying":
        return "#F59E0B";
      case "verification_complete":
      case "complete":
        return "#87A96B";
      case "error":
        return "#D97757";
      default:
        return "#8B7355";
    }
  };

  const isButtonDisabled = () => {
    return loading || status === "complete" || disabled;
  };

  const getButtonText = () => {
    if (loading) {
      return "Verifying...";
    }
    if (status === "complete") {
      return "Verification Complete";
    }
    if (status === "error") {
      return "Retry Verification";
    }
    return "Verify Twitter Followers";
  };

  return (
    <View style={styles.container}>
      {!isConnected ? (
        <View style={styles.connectButtonContainer}>
          <TouchableOpacity
            onPress={login}
            style={[
              styles.connectButton,
              isConnecting && styles.disabledButton,
            ]}
            disabled={isConnecting}
          >
            <Text style={styles.connectButtonText}>
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <TouchableOpacity
            style={[styles.button, isButtonDisabled() && styles.disabledButton]}
            onPress={startVerificationFlow}
            disabled={isButtonDisabled()}
          >
            <Text style={styles.buttonText}>{getButtonText()}</Text>
          </TouchableOpacity>
          
          <View style={styles.statusContainer}>
            <Text style={styles.statusTitle}>Status:</Text>
            <Text style={[styles.statusText, { color: getStatusColor() }]}>
              {getStatusText()}
            </Text>
          </View>
          
          {verifiedFollowers !== undefined && (
            <View style={styles.resultContainer}>
              <Text style={styles.resultTitle}>Verified Followers:</Text>
              <Text style={styles.resultText}>
                {verifiedFollowers.toLocaleString()}
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  connectButtonContainer: {
    alignItems: "center",
  },
  connectButton: {
    backgroundColor: "#87A96B",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: "center",
  },
  connectButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F5F1E8",
  },
  button: {
    backgroundColor: "#87A96B",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#C4B59A",
    opacity: 0.7,
  },
  buttonText: {
    color: "#F5F1E8",
    fontSize: 16,
    fontWeight: "600",
  },
  statusContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(229, 221, 208, 0.6)",
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C5F41",
    marginBottom: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "500",
  },
  resultContainer: {
    backgroundColor: "rgba(135, 169, 107, 0.1)",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(135, 169, 107, 0.3)",
    alignItems: "center",
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C5F41",
    marginBottom: 8,
  },
  resultText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#87A96B",
  },
});