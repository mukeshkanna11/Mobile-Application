import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
    onPress: () => router.push('/clients/create'),
  },
  {
    label: 'New Invoice',
    icon: 'file-plus' as const,
    color: '#9333ea',
    onPress: () => router.push('/invoices/create'),
  },
  {
    label: 'Add Product',
    icon: 'package' as const,
    color: '#0ea5e9',
    onPress: () => router.push('/products/create'),
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

  <View className="px-6 pt-8 pb-7">

    {/* Top Row */}
    <View className="flex-row items-center justify-between">

      {/* Company */}
      <View className="flex-row items-center">

        <View className="items-center justify-center w-12 h-12 bg-white/20 rounded-2xl">

          <Feather
            name="briefcase"
            size={24}
            color="white"
          />

        </View>

        <View className="ml-3">

          <Text className="text-white font-semibold text-[18px]">
            ReadyTech Solutions
          </Text>

          <Text className="text-xs text-indigo-100">
            CRM Management Platform
          </Text>

        </View>

      </View>

      {/* Logout */}

      <Pressable
        onPress={handleLogout}
        className="items-center justify-center w-11 h-11 rounded-xl bg-white/20 active:opacity-80"
      >

        <Feather
          name="log-out"
          size={18}
          color="white"
        />

      </Pressable>

    </View>

    {/* Greeting */}

    <View className="mt-7">

      <Text className="text-sm text-indigo-100">
        Welcome Back 👋
      </Text>

      <Text className="mt-1 text-3xl font-bold text-white">

        {user?.name ??
          user?.email ??
          'Administrator'}

      </Text>

      <Text className="mt-2 leading-6 text-indigo-100">

        Manage your business, track leads, monitor sales,
        invoices, clients and team performance from one
        intelligent CRM dashboard.

      </Text>

    </View>

    

  </View>

</View>





{/* ===================== REVENUE CARD ===================== */}

<View className="relative p-6 mt-6 overflow-hidden bg-indigo-600 rounded-[28px]">

  {/* Background Decorations */}
  <View className="absolute rounded-full -top-8 -right-8 w-28 h-28 bg-white/10" />
  <View className="absolute w-24 h-24 rounded-full -bottom-10 -left-6 bg-violet-400/20" />

  {/* Header */}
  <View className="flex-row items-center justify-between">

    <View>

      <Text className="text-xs tracking-wider text-indigo-200 uppercase">
        Revenue Overview
      </Text>

      <Text className="mt-1 text-lg font-bold text-white">
        Collected Revenue
      </Text>

    </View>

    <View className="items-center justify-center w-12 h-12 rounded-2xl bg-white/15">

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
      className="mt-6"
      color="white"
    />

  ) : (

    <Text className="mt-6 text-4xl font-black text-white">
      {formatCurrency(data?.revenue ?? 0)}
    </Text>

  )}

  <Text className="mt-2 text-indigo-100">
    Across{" "}
    <Text className="font-bold text-white">
      {data?.invoices ?? 0}
    </Text>{" "}
    invoices
  </Text>

  {/* Bottom Section */}

  <View className="flex-row items-center justify-between pt-5 mt-6 border-t border-white/15">

    <View>

      <Text className="text-xs text-indigo-200">
        Status
      </Text>

      <View className="flex-row items-center mt-1">

        <View className="w-2 h-2 mr-2 bg-green-400 rounded-full" />

        <Text className="font-semibold text-white">
          Revenue Growing
        </Text>

      </View>

    </View>

    <View className="px-4 py-2 rounded-full bg-green-500/20">

      <Text className="font-bold text-green-300">
        +12.5%
      </Text>

    </View>

  </View>

</View>







{/* ===================== BUSINESS OVERVIEW ===================== */}

