export interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: 'admin' | 'collector' | 'owner';
  status: 'active' | 'inactive';
  employeeNumber?: string;
  assignedZone?: string;
}

export interface Stall {
  id: string;
  business_permit_number: string;
  stall_number: string;
  stall_type: 'Wet Market' | 'Dry Goods' | 'Grocery' | 'Food Stall' | 'Fruit & Veg';
  owner_id: string;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  location: 'Zone A' | 'Zone B' | 'Zone C' | 'Zone D';
  monthly_fee: number;
  daily_fee: number;
  status: 'occupied' | 'vacant' | 'under-maintenance';
}

export interface CollectorEnriched {
  id: string;
  user_id: string;
  employee_number: string;
  assigned_zone: 'Zone A' | 'Zone B' | 'Zone C' | 'Zone D';
  full_name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
  total_transactions: number;
  total_collected: number;
}

export interface PaymentEnriched {
  id: string;
  stall_id: string;
  stall_number: string;
  stall_type: string;
  location: string;
  owner_name: string;
  collector_name: string;
  collector_id: string;
  amount: number;
  payment_type: 'cash' | 'gcash' | 'card';
  payment_date: string;
  receipt_number: string;
  remarks: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  role: string;
  action: string;
  timestamp: string;
}

export interface DashboardStats {
  cards: {
    totalStalls: number;
    activeVendors: number;
    todayCollection: number;
    monthlyCollection: number;
    outstandingBalances: number;
  };
  charts: {
    collectionTrend: Array<{
      date: string;
      day: string;
      revenue: number;
      transactions: number;
    }>;
    revenueByType: Array<{
      name: string;
      value: number;
    }>;
    collectorPerformance: Array<{
      name: string;
      zone: string;
      collected: number;
      transactions: number;
    }>;
  };
  tables: {
    recentPayments: Array<PaymentEnriched>;
    pendingPayments: Array<{
      id: string;
      stall_number: string;
      owner_name: string;
      location: string;
      daily_fee: number;
      due_date: string;
    }>;
    topCollectors: Array<{
      name: string;
      zone: string;
      collected: number;
      transactions: number;
    }>;
  };
}
