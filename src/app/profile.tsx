import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EnterpriseHeader from '@/components/ui/EnterpriseHeader';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import { apiError, getMyProfile, updateMyProfile, type MyProfile } from '@/services/profile';

const initialsOf = (name?: string) =>
  String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <View className="flex-row items-center justify-between border-b border-slate-100 py-3">
      <Text className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</Text>
      <Text className="ml-4 flex-1 text-right text-sm text-slate-900" numberOfLines={1}>
        {value || '—'}
      </Text>
    </View>
  );
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      setProfile(await getMyProfile());
    } catch (e) {
      setError(apiError(e, 'Could not load your profile.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const startEdit = () => {
    setName(profile?.name || '');
    setPhone(profile?.phone || '');
    setFormError('');
    setSaved(false);
    setEditing(true);
  };

  const save = async () => {
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    // Same rules as the API (PATCH /user/me)
    if (cleanName.length < 2 || cleanName.length > 80) return setFormError('Name must be 2–80 characters');
    if (cleanPhone && !/^\+?[0-9\s\-()]{7,20}$/.test(cleanPhone)) return setFormError('Enter a valid phone number');

    try {
      setSaving(true);
      setFormError('');
      setProfile(await updateMyProfile({ name: cleanName, phone: cleanPhone }));
      setEditing(false);
      setSaved(true);
    } catch (e) {
      setFormError(apiError(e, 'Failed to update profile'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader onBack icon="user" title="My Profile" badge="Account" subtitle="Your personal details" />

      {loading ? (
        <LoadingState label="Loading profile…" />
      ) : error || !profile ? (
        <MessageState icon="alert-circle" title="Profile unavailable" message={error} actionLabel="Retry" onAction={load} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View className="items-center rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            {profile.avatar ? (
              <Image source={{ uri: profile.avatar }} className="h-20 w-20 rounded-full" />
            ) : (
              <View className="h-20 w-20 items-center justify-center rounded-full bg-indigo-100">
                <Text className="text-2xl font-bold text-indigo-700">{initialsOf(profile.name)}</Text>
              </View>
            )}
            <Text className="mt-3 text-lg font-semibold text-slate-900">{profile.name}</Text>
            <Text className="text-sm text-slate-500">{profile.email}</Text>
            {profile.role ? (
              <View className="mt-2 rounded-full bg-indigo-50 px-3 py-1">
                <Text className="text-xs font-semibold capitalize text-indigo-700">{profile.role}</Text>
              </View>
            ) : null}
          </View>

          {saved ? (
            <View className="mt-4 flex-row items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
              <Feather name="check-circle" size={16} color="#059669" />
              <Text className="text-sm text-emerald-700">Profile updated</Text>
            </View>
          ) : null}

          <View className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            {editing ? (
              <>
                <Text className="mb-1 text-xs font-medium text-slate-600">Name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  maxLength={80}
                  className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900"
                />
                <Text className="mb-1 text-xs font-medium text-slate-600">Phone</Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  maxLength={20}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900"
                />
                <Text className="mt-3 text-xs text-slate-400">Email and role are managed by your administrator.</Text>

                {formError ? <Text className="mt-3 text-sm text-rose-600">{formError}</Text> : null}

                <View className="mt-5 flex-row gap-3">
                  <Pressable
                    onPress={() => setEditing(false)}
                    disabled={saving}
                    className="flex-1 items-center rounded-xl border border-slate-200 py-3 active:bg-slate-50"
                  >
                    <Text className="text-sm font-semibold text-slate-700">Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={save}
                    disabled={saving}
                    className="flex-1 items-center rounded-xl bg-indigo-600 py-3 active:bg-indigo-700"
                  >
                    {saving ? <ActivityIndicator color="#fff" /> : <Text className="text-sm font-semibold text-white">Save</Text>}
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <InfoRow label="Phone" value={profile.phone} />
                <InfoRow label="Department" value={profile.department} />
                <InfoRow label="Designation" value={profile.designation} />
                <InfoRow
                  label="Member since"
                  value={profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : undefined}
                />
                <Pressable
                  onPress={startEdit}
                  className="mt-5 flex-row items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 active:bg-indigo-700"
                >
                  <Feather name="edit-2" size={15} color="#fff" />
                  <Text className="text-sm font-semibold text-white">Edit profile</Text>
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