<View className="mt-8">

  {/* Header */}

  <View className="flex-row items-center justify-between mb-5">

    <View>

      <Text className="text-2xl font-bold text-slate-900">
        Business Overview
      </Text>

      <Text className="mt-1 text-sm text-slate-500">
        Live insights across your CRM
      </Text>

    </View>

    <View className="flex-row items-center px-3 py-2 rounded-full bg-emerald-50">

      <View className="w-2 h-2 mr-2 rounded-full bg-emerald-500" />

      <Text className="text-xs font-bold tracking-wide text-emerald-600">
        LIVE
      </Text>

    </View>

  </View>

  {/* ================= Row 1 ================= */}

  <View className="flex-row">

    <View className="flex-1">

      <StatCard
        label="Clients"
        value={data?.clients ?? 0}
        icon="users"
        tint="bg-indigo-100"
        iconColor="#4F46E5"
        loading={loading}
        onPress={() => router.push('/clients')}
      />

    </View>

    <View className="flex-1 ml-4">

      <StatCard
        label="Products"
        value={data?.products ?? 0}
        icon="box"
        tint="bg-sky-100"
        iconColor="#0EA5E9"
        loading={loading}
        onPress={() => router.push('/products')}
      />

    </View>

  </View>

  {/* ================= Row 2 ================= */}

  <View className="flex-row mt-4">

    <View className="flex-1">

      <StatCard
        label="Inventory"
        value={data?.inventory ?? 0}
        icon="layers"
        tint="bg-amber-100"
        iconColor="#D97706"
        loading={loading}
        onPress={() => router.push('/inventory')}
      />

    </View>

    <View className="flex-1 ml-4">

      <StatCard
        label="Invoices"
        value={data?.invoices ?? 0}
        icon="file-text"
        tint="bg-purple-100"
        iconColor="#9333EA"
        loading={loading}
        onPress={() => router.push('/invoices')}
      />

    </View>

  </View>

  {/* ================= Row 3 ================= */}

  <View className="flex-row mt-4">

    <View className="flex-1">

      <StatCard
        label="Opportunities"
        value={data?.opportunities ?? 0}
        icon="briefcase"
        tint="bg-emerald-100"
        iconColor="#16A34A"
        loading={loading}
        onPress={() => router.push('/opportunities')}
      />

    </View>

    <View className="flex-1 ml-4">

      <StatCard
        label="Revenue"
        value={formatCurrency(data?.revenue ?? 0)}
        icon="trending-up"
        tint="bg-rose-100"
        iconColor="#DC2626"
        loading={loading}
      />

    </View>

  </View>

</View>





{/* ===================== QUICK ACTIONS ===================== */}

<View className="mt-8">

  {/* Header */}

  <View className="flex-row items-center justify-between mb-4">

    <View>

      <Text className="text-2xl font-bold text-slate-900">
        Quick Actions
      </Text>

      <Text className="mt-1 text-sm text-slate-500">
        Access your most-used CRM tools instantly
      </Text>

    </View>

    <Pressable className="px-4 py-2 rounded-full bg-indigo-50 active:opacity-80">

      <View className="flex-row items-center">

        <Text className="mr-1 text-sm font-semibold text-indigo-600">
          View All
        </Text>

        <Feather
          name="arrow-right"
          size={16}
          color="#4F46E5"
        />

      </View>

    </Pressable>

  </View>

  {/* Actions Container */}

  <View className="p-4 bg-white border shadow-sm rounded-3xl border-slate-100">

    <View className="flex-row">

      {QUICK_ACTIONS.map((item, index) => (

        <View
          key={item.label}
          className={index !== QUICK_ACTIONS.length - 1 ? "flex-1 mr-3" : "flex-1"}
        >

          <QuickAction {...item} />

        </View>

      ))}

    </View>

  </View>

</View>






{/* ===================== RECENT ACTIVITIES ===================== */}

<View className="mt-8">

  {/* Header */}

  <View className="flex-row items-center justify-between mb-4">

    <View>

      <Text className="text-2xl font-bold text-slate-900">
        Recent Activities
      </Text>

      <Text className="mt-1 text-sm text-slate-500">
        Track the latest CRM updates in real time
      </Text>

    </View>

    <Pressable
      onPress={() => router.push('/activities')}
      className="px-4 py-2 rounded-full bg-indigo-50 active:opacity-80"
    >

      <View className="flex-row items-center">

        <Text className="mr-1 text-sm font-semibold text-indigo-600">
          View All
        </Text>

        <Feather
          name="arrow-right"
          size={16}
          color="#4F46E5"
        />

      </View>

    </Pressable>

  </View>

  {/* Activity Card */}

  <View className="overflow-hidden bg-white border shadow-sm rounded-3xl border-slate-100">

    {/* Live Status */}

    <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">

      <View className="flex-row items-center">

        <View className="w-2.5 h-2.5 mr-2 bg-emerald-500 rounded-full" />

        <Text className="font-semibold text-slate-700">
          Live Activity Feed
        </Text>

      </View>

      <Text className="text-xs text-slate-400">
        Updated just now
      </Text>

    </View>

    {/* Content */}

    {loading ? (

      <View className="py-12">

        <ActivityIndicator
          color="#4F46E5"
          size="large"
        />

        <Text className="mt-4 text-sm text-center text-slate-400">
          Loading activities...
        </Text>

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

      <View className="items-center py-12">

        <View className="items-center justify-center w-16 h-16 mb-4 rounded-full bg-slate-100">

          <Feather
            name="activity"
            size={28}
            color="#94A3B8"
          />

        </View>

        <Text className="text-lg font-semibold text-slate-700">
          No Recent Activities
        </Text>

        <Text className="mt-2 text-sm text-center text-slate-400">
          New CRM updates and user actions will appear here.
        </Text>

      </View>

    )}

  </View>

</View>

{/* ===================== UPCOMING FOLLOW-UPS ===================== */}

