import { useEffect, useState } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { onAuthStateChanged, User } from 'firebase/auth'
import { auth } from '../src/firebase'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { 
  useFonts, 
  Outfit_400Regular, 
  Outfit_600SemiBold, 
  Outfit_700Bold 
} from '@expo-google-fonts/outfit'

// スプラッシュ画面を維持
SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const router = useRouter()
  const segments = useSegments()

  // フォント読み込み
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_600SemiBold,
    Outfit_700Bold,
  })

  useEffect(() => {
    return onAuthStateChanged(auth, u => setUser(u ?? null))
  }, [])

  useEffect(() => {
    if (user === undefined || !fontsLoaded) return 

    // フォントと認証の両方が準備できたらスプラッシュ画面を隠す
    SplashScreen.hideAsync()

    const inAuth = segments[0] === 'login'
    if (!user && !inAuth) {
      router.replace('/login')
    } else if (user && inAuth) {
      router.replace('/')
    }
  }, [user, segments, fontsLoaded])

  if (!fontsLoaded) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
      </Stack>
    </GestureHandlerRootView>
  )
}
