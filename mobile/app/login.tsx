import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import * as Google from 'expo-auth-session/providers/google'
import { GoogleAuthProvider, signInWithCredential, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../src/firebase'

WebBrowser.maybeCompleteAuthSession()

export default function LoginScreen() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: '520488561906-bg8drrd6vt6t305k1l9uvpnv9ivu89vj.apps.googleusercontent.com',
    redirectUri: 'https://auth.expo.io/@anonymous/floatbox',
    responseType: 'id_token',
  })

  async function handleEmailLogin(isSignUp: boolean) {
    if (!email || !password) {
      Alert.alert('エラー', 'メールアドレスとパスワードを入力してください')
      return
    }
    try {
      setLoading(true)
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password)
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
    } catch (e: any) {
      Alert.alert('認証エラー', e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin() {
    try {
      setLoading(true)
      const result = await promptAsync()
      if (result.type === 'success') {
        const { id_token } = result.params
        const credential = GoogleAuthProvider.credential(id_token)
        await signInWithCredential(auth, credential)
      } else {
        setLoading(false)
      }
    } catch (e: any) {
      Alert.alert('ログインエラー', e.message)
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.box}>
        <Text style={styles.logo}>FloatBox</Text>
        <Text style={styles.desc}>頭の中のモヤモヤを吐き出そう</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="メールアドレス"
            placeholderTextColor="#555"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="パスワード"
            placeholderTextColor="#555"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <View style={styles.btnRow}>
            <Pressable style={styles.emailBtn} onPress={() => handleEmailLogin(false)}>
              <Text style={styles.emailBtnText}>ログイン</Text>
            </Pressable>
            <Pressable style={[styles.emailBtn, styles.signUpBtn]} onPress={() => handleEmailLogin(true)}>
              <Text style={styles.emailBtnText}>新規登録</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.hr}>
          <View style={styles.line} />
          <Text style={styles.hrText}>または</Text>
          <View style={styles.line} />
        </View>

        <Pressable
          style={({ pressed }) => [styles.googleBtn, pressed && styles.googleBtnPressed]}
          onPress={handleLogin}
          disabled={loading || !request}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.googleBtnText}>Google でログイン</Text>
          )}
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f13', justifyContent: 'center', alignItems: 'center', padding: 24 },
  box: { width: '100%', maxWidth: 360, alignItems: 'center' },
  logo: { fontSize: 36, fontWeight: '700', color: '#fff', letterSpacing: 1, marginBottom: 8 },
  desc: { fontSize: 16, color: '#888', marginBottom: 32, textAlign: 'center' },
  
  form: { width: '100%', gap: 12, marginBottom: 24 },
  input: {
    backgroundColor: '#1a1a24', borderRadius: 12, height: 52, paddingHorizontal: 16,
    color: '#fff', fontSize: 16, borderWidth: 1, borderColor: '#2a2a3a'
  },
  btnRow: { flexDirection: 'row', gap: 12 },
  emailBtn: {
    flex: 1, height: 48, backgroundColor: '#1e1e2e', borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#2a2a3a'
  },
  signUpBtn: { backgroundColor: 'transparent' },
  emailBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  hr: { flexDirection: 'row', alignItems: 'center', width: '100%', marginVertical: 24, gap: 12 },
  line: { flex: 1, height: 1, backgroundColor: '#1e1e2e' },
  hrText: { color: '#444', fontSize: 12, fontWeight: '600' },

  googleBtn: { backgroundColor: '#5e6ad2', paddingVertical: 14, borderRadius: 12, width: '100%', alignItems: 'center', minHeight: 52, justifyContent: 'center' },
  googleBtnPressed: { opacity: 0.8 },
  googleBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
