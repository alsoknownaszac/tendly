import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { Leaf, Plus } from 'lucide-react-native';

interface CompostCounterProps {
  count: number;
}

export function CompostCounter({ count }: CompostCounterProps) {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);

  useEffect(() => {
    // Gentle glow animation using react-native-reanimated
    glow.value = withRepeat(withTiming(1, { duration: 2000 }), -1, true);
  }, [glow]);

  const handlePress = () => {
    scale.value = withSpring(0.95, { duration: 100 }, () => {
      scale.value = withSpring(1, { duration: 100 });
    });
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      shadowOpacity: interpolate(glow.value, [0, 1], [0.1, 0.3]),
    };
  });

  return (
    <TouchableOpacity onPress={handlePress}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <View style={styles.iconContainer}>
          <Leaf size={16} color="#87A96B" />
        </View>
        <Text style={styles.count}>{count}</Text>
        <TouchableOpacity style={styles.addButton}>
          <Plus size={12} color="#87A96B" />
        </TouchableOpacity>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(135, 169, 107, 0.3)',
    shadowColor: '#87A96B',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(135, 169, 107, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C5F41',
    minWidth: 32,
    textAlign: 'center',
  },
  addButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(135, 169, 107, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(135, 169, 107, 0.3)',
  },
});
