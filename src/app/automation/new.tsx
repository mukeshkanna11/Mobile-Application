import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import AutomationForm from '@/components/forms/AutomationForm';
import EnterpriseHeader from '@/components/ui/EnterpriseHeader';
import {
  AUTOMATION_TEMPLATES,
  createAutomation,
  crmModuleMeta,
  emptyAutomation,
  type AutomationInput,
} from '@/services/automations';

/** Create screen; optional `module` (from a module list) and `template` (from Templates). */
export default function NewAutomationScreen() {
  const { module, template } = useLocalSearchParams<{ module?: string; template?: string }>();
  const preset = AUTOMATION_TEMPLATES.find((t) => t.id === template)?.preset;
  const initial: AutomationInput = preset
    ? (JSON.parse(JSON.stringify(preset)) as AutomationInput) // fresh copy per screen
    : emptyAutomation(crmModuleMeta(module) ? module : 'Lead');

  const handleCreate = async (input: AutomationInput) => {
    const created = await createAutomation(input);
    Toast.show({ type: 'success', text1: 'Automation created as Draft' });
    // Replace so Back returns to the list, not the form.
    if (created?._id) router.replace({ pathname: '/automation/[id]', params: { id: created._id } });
    else router.replace({ pathname: '/automations/[module]', params: { module: input.module } });
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        icon="zap"
        title={preset ? 'New from Template' : 'New Automation'}
        badge="CRM Automation"
        subtitle="Trigger, conditions and actions"
      />
      <AutomationForm initial={initial} submitLabel="Create Automation" onSubmit={handleCreate} />
    </SafeAreaView>
  );
}
