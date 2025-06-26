import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, LayoutAnimation, Platform, UIManager, Alert } from 'react-native';
import { AdMobInterstitial } from 'expo-ads-admob';
import config from '../src/config'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getHumanStatus(flight: any): string {
  if (!flight || !flight.status) return '—';
  const status = (flight.status || '').toLowerCase();
  switch (status) {
    case 'en-route': return 'En Route';
    case 'landed': return 'Arrived';
    case 'scheduled': return 'Scheduled';
    case 'active': return 'Active';
    case 'cancelled': return 'Cancelled';
    case 'incident': return 'Incident';
    case 'diverted': return 'Diverted';
    case 'boarding': return 'Boarding';
    case 'delayed': return 'Delayed';
    default: return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

export default function FlightCard({ flight }: { flight: any }) {
  const [expanded, setExpanded] = useState(false);
  const flipAnims = useRef([...Array(5)].map(() => new Animated.Value(0))).current;

  // Main fields
  const flightCode = flight.flight_iata || flight.flight_number || '—';
  const city = flight.arr_iata || '—';
  const time = flight.dep_time ? formatDate(flight.dep_time) : '—';
  const status = getHumanStatus(flight);
  const gateInfo = [
    flight.dep_gate ? `${flight.dep_gate}` : null,
    flight.dep_terminal ? `T${flight.dep_terminal}` : null
  ].filter(Boolean).join(' / ') || '—';
  const fields = [flightCode, city, time, status, gateInfo];

  useEffect(() => {
    flipAnims.forEach(anim => anim.setValue(0));
    Animated.stagger(
      80,
      flipAnims.map(anim =>
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 180,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      )
    ).start();
  }, [flightCode, city, time, status, gateInfo]);

  const handlePress = async () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
	if (Math.random() < 0.51) {
		await AdMobInterstitial.setAdUnitID(
			config.mockMode
			  ? config.admobInterstitialTest
			  : Platform.OS === 'ios'
				? config.iosInterstitialAdId
				: config.androidInterstitialAdId
		  );
		  
	await AdMobInterstitial.requestAdAsync({ servePersonalizedAds: config.isProduction });
	await AdMobInterstitial.showAdAsync();
	LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
	setExpanded((prev) => !prev);
	  return;
	}
  };

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={handlePress}>
      <View style={styles.card}>
        <View style={styles.row}>
          {fields.map((text, index) => (
            <Animated.Text
              key={index}
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[
                styles.cell,
                styles[`col${index}` as keyof typeof styles],
                index === 0 || index === 3 ? styles.yellow : styles.white,
                {
                  transform: [
                    {
                      rotateX: flipAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '90deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              {text}
            </Animated.Text>
          ))}
        </View>
        {expanded && (
          <View style={styles.details}>
            <Text style={styles.detailsText}>
              <Text style={styles.detailsLabel}>Flight: </Text>
              {flight.flight_iata || '—'}
            </Text>
            <Text style={styles.detailsText}>
              <Text style={styles.detailsLabel}>Airline: </Text>
              {flight.airline_iata || '—'}
            </Text>
            <Text style={styles.detailsText}>
              <Text style={styles.detailsLabel}>Departure: </Text>
              {flight.dep_iata || '—'} T{flight.dep_terminal || '—'} Gate {flight.dep_gate || '—'}
            </Text>
            <Text style={styles.detailsText}>
              <Text style={styles.detailsLabel}>Arrival: </Text>
              {flight.arr_iata || '—'} T{flight.arr_terminal || '—'} Gate {flight.arr_gate || '—'}
            </Text>
            <Text style={styles.detailsText}>
              <Text style={styles.detailsLabel}>Scheduled: </Text>
              {flight.dep_time ? formatDate(flight.dep_time) : '—'}
            </Text>
            <Text style={styles.detailsText}>
              <Text style={styles.detailsLabel}>Estimated: </Text>
              {flight.dep_estimated ? formatDate(flight.dep_estimated) : '—'}
            </Text>
            <Text style={styles.detailsText}>
              <Text style={styles.detailsLabel}>Status (raw): </Text>
              {getHumanStatus(flight)}
            </Text>
            {flight.dep_delayed !== undefined && flight.dep_delayed !== null && (
              <Text style={styles.detailsText}>
                <Text style={styles.detailsLabel}>Departure Delay: </Text>
                {flight.dep_delayed} min
              </Text>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#000',
    borderRadius: 8,
    paddingVertical: 20,
    paddingHorizontal: 8,
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#111',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    minHeight: 64,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cell: {
    fontSize: 11,
    fontFamily: 'VT323_400Regular',
    textAlign: 'center',
    marginHorizontal: 2,
    paddingHorizontal: 8,
    lineHeight: 28,
  },
  yellow: { color: '#FFD700' },
  white: { color: '#fff' },
  col0: { flex: 1, minWidth: 50 },
  col1: { flex: 2, minWidth: 60 },
  col2: { flex: 1, minWidth: 60 },
  col3: { flex: 2, minWidth: 70 },
  col4: { flex: 2, minWidth: 90 },
  details: {
    marginTop: 14,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  detailsText: {
    color: '#fff',
    fontSize: 11,
    lineHeight: 21,
    fontFamily: 'VT323_400Regular',
    marginBottom: 2,
  },
  detailsLabel: {
    fontWeight: 'bold',
    color: '#FFD700',
    fontSize: 11,
    fontFamily: 'VT323_400Regular',
  },
});
