import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import EnterpriseHeader from '@/components/ui/EnterpriseHeader';
import FormField from '@/components/ui/FormField';
import PrimaryButton from '@/components/ui/PrimaryButton';
import Segmented from '@/components/ui/Segmented';
import { MessageState } from '@/components/ui/StateView';
import {
  aiChat,
  getAITool,
  initialValues,
  parseSEO,
  seoScore,
  validateAIInput,
  type AITool,
  type SEOResult,
} from '@/services/ai';
import { goBackOr } from '@/utils/nav';

function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="mb-3 mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{children}</Text>
  );
}

/** expo-clipboard isn't installed, so "Copy" opens the native share sheet (which includes Copy). */
async function shareText(text: string) {
  if (!text) return;
  try {
    await Share.share({ message: text });
  } catch {
    Toast.show({ type: 'error', text1: 'Copy failed' });
  }
}

function ShareButton({ text, label = 'Copy / Share' }: { text?: string; label?: string }) {
  if (!text) return null;
  return (
    <Pressable onPress={() => shareText(text)} hitSlop={8} className="flex-row items-center gap-1 active:opacity-70">
      <Feather name="share-2" size={13} color="#4f46e5" />
      <Text className="text-xs font-semibold text-indigo-600">{label}</Text>
    </Pressable>
  );
}

function ResultCard({ title, copyText, children }: { title: string; copyText?: string; children: React.ReactNode }) {
  return (
    <View className="mb-3 rounded-2xl border border-slate-200 bg-white p-4">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</Text>
        <ShareButton text={copyText} label="Copy" />
      </View>
      {children}
    </View>
  );
}

function SEOResultView({ data }: { data: SEOResult }) {
  const score = seoScore(data);
  const tone = score >= 80 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : 'text-red-600';
  return (
    <>
      <ResultCard title="SEO Score">
        <Text className={`text-3xl font-bold ${tone}`}>{score}<Text className="text-base text-slate-400"> / 100</Text></Text>
      </ResultCard>
      <ResultCard title="Meta Title" copyText={data.metaTitle}>
        <Text className="text-sm text-slate-700">{data.metaTitle || '—'}</Text>
        {data.metaTitle ? <Text className="mt-1 text-[11px] text-slate-400">{data.metaTitle.length} characters</Text> : null}
      </ResultCard>
      <ResultCard title="Meta Description" copyText={data.metaDescription}>
        <Text className="text-sm leading-relaxed text-slate-700">{data.metaDescription || '—'}</Text>
        {data.metaDescription ? (
          <Text className="mt-1 text-[11px] text-slate-400">{data.metaDescription.length} characters</Text>
        ) : null}
      </ResultCard>
      <ResultCard title="Keywords" copyText={data.keywords?.join(', ')}>
        <View className="flex-row flex-wrap gap-2">
          {data.keywords?.length ? (
            data.keywords.map((k, i) => (
              <View key={`${k}-${i}`} className="rounded-full bg-indigo-50 px-3 py-1">
                <Text className="text-xs font-medium text-indigo-700">{k}</Text>
              </View>
            ))
          ) : (
            <Text className="text-sm text-slate-400">—</Text>
          )}
        </View>
      </ResultCard>
      <ResultCard title="URL Slug" copyText={data.urlSlug}>
        <Text className="text-sm text-slate-700">/{data.urlSlug || '—'}</Text>
      </ResultCard>
      <ResultCard
        title="FAQs"
        copyText={data.faqs?.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')}
      >
        {data.faqs?.length ? (
          data.faqs.map((f, i) => (
            <View key={i} className={i > 0 ? 'mt-3 border-t border-slate-100 pt-3' : ''}>
              <Text className="text-sm font-semibold text-slate-800">{f.question}</Text>
              <Text className="mt-1 text-sm leading-relaxed text-slate-600">{f.answer}</Text>
            </View>
          ))
        ) : (
          <Text className="text-sm text-slate-400">—</Text>
        )}
      </ResultCard>
    </>
  );
}

function ToolForm({ tool }: { tool: AITool }) {
  const [values, setValues] = useState<Record<string, string>>(() => initialValues(tool));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [answer, setAnswer] = useState('');
  const [seo, setSeo] = useState<SEOResult | null>(null);
  // Blocks a second request before the loading state re-renders the button.
  const busyRef = useRef(false);

  const set = (key: string, v: string) => setValues((cur) => ({ ...cur, [key]: v }));

  const generate = async () => {
    if (busyRef.current) return;
    const invalid = validateAIInput(tool, values);
    if (invalid) {
      Toast.show({ type: 'error', text1: invalid });
      return;
    }
    busyRef.current = true;
    setLoading(true);
    setError('');
    try {
      const trimmed = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.trim()]));
      const text = await aiChat(tool.buildPrompt(trimmed));
      if (tool.output === 'seo') {
        const parsed = parseSEO(text);
        if (!parsed) throw new Error('Could not parse the AI response. Please try again.');
        setSeo(parsed);
      } else {
        setAnswer(text);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to generate';
      setError(msg);
      Toast.show({ type: 'error', text1: 'Generation failed', text2: msg });
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  };

  const hasResult = tool.output === 'seo' ? Boolean(seo) : Boolean(answer);

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <SectionTitle>Inputs</SectionTitle>
        {tool.fields.map((f) =>
          f.kind === 'select' ? (
            <Segmented
              key={f.key}
              label={f.label}
              options={f.options ?? []}
              value={values[f.key]}
              onChange={(v) => set(f.key, v)}
              scroll
            />
          ) : (
            <FormField
              key={f.key}
              label={f.label}
              required={tool.required.includes(f.key)}
              value={values[f.key]}
              onChangeText={(t) => set(f.key, t)}
              placeholder={f.placeholder}
              multiline={f.kind === 'multiline'}
              autoCapitalize="sentences"
            />
          )
        )}

        <View className="mt-2">
          <PrimaryButton
            label={hasResult ? 'Regenerate' : 'Generate'}
            loadingLabel="Generating…"
            loading={loading}
            onPress={generate}
          />
        </View>

        {error && !loading ? (
          <View className="mt-4 flex-row items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
            <Feather name="alert-triangle" size={14} color="#dc2626" />
            <Text className="flex-1 text-xs leading-5 text-red-700">{error}</Text>
          </View>
        ) : null}

        {hasResult ? (
          <View className="mt-6">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">Result</Text>
              {tool.output === 'text' ? <ShareButton text={answer} /> : null}
            </View>
            {tool.output === 'seo' && seo ? (
              <SEOResultView data={seo} />
            ) : (
              <View className="rounded-2xl border border-slate-200 bg-white p-4">
                <Text selectable className="text-sm leading-relaxed text-slate-800">
                  {answer}
                </Text>
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default function AIToolScreen() {
  const { tool: key } = useLocalSearchParams<{ tool: string }>();
  const tool = getAITool(key);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        icon={tool?.icon ?? 'cpu'}
        title={tool?.title ?? 'AI Tool'}
        badge="AI"
        subtitle={tool?.description}
      />
      {tool ? (
        // Keyed so switching tools resets the form state.
        <ToolForm key={tool.key} tool={tool} />
      ) : (
        <MessageState
          icon="help-circle"
          title="Unknown AI tool"
          message="This tool doesn't exist. Pick one from the AI Tools list."
          actionLabel="Open AI Tools"
          onAction={() => goBackOr('/ai')}
        />
      )}
    </SafeAreaView>
  );
}
