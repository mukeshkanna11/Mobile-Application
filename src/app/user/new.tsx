import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import UserForm from '@/components/forms/UserForm';
import EnterpriseHeader from '@/components/ui/EnterpriseHeader';
import { createUser, type UserInput } from '@/services/users';

export default function NewUserScreen() {
  const handleCreate = async (values: UserInput) => {
    // Trimming/lowercasing happens in toPayload(), same as the web saveUser().
    await createUser(values);
    Toast.show({ type: 'success', text1: 'User created successfully' });
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        icon="user-plus"
        title="Create New User"
        subtitle="Manage user access, roles and security permissions"
      />
      <UserForm submitLabel="Create User" onSubmit={handleCreate} />
    </SafeAreaView>
  );
}
