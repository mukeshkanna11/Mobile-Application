import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Checkbox } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import FeatureCard from '@/components/ui/FeatureCard';
import GradientBackground from '@/components/ui/GradientBackground';
import InputField from '@/components/ui/InputField';
import PrimaryButton from '@/components/ui/PrimaryButton';
import { ADMIN_EMAIL } from '@/constants/config';
import {
  clearRememberedPassword,
  getRememberedPassword,
  getToken,
  login,
  saveRememberedPassword,
} from '@/services/auth';

const logo = require('@/assets/images/Rtech-logo.png');

const FEATURES = [
  { title: 'CRM Management', subtitle: 'Leads & Customers', color: '#4ade80' },
  { title: 'Inventory', subtitle: 'Products & Stock', color: '#60a5fa' },
  { title: 'Projects', subtitle: 'Workflow Tracking', color: '#c084fc' },
  { title: 'Reports', subtitle: 'Business Analytics', color: '#f472b6' },
];

export default function LoginScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);

  // Redirect if already authenticated; restore a remembered password.
  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (token) {
        router.replace('/dashboard');
        return;
      }
      const saved = await getRememberedPassword();
      if (saved) {
        setPassword(saved);
        setRememberMe(true);
      }
      setBooting(false);
    })();
  }, []);

  const handleLogin = async () => {
    if (!password.trim()) {
      Toast.show({ type: 'error', text1: 'Password is required' });
      return;
    }

    try {
      setLoading(true);
      await login(ADMIN_EMAIL, password);

      if (rememberMe) {
        await saveRememberedPassword(password);
      } else {
        await clearRememberedPassword();
      }

      router.replace('/dashboard');
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Login failed',
        text2: err?.response?.data?.message ?? 'Please check your credentials',
      });
    } finally {
      setLoading(false);
    }
  };

  if (booting) {
    return (
      <GradientBackground>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#ffffff" size="large" />
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View
              className={`flex-1 px-6 py-8 ${
                isWide ? 'flex-row items-center gap-10' : 'justify-center'
              }`}
            >
              {/* Hero (wide screens / tablets) */}
              {isWide && (
                <View className="flex-1">
                  <Image
                    source={logo}
                    style={{ width: 88, height: 88, marginBottom: 24 }}
                    contentFit="contain"
                  />
                  <Text className="text-4xl font-black text-white">
                    ReadyTechSolutions
                  </Text>
                  <Text className="mt-1 text-2xl font-semibold text-indigo-300">
                    CRM & ERP Platform
                  </Text>
                  <Text className="mt-4 text-base leading-relaxed text-slate-300">
                    Manage leads, customers, inventory, projects, employees,
                    invoices and business operations from one powerful
                    dashboard.
                  </Text>

                  <View className="mt-8 gap-4">
                    <View className="flex-row gap-4">
                      <FeatureCard {...FEATURES[0]} />
                      <FeatureCard {...FEATURES[1]} />
                    </View>
                    <View className="flex-row gap-4">
                      <FeatureCard {...FEATURES[2]} />
                      <FeatureCard {...FEATURES[3]} />
                    </View>
                  </View>
                </View>
              )}

              {/* Login card */}
              <View
                className={isWide ? 'w-[420px]' : 'w-full max-w-md self-center'}
              >
                <View className="rounded-3xl border border-white/20 bg-white/95 p-8 shadow-2xl">
                  <View className="mb-8 items-center">
                    <Image
                      source={logo}
                      style={{ width: 72, height: 72, marginBottom: 16 }}
                      contentFit="contain"
                    />
                    <Text className="text-3xl font-bold text-slate-900">
                      Welcome Back
                    </Text>
                    <Text className="mt-2 text-sm text-slate-500">
                      Sign in to continue to your dashboard
                    </Text>
                  </View>

                  <View className="gap-5">
                    <InputField
                      label="Admin Email"
                      icon="mail"
                      value={ADMIN_EMAIL}
                      disabled
                    />

                    <InputField
                      label="Password"
                      icon="lock"
                      secure
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Enter your password"
                      returnKeyType="go"
                      onSubmitEditing={handleLogin}
                    />

                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <Checkbox
                          status={rememberMe ? 'checked' : 'unchecked'}
                          onPress={() => setRememberMe((v) => !v)}
                          color="#4f46e5"
                        />
                        <Text className="text-sm text-slate-600">
                          Remember Me
                        </Text>
                      </View>

                      <View className="flex-row items-center gap-1">
                        <Feather name="shield" size={14} color="#16a34a" />
                        <Text className="text-xs text-green-600">
                          Secure Login
                        </Text>
                      </View>
                    </View>

                    <PrimaryButton
                      label="Login"
                      loadingLabel="Signing In…"
                      loading={loading}
                      onPress={handleLogin}
                    />
                  </View>

                  <View className="mt-8 border-t border-slate-200 pt-6">
                    <View className="flex-row items-center justify-center gap-2">
                      <Feather name="shield" size={14} color="#64748b" />
                      <Text className="text-xs text-slate-500">
                        Enterprise Protected Access
                      </Text>
                    </View>
                    <Text className="mt-3 text-center text-xs text-slate-400">
                      © {new Date().getFullYear()} ReadyTech Solutions. All
                      rights reserved.
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}
