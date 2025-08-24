import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ViewStyle,
} from 'react-native';
import { Sprout, Flower, TreePine } from 'lucide-react-native';

interface Plant {
  id: string;
  type: 'sprout' | 'sapling' | 'flower' | 'tree';
  taskName: string;
  growth: number;
  position: { x: number; y: number };
  planted: Date;
}

interface GardenPlantProps {
  plant: Plant;
  style?: ViewStyle;
}

export function GardenPlant({ plant, style }: GardenPlantProps) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Initial appearance animation
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();

    // Gentle breathing animation
    const breathingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    breathingAnimation.start();

    return () => breathingAnimation.stop();
  }, []);

  const getPlantEmoji = () => {
    if (plant.growth < 30) return '🌱';
    if (plant.growth < 60) return '🌿';
    if (plant.growth < 90) return plant.type === 'flower' ? '🌸' : '🌳';
    return plant.type === 'flower' ? '🌺' : '🌲';
  };

  const getPlantSize = () => {
    if (plant.growth < 30) return 24;
    if (plant.growth < 60) return 32;
    if (plant.growth < 90) return 40;
    return 48;
  };

  const daysGrowing = plant.planted
    ? Math.floor(
        (Date.now() - new Date(plant.planted).getTime()) / (1000 * 60 * 60 * 24)
      )
    : 0; // Default to 0 if `planted` is undefined

  return (
    <TouchableOpacity style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.plantContainer,
          {
            transform: [
              { scale: scaleAnim },
              {
                translateY: bounceAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -2],
                }),
              },
            ],
          },
        ]}
      >
        {/* Growth Progress Ring */}
        <View style={styles.progressRing}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${plant.growth}%`,
              },
            ]}
          />
        </View>

        {/* Plant */}
        <Text style={[styles.plant, { fontSize: getPlantSize() }]}>
          {getPlantEmoji()}
        </Text>

        {/* Growth percentage */}
        <View style={styles.growthBadge}>
          <Text style={styles.growthText}>{plant.growth}%</Text>
        </View>
      </Animated.View>

      {/* Plant Info Tooltip */}
      <View style={styles.tooltip}>
        <Text style={styles.tooltipTitle}>{plant.taskName}</Text>
        <Text style={styles.tooltipSubtitle}>
          {daysGrowing === 0 ? 'Planted today' : `${daysGrowing} days old`}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: 80,
  },
  plantContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 2,
    borderColor: 'rgba(135, 169, 107, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  progressRing: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 33,
    backgroundColor: 'rgba(229, 221, 208, 0.3)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#87A96B',
    borderRadius: 33,
  },
  plant: {
    textAlign: 'center',
  },
  growthBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#87A96B',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: '#F5F1E8',
  },
  growthText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F5F1E8',
  },
  tooltip: {
    marginTop: 8,
    alignItems: 'center',
    maxWidth: 80,
  },
  tooltipTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2C5F41',
    textAlign: 'center',
    marginBottom: 2,
  },
  tooltipSubtitle: {
    fontSize: 10,
    color: '#8B7355',
    textAlign: 'center',
  },
});
