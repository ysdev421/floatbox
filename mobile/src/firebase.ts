import { initializeApp, getApps, getApp } from 'firebase/app'
import { 
  initializeAuth, 
  getReactNativePersistence 
} from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import Constants from 'expo-constants'
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage'

// Expoのapp.jsonから設定を読み込む
const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey,
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain,
  projectId: Constants.expoConfig?.extra?.firebaseProjectId,
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket,
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId,
  appId: Constants.expoConfig?.extra?.firebaseAppId,
}

// 初期化（二重初期化を防止）
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()

// 永続性を設定してAuthを初期化（警告を解消）
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
})

const db = getFirestore(app)

export { auth, db }
