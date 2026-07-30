import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import UserForm from '@/components/forms/UserForm';
import EnterpriseHeader from '@/components/ui/EnterpriseHeader';
import { createUser, type UserInput } from '@/services/users';

export default function NewUserScreen() {
  const handleCreate = async (values: UserInput) => {
    await createUser({
      ...values,
      name: values.name.trim(),
      // Lowercased to match the schema's `lowercase: true`. The API's duplicate
      // pre-check queries the raw string, so a mixed-case address would slip
      // past it and fail on the unique index as an opaque 500 instead of a
      // clean "Email already exists".
      email: values.email.trim().toLowerCase(),
      department: values.department.trim(),
      phone: values.phone.trim(),
    });
    Toast.show({ type: 'success', text1: 'User created' });
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
