import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { ReclaimVerification } from '@reclaimprotocol/inapp-rn-sdk';
import {
  useAbstraxionAccount,
} from '@burnt-labs/abstraxion-react-native';

const reclaimVerification = new ReclaimVerification();

const reclaimConfig = {
  appId: process.env.EXPO_PUBLIC_RECLAIM_APP_ID ?? '',
  appSecret: process.env.EXPO_PUBLIC_RECLAIM_APP_SECRET ?? '',
  // Replace with actual Twitter followers provider ID from Reclaim Protocol
  providerId: process.env.EXPO_PUBLIC_RECLAIM_PROVIDER_ID ?? 'twitter-followers-provider-id',
};

interface ReclaimComponentProps {
  onVerificationComplete: (followerCount: number) => void;
  disabled?: boolean;
}

type Status = 'idle' | 'verifying' | 'complete' | 'error';

export default function ReclaimComponent({ 
  onVerificationComplete, 
  disabled = false 
}: ReclaimComponentProps) {
  const { data: account, isConnected } = useAbstraxionAccount();
  const [status, setStatus] = useState<Status>('idle');
  const [loading, setLoading] = useState(false);

  const startVerificationFlow = async () => {
    if (!account?.bech32Address || !isConnected) {
      Alert.alert('Error', 'Please connect your wallet first');
      return;
    }

    setLoading(true);
    setStatus('verifying');

    try {
      // Step 1: Verify with Reclaim Protocol
      const verificationResult = await reclaimVerification.startVerification({
        appId: reclaimConfig.appId,
        secret: reclaimConfig.appSecret,
        providerId: reclaimConfig.providerId,
      });

      console.log('Verification result:', verificationResult);

      // Step 2: Extract follower count from verification result
      let followerCount = 0;
      
      if (verificationResult?.proofs?.[0]?.claimData?.parameters) {
        const parameters = verificationResult.proofs[0].claimData.parameters;
        
        // Try different possible parameter formats
        if (typeof parameters === 'string') {
          const parsed = JSON.parse(parameters);
          followerCount = parsed.followers_count || parsed.follower_count || 0;
        } else if (typeof parameters === 'object') {
          followerCount = parameters.followers_count || parameters.follower_count || 0;
        }
        
        // Fallback: try to extract from context
        if (followerCount === 0 && verificationResult.proofs[0].claimData.context) {
          const context = verificationResult.proofs[0].claimData.context;
          const match = context.match(/followers[_\s]*count["\s]*:[\s]*(\d+)/i);
          if (match) {
            followerCount = parseInt(match[1], 10);
          }
        }
      }

      console.log('Extracted follower count:', followerCount);

      if (followerCount > 0) {
        setStatus('complete');
        onVerificationComplete(followerCount);
      } else {
        throw new Error('Could not extract follower count from verification');
      }

    } catch (error) {
      console.error('Error in verification flow:', error);
      setStatus('error');

      if (error instanceof ReclaimVerification.ReclaimVerificationException) {
        switch (error.type) {
          case ReclaimVerification.ExceptionType.Cancelled:
            Alert.alert('Cancelled', 'Verification was cancelled');
            break;
          case ReclaimVerification.ExceptionType.Dismissed:
            Alert.alert('Dismissed', 'Verification was dismissed');
            break;
          case ReclaimVerification.ExceptionType.SessionExpired:
            Alert.alert('Expired', 'Verification session expired');
            break;
          case ReclaimVerification.ExceptionType.Failed:
          default:
            Alert.alert('Failed', 'Verification failed');
        }
      } else {
        Alert.alert(
          'Error',
          error instanceof Error
            ? error.message
            : 'An unknown error occurred during verification'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'idle':
        return 'Ready to verify Twitter followers';
      case 'verifying':
        return 'Verifying with Reclaim Protocol...';
      case 'complete':
        return '✅ Verification completed successfully!';
      case 'error':
        return '❌ Verification failed';
      default:
        return 'Unknown status';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'idle':
        return '#8B7355';
      case 'verifying':
        return '#F59E0B';
      case 'complete':
        return '#87A96B';
      case 'error':
        return '#D97757';
      default:
        return '#8B7355';
    }
  };

  const isButtonDisabled = () => {
    return loading || disabled || !isConnected || status === 'complete';
  };

  const getButtonText = () => {
    if (loading) {
      return 'Verifying...';
    }
    if (status === 'complete') {
      return 'Verification Complete';
    }
    if (status === 'error') {
      return 'Retry Verification';
    }
    return 'Start Twitter Verification';
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          isButtonDisabled() && styles.disabledButton
        ]}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 15,
  },
  button: {
    backgroundColor: '#87A96B',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#C4B59A',
    opacity: 0.6,
  },
  buttonText: {
    color: '#F5F1E8',
    fontSize: 16,
    fontWeight: '600',
  },
  statusContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(229, 221, 208, 0.6)',
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C5F41',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
});