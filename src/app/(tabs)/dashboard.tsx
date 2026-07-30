import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ActivityRow from '@/components/ui/ActivityRow';
import QuickAction from '@/components/ui/QuickAction';
import StatCard from '@/components/ui/StatCard';

import { logout, type AuthUser } from '@/services/auth';
import { fetchDashboard, type DashboardData } from '@/services/dashboard';
import { getObject, StorageKeys } from '@/services/storage';



const QUICK_ACTIONS = [
  {
    label: 'Add Client',
    icon: 'user-plus' as const,
    color: '#4f46e5',
    onPress: () => router.push('/clients'),
  },
  {
    label: 'New Invoice',
    icon: 'file-plus' as const,
    color: '#9333ea',
    onPress: () => router.push('/invoices'),
  },
  {
    label: 'Add Product',
    icon: 'package' as const,
    color: '#0ea5e9',
    onPress: () => router.push('/products'),
  },
  {
    label: 'Stock In',
    icon: 'download' as const,
    color: '#16a34a',
    onPress: () => router.push('/inventory'),
  },
];



function formatCurrency(value:number){

  return `₹${value.toLocaleString('en-IN')}`;

}


/** Uniform gap between every dashboard section. */
const SECTION_GAP = 'mt-8';


/**
 * One spec for every section heading: same type scale, same bottom margin, and
 * a trailing action that can never be squeezed by a long title.
 */
function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
  badge,
}: {
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
  badge?: ReactNode;
}) {
  return (
    <View className="flex-row items-center justify-between mb-4">

      <View className="flex-1 min-w-0 pr-3">

        <Text className="text-xl font-bold text-slate-900" numberOfLines={1}>
          {title}
        </Text>

        <Text
          className="mt-0.5 text-sm leading-5 text-slate-500"
          numberOfLines={2}
        >
          {subtitle}
        </Text>

      </View>

      {actionLabel && onAction ? (

        <Pressable
          onPress={onAction}
          hitSlop={6}
          className="flex-row items-center px-3.5 py-2 rounded-full shrink-0 bg-indigo-50 active:opacity-80"
        >

          <Text className="mr-1 text-sm font-semibold text-indigo-600">
            {actionLabel}
          </Text>

          <Feather name="arrow-right" size={16} color="#4F46E5" />

        </Pressable>

      ) : badge ? (

        <View className="shrink-0">{badge}</View>

      ) : null}

    </View>
  );
}