<View className="mt-8">

  {/* Header */}

  <View className="flex-row items-center justify-between mb-4">

    <View>

      <Text className="text-2xl font-bold text-slate-900">
        Upcoming Follow-ups
      </Text>

      <Text className="mt-1 text-sm text-slate-500">
        Stay on top of your scheduled customer interactions
      </Text>

    </View>

    <Pressable
      onPress={() => router.push('/tasks')}
      className="px-4 py-2 rounded-full bg-indigo-50"
    >
      <View className="flex-row items-center">

        <Text className="mr-1 text-sm font-semibold text-indigo-600">
          View All
        </Text>

        <Feather
          name="arrow-right"
          size={16}
          color="#4F46E5"
        />

      </View>

    </Pressable>

  </View>

  {/* Card */}

  <View className="overflow-hidden bg-white border shadow-sm rounded-3xl border-slate-100">

    {/* Example Row */}

    <View className="flex-row items-center px-5 py-5 border-b border-slate-100">

      <View className="items-center justify-center w-12 h-12 bg-indigo-100 rounded-2xl">

        <Feather
          name="phone-call"
          size={22}
          color="#4F46E5"
        />

      </View>

      <View className="flex-1 ml-4">

        <Text className="font-bold text-slate-900">
          Call John Anderson
        </Text>

        <Text className="mt-1 text-sm text-slate-500">
          Discuss quotation approval
        </Text>

      </View>

      <View>

        <Text className="font-semibold text-indigo-600">
          Today
        </Text>

        <Text className="text-xs text-slate-400">
          2:30 PM
        </Text>

      </View>

    </View>

    {/* Row 2 */}

    <View className="flex-row items-center px-5 py-5">

      <View className="items-center justify-center w-12 h-12 rounded-2xl bg-emerald-100">

        <Feather
          name="mail"
          size={22}
          color="#16A34A"
        />

      </View>

      <View className="flex-1 ml-4">

        <Text className="font-bold text-slate-900">
          Send Proposal
        </Text>

        <Text className="mt-1 text-sm text-slate-500">
          ReadyTech ERP Package
        </Text>

      </View>

      <View>

        <Text className="font-semibold text-emerald-600">
          Tomorrow
        </Text>

        <Text className="text-xs text-slate-400">
          10:00 AM
        </Text>

      </View>

    </View>

  </View>

</View>

{/* ===================== AI BUSINESS INSIGHTS ===================== */}

<View className="mt-8">

  {/* Header */}

  <View className="flex-row items-center justify-between mb-4">

    <View>

      <Text className="text-2xl font-bold text-slate-900">
        AI Business Insights
      </Text>

      <Text className="mt-1 text-sm text-slate-500">
        Smart recommendations powered by ReadyTech AI
      </Text>

    </View>

    <View className="px-4 py-2 rounded-full bg-violet-100">

      <Text className="text-xs font-bold text-violet-700">
        AI
      </Text>

    </View>

  </View>

  {/* AI Card */}

  <View className="p-6 overflow-hidden bg-white border shadow-sm rounded-3xl border-slate-100">

    <View className="absolute rounded-full -top-10 -right-10 w-28 h-28 bg-violet-50" />

    {/* AI Header */}

    <View className="flex-row items-center">

      <View className="items-center justify-center w-14 h-14 rounded-2xl bg-violet-100">

        <Feather
          name="cpu"
          size={24}
          color="#7C3AED"
        />

      </View>

      <View className="ml-4">

        <Text className="text-lg font-bold text-slate-900">
          ReadyTech AI Assistant
        </Text>

        <Text className="text-sm text-slate-500">
          Business health summary
        </Text>

      </View>

    </View>

    {/* Insights */}

    <View className="mt-6">

      <View className="flex-row items-center mb-4">

        <View className="w-2 h-2 mr-3 bg-green-500 rounded-full" />

        <Text className="flex-1 text-slate-700">
          Revenue increased by <Text className="font-bold">18%</Text> this month.
        </Text>

      </View>

      <View className="flex-row items-center mb-4">

        <View className="w-2 h-2 mr-3 bg-orange-500 rounded-full" />

        <Text className="flex-1 text-slate-700">
          <Text className="font-bold">5 invoices</Text> are awaiting payment.
        </Text>

      </View>

      <View className="flex-row items-center mb-4">

        <View className="w-2 h-2 mr-3 bg-blue-500 rounded-full" />

        <Text className="flex-1 text-slate-700">
          <Text className="font-bold">3 opportunities</Text> have high conversion potential.
        </Text>

      </View>

      <View className="flex-row items-center">

        <View className="w-2 h-2 mr-3 bg-red-500 rounded-full" />

        <Text className="flex-1 text-slate-700">
          Inventory is low for <Text className="font-bold">2 products</Text>.
        </Text>

      </View>

    </View>

    {/* Button */}

    <Pressable className="flex-row items-center justify-center py-4 mt-8 bg-indigo-600 rounded-2xl">

      <Feather
        name="zap"
        size={18}
        color="white"
      />

      <Text className="ml-2 font-semibold text-white">
        Generate AI Report
      </Text>

    </Pressable>

  </View>

</View>



</ScrollView>


</SafeAreaView>


);

}