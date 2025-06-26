import { useFonts, VT323_400Regular } from '@expo-google-fonts/vt323';
import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';
import config from './app/src/config';
import HomeScreen from './app/screens/HomeScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const mockMode = config.mockMode;

  const [fontsLoaded] = useFonts({ VT323_400Regular });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const prepare = async () => {
      const lang = await AsyncStorage.getItem('appLanguage');

      if (mockMode) {
        await AsyncStorage.removeItem('appLanguage');
      }

      setIsReady(true);
    };

    prepare();
  }, []);

  if (!fontsLoaded || !isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Departures"
        screenOptions={{
          headerStyle: { backgroundColor: '#000' }, // preto
          headerTintColor: '#fff', // branco
          headerTitleStyle: {
            fontWeight: 'bold',
            fontFamily: 'VT323_400Regular',
            fontSize: 24,
          },
          headerTitleAlign: 'center',
        }}
      >
        <Stack.Screen
          name="Departures"
          component={HomeScreen}
          options={{
            title: 'AirBoard',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