export default function DashboardScreen(){

  const [user,setUser] = useState<AuthUser | null>(null);

  const [data,setData] = useState<DashboardData | null>(null);

  const [loading,setLoading] = useState(true);

  const [refreshing,setRefreshing] = useState(false);




  const loadDashboard = useCallback(async()=>{

    try{

      const response = await fetchDashboard();

      setData(response);


    }catch(error){

      console.log(
        "Dashboard API Error:",
        error
      );


    }finally{

      setLoading(false);
      setRefreshing(false);

    }


  },[]);





  useEffect(()=>{

    getObject<AuthUser>(
      StorageKeys.user
    )
    .then(setUser);


    loadDashboard();


  },[loadDashboard]);






  const onRefresh = useCallback(()=>{

    setRefreshing(true);

    loadDashboard();


  },[loadDashboard]);






  const handleLogout = async()=>{

    try{

      await logout();

      router.replace('/');


    }catch(error){

      console.log(
        "Logout error:",
        error
      );

    }

  };





return (

<SafeAreaView
className="flex-1 bg-slate-50"
edges={['top']}
>


<ScrollView


showsVerticalScrollIndicator={false}


contentContainerStyle={{
padding:20,
paddingBottom:40
}}


refreshControl={

<RefreshControl

refreshing={refreshing}

onRefresh={onRefresh}

/>

}



>


{/* ===================== DASHBOARD HEADER ===================== */}

<View className="rounded-[28px] overflow-hidden bg-indigo-600">

  {/* Background Decoration */}
  <View className="absolute w-40 h-40 bg-indigo-500 rounded-full -top-10 -right-10 opacity-40" />
  <View className="absolute bottom-0 w-32 h-32 rounded-full -left-12 bg-violet-500 opacity-30" />

  <View className="p-6">

    {/* Top Row */}
    <View className="flex-row items-center justify-between">

      {/* Company */}
      <View className="flex-row items-center flex-1 min-w-0 pr-3">

        <View className="items-center justify-center w-12 h-12 shrink-0 bg-white/20 rounded-2xl">

          <Feather
            name="briefcase"
            size={22}
            color="white"
          />

        </View>

        <View className="flex-1 min-w-0 ml-3">

          <Text
            className="text-base font-semibold text-white"
            numberOfLines={1}
          >
            ReadyTech Solutions
          </Text>

          <Text className="text-xs text-indigo-100" numberOfLines={1}>
            CRM Management Platform
          </Text>

        </View>

      </View>

      {/* Logout */}

      <Pressable
        onPress={handleLogout}
        hitSlop={6}
        className="items-center justify-center w-12 h-12 rounded-2xl shrink-0 bg-white/20 active:opacity-80"
      >

        <Feather
          name="log-out"
          size={20}
          color="white"
        />

      </Pressable>

    </View>

    {/* Greeting */}

    <View className="mt-6">

      <Text className="text-sm text-indigo-100">
        Welcome Back 👋
      </Text>

      <Text
        className="mt-1 text-2xl font-bold text-white"
        numberOfLines={2}
      >

        {user?.name ??
          user?.email ??
          'Administrator'}

      </Text>

      <Text className="mt-2 text-sm leading-5 text-indigo-100">

        Manage your business, track leads, monitor sales,
        invoices, clients and team performance from one
        intelligent CRM dashboard.

      </Text>

    </View>

  </View>

</View>





{/* ===================== REVENUE CARD ===================== */}

<View className={`relative p-6 ${SECTION_GAP} overflow-hidden bg-indigo-600 rounded-[28px]`}>

  {/* Background Decorations */}
  <View className="absolute rounded-full -top-8 -right-8 w-28 h-28 bg-white/10" />
  <View className="absolute w-24 h-24 rounded-full -bottom-10 -left-6 bg-violet-400/20" />

  {/* Header */}
  <View className="flex-row items-center justify-between">

    <View className="flex-1 min-w-0 pr-3">

      <Text className="text-xs tracking-wider text-indigo-200 uppercase">
        Revenue Overview
      </Text>

      <Text className="mt-1 text-lg font-bold text-white" numberOfLines={1}>
        Collected Revenue
      </Text>

    </View>

    <View className="items-center justify-center w-12 h-12 rounded-2xl shrink-0 bg-white/15">

      <Feather
        name="dollar-sign"
        size={22}
        color="white"
      />

    </View>

  </View>

  {/* Revenue */}

  {loading ? (

    <ActivityIndicator
      className="self-start mt-6"
      color="white"
    />

  ) : (

    <Text
      className="mt-6 text-4xl font-black text-white"
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.6}
    >
      {formatCurrency(data?.revenue ?? 0)}
    </Text>

  )}

  <Text className="mt-2 text-sm text-indigo-100">
    Across{" "}
    <Text className="font-bold text-white">
      {data?.invoices ?? 0}
    </Text>{" "}
    invoices
  </Text>

  {/* Bottom Section */}

  <View className="flex-row items-center justify-between pt-5 mt-6 border-t border-white/15">

    <View className="flex-1 min-w-0 pr-3">

      <Text className="text-xs text-indigo-200">
        Status
      </Text>

      <View className="flex-row items-center mt-1">

        <View className="w-2 h-2 mr-2 bg-green-400 rounded-full shrink-0" />

        <Text className="text-sm font-semibold text-white" numberOfLines={1}>
          Revenue Growing
        </Text>

      </View>

    </View>

    <View className="px-3.5 py-2 rounded-full shrink-0 bg-green-500/20">

      <Text className="text-sm font-bold text-green-300">
        +12.5%
      </Text>

    </View>

  </View>

</View>







{/* ===================== BUSINESS OVERVIEW ===================== */}

<View className={SECTION_GAP}>

  <SectionHeader
    title="Business Overview"
    subtitle="Live insights across your CRM"
    badge={
      <View className="flex-row items-center px-3 py-2 rounded-full bg-emerald-50">

        <View className="w-2 h-2 mr-2 rounded-full bg-emerald-500" />

        <Text className="text-xs font-bold tracking-wide text-emerald-600">
          LIVE
        </Text>

      </View>
    }
  />

  {/* Responsive 2-column grid — one uniform gap, reflows on any width */}

  <View className="flex-row flex-wrap" style={{ gap: 12 }}>

    {[
      {
        label: 'Clients',
        value: data?.clients ?? 0,
        icon: 'users' as const,
        tint: 'bg-indigo-100',
        iconColor: '#4F46E5',
        onPress: () => router.push('/clients'),
      },
      {
        label: 'Products',
        value: data?.products ?? 0,
        icon: 'box' as const,
        tint: 'bg-sky-100',
        iconColor: '#0EA5E9',
        onPress: () => router.push('/products'),
      },
      {
        label: 'Inventory',
        value: data?.inventory ?? 0,
        icon: 'layers' as const,
        tint: 'bg-amber-100',
        iconColor: '#D97706',
        onPress: () => router.push('/inventory'),
      },
      {
        label: 'Invoices',
        value: data?.invoices ?? 0,
        icon: 'file-text' as const,
        tint: 'bg-purple-100',
        iconColor: '#9333EA',
        onPress: () => router.push('/invoices'),
      },
      {
        label: 'Opportunities',
        value: data?.opportunities ?? 0,
        icon: 'briefcase' as const,
        tint: 'bg-emerald-100',
        iconColor: '#16A34A',
        onPress: () => router.push('/opportunities'),
      },
      {
        label: 'Revenue',
        value: formatCurrency(data?.revenue ?? 0),
        icon: 'trending-up' as const,
        tint: 'bg-rose-100',
        iconColor: '#DC2626',
      },
    ].map((stat) => (

      <View
        key={stat.label}
        style={{ flexBasis: '47%', flexGrow: 1 }}
      >

        <StatCard
          label={stat.label}
          value={stat.value}
          icon={stat.icon}
          tint={stat.tint}
          iconColor={stat.iconColor}
          loading={loading}
          onPress={stat.onPress}
        />

      </View>

    ))}

  </View>

</View>





{/* ===================== QUICK ACTIONS ===================== */}

<View className={SECTION_GAP}>

  <SectionHeader
    title="Quick Actions"
    subtitle="Access your most-used CRM tools instantly"
  />

  {/* Actions Container — responsive 2-column grid, equal cell widths */}

  <View className="p-4 bg-white border shadow-sm rounded-3xl border-slate-100">

    <View className="flex-row flex-wrap" style={{ gap: 12 }}>

      {QUICK_ACTIONS.map((item) => (

        <View
          key={item.label}
          style={{ flexBasis: '47%', flexGrow: 1 }}
        >

          <QuickAction {...item} />

        </View>

      ))}

    </View>

  </View>

</View>






{/* ===================== RECENT ACTIVITIES ===================== */}

<View className={SECTION_GAP}>

  <SectionHeader
    title="Recent Activities"
    subtitle="Track the latest CRM updates in real time"
    actionLabel="View All"
    onAction={() => router.push('/activities')}
  />

  {/* Activity Card */}

  <View className="overflow-hidden bg-white border shadow-sm rounded-3xl border-slate-100">

    {/* Live Status */}

    <View className="flex-row items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">

      <View className="flex-row items-center flex-1 min-w-0 pr-3">

        <View className="w-2.5 h-2.5 mr-2 rounded-full shrink-0 bg-emerald-500" />

        <Text className="text-sm font-semibold text-slate-700" numberOfLines={1}>
          Live Activity Feed
        </Text>

      </View>

      <Text className="text-xs shrink-0 text-slate-400">
        Updated just now
      </Text>

    </View>

    {/* Content */}

    {loading ? (

      /* Skeleton rows mirror the real row layout so nothing shifts on load */
      <View className="py-1">

        {[0, 1, 2].map((row) => (

          <View
            key={row}
            className="flex-row items-center px-5 py-3.5"
          >

            <View className="w-10 h-10 rounded-full shrink-0 bg-slate-100" />

            <View className="flex-1 ml-3">
              <View className="w-2/5 h-3 rounded-full bg-slate-100" />
              <View className="w-3/5 h-2.5 mt-2 rounded-full bg-slate-100" />
            </View>

            <View className="w-10 ml-3 h-2.5 rounded-full shrink-0 bg-slate-100" />

          </View>

        ))}

      </View>

    ) : data?.activities?.length ? (

      data.activities.map((activity, index) => (

        <View
          key={activity._id}
          className={
            index !== data.activities.length - 1
              ? "border-b border-slate-100"
              : ""
          }
        >
          <ActivityRow activity={activity} />
        </View>

      ))

    ) : (

      <View className="items-center px-8 py-14">

        <View className="items-center justify-center w-16 h-16 rounded-2xl bg-slate-100">

          <Feather
            name="activity"
            size={26}
            color="#94A3B8"
          />

        </View>

        <Text className="mt-4 text-base font-semibold text-slate-800">
          No Recent Activities
        </Text>

        <Text className="mt-1.5 text-sm leading-5 text-center text-slate-400">
          New CRM updates and user actions will appear here.
        </Text>

      </View>

    )}

  </View>

</View>

{/* ===================== UPCOMING FOLLOW-UPS ===================== */}

<View className={SECTION_GAP}>

  <SectionHeader
    title="Upcoming Follow-ups"
    subtitle="Stay on top of your scheduled customer interactions"
    actionLabel="View All"
    onAction={() => router.push('/tasks')}
  />

  {/* Card */}

  <View className="overflow-hidden bg-white border shadow-sm rounded-3xl border-slate-100">

    {/* Example Row */}

    <View className="flex-row items-center px-5 py-4 border-b border-slate-100">

      <View className="items-center justify-center w-12 h-12 bg-indigo-100 shrink-0 rounded-2xl">

        <Feather
          name="phone-call"
          size={22}
          color="#4F46E5"
        />

      </View>

      <View className="flex-1 min-w-0 ml-3">

        <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
          Call John Anderson
        </Text>

        <Text className="mt-0.5 text-xs text-slate-500" numberOfLines={1}>
          Discuss quotation approval
        </Text>

      </View>

      <View className="items-end ml-3 shrink-0">

        <Text className="text-xs font-semibold text-indigo-600">
          Today
        </Text>

        <Text className="mt-0.5 text-[11px] text-slate-400">
          2:30 PM
        </Text>

      </View>

    </View>

    {/* Row 2 */}

    <View className="flex-row items-center px-5 py-4">

      <View className="items-center justify-center w-12 h-12 shrink-0 rounded-2xl bg-emerald-100">

        <Feather
          name="mail"
          size={22}
          color="#16A34A"
        />

      </View>

      <View className="flex-1 min-w-0 ml-3">

        <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
          Send Proposal
        </Text>

        <Text className="mt-0.5 text-xs text-slate-500" numberOfLines={1}>
          ReadyTech ERP Package
        </Text>

      </View>

      <View className="items-end ml-3 shrink-0">

        <Text className="text-xs font-semibold text-emerald-600">
          Tomorrow
        </Text>

        <Text className="mt-0.5 text-[11px] text-slate-400">
          10:00 AM
        </Text>

      </View>

    </View>

  </View>

</View>

{/* ===================== AI BUSINESS INSIGHTS ===================== */}

<View className={SECTION_GAP}>

  <SectionHeader
    title="AI Business Insights"
    subtitle="Smart recommendations powered by ReadyTech AI"
    badge={
      <View className="px-3 py-2 rounded-full bg-violet-100">

        <Text className="text-xs font-bold text-violet-700">
          AI
        </Text>

      </View>
    }
  />

  {/* AI Card */}

  <View className="p-5 overflow-hidden bg-white border shadow-sm rounded-3xl border-slate-100">

    <View className="absolute rounded-full -top-10 -right-10 w-28 h-28 bg-violet-50" />

    {/* AI Header */}

    <View className="flex-row items-center">

      <View className="items-center justify-center w-12 h-12 shrink-0 rounded-2xl bg-violet-100">

        <Feather
          name="cpu"
          size={22}
          color="#7C3AED"
        />

      </View>

      <View className="flex-1 min-w-0 ml-3">

        <Text className="text-base font-bold text-slate-900" numberOfLines={1}>
          ReadyTech AI Assistant
        </Text>

        <Text className="text-xs text-slate-500" numberOfLines={1}>
          Business health summary
        </Text>

      </View>

    </View>

    {/* Insights — dots align to the first text line, not the block centre */}

    <View className="mt-5" style={{ gap: 12 }}>

      <View className="flex-row items-start">

        <View className="w-2 h-2 mt-1.5 mr-3 bg-green-500 rounded-full shrink-0" />

        <Text className="flex-1 text-sm leading-5 text-slate-700">
          Revenue increased by <Text className="font-bold">18%</Text> this month.
        </Text>

      </View>

      <View className="flex-row items-start">

        <View className="w-2 h-2 mt-1.5 mr-3 bg-orange-500 rounded-full shrink-0" />

        <Text className="flex-1 text-sm leading-5 text-slate-700">
          <Text className="font-bold">5 invoices</Text> are awaiting payment.
        </Text>

      </View>

      <View className="flex-row items-start">

        <View className="w-2 h-2 mt-1.5 mr-3 bg-blue-500 rounded-full shrink-0" />

        <Text className="flex-1 text-sm leading-5 text-slate-700">
          <Text className="font-bold">3 opportunities</Text> have high conversion potential.
        </Text>

      </View>

      {/* Low stock alert */}
      <View className="flex-row items-start">

        <View className="w-2 h-2 mt-1.5 mr-3 bg-red-500 rounded-full shrink-0" />

        <Text className="flex-1 text-sm leading-5 text-slate-700">
          Inventory is low for <Text className="font-bold">2 products</Text>.
        </Text>

      </View>

    </View>

    {/* Button */}

    <Pressable className="flex-row items-center justify-center py-3.5 mt-6 bg-indigo-600 rounded-2xl active:opacity-80">

      <Feather
        name="zap"
        size={18}
        color="white"
      />

      <Text className="ml-2 text-sm font-semibold text-white">
        Generate AI Report
      </Text>

    </Pressable>

  </View>

</View>



</ScrollView>


</SafeAreaView>


);

}