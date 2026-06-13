import fs from 'fs';
import path from 'path';

// Types representing the database schema
export interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  password_hash: string; // We'll keep it simple & clear
  role: 'admin' | 'collector' | 'owner';
  status: 'active' | 'inactive';
  created_at: string;
}

export interface Stall {
  id: string;
  business_permit_number: string;
  stall_number: string;
  stall_type: 'Wet Market' | 'Dry Goods' | 'Grocery' | 'Food Stall' | 'Fruit & Veg';
  owner_id: string; // User ID of owner
  location: 'Zone A' | 'Zone B' | 'Zone C' | 'Zone D';
  monthly_fee: number;
  daily_fee: number;
  status: 'occupied' | 'vacant' | 'under-maintenance';
}

export interface Collector {
  id: string;
  user_id: string; // User ID of collector
  employee_number: string;
  assigned_zone: 'Zone A' | 'Zone B' | 'Zone C' | 'Zone D';
}

export interface Payment {
  id: string;
  stall_id: string;
  collector_id: string; // User ID or Collector ID
  amount: number;
  payment_type: 'cash' | 'gcash' | 'card';
  payment_date: string;
  receipt_number: string;
  remarks: string;
}

export interface Receipt {
  id: string;
  payment_id: string;
  receipt_number: string;
  generated_at: string;
  qr_code: string; // Standard verification string / SVG URL
}

export interface Notification {
  id: string;
  user_id: string; // 'all' or user ID
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

export interface DatabaseSchema {
  users: User[];
  stalls: Stall[];
  collectors: Collector[];
  payments: Payment[];
  receipts: Receipt[];
  notifications: Notification[];
  auditLogs: AuditLog[];
}

const DB_FILE = path.join(process.cwd(), 'src', 'db', 'db_store.json');

// Ensure DB directory exists
function ensureDirExists() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Global state holding database in memory
let dbState: DatabaseSchema = {
  users: [],
  stalls: [],
  collectors: [],
  payments: [],
  receipts: [],
  notifications: [],
  auditLogs: []
};

// Generate precise realistic seed data if not present
function generateSeedData(): DatabaseSchema {
  console.log('Generating MarketPay Collector database seed data...');
  const users: User[] = [];
  const stalls: Stall[] = [];
  const collectors: Collector[] = [];
  const payments: Payment[] = [];
  const receipts: Receipt[] = [];
  const notifications: Notification[] = [];
  const auditLogs: AuditLog[] = [];

  // 1. One Administrator
  users.push({
    id: 'u-admin-1',
    full_name: 'Director Maria Clara',
    email: 'admin@marketpay.gov',
    phone: '+63 917 555 0100',
    password_hash: 'admin123', // Simple clean password for demo purposes
    role: 'admin',
    status: 'active',
    created_at: new Date('2026-01-01T08:00:00Z').toISOString()
  });

  // 2. 10 Collectors
  const collectorNames = [
    'Dante Cruz', 'Maria Santos', 'Ronaldo dela Cruz', 'Elena Corpuz',
    'Juan Sebastian', 'Teresa Aquino', 'Antonio Mendoza', 'Patricia Reyes',
    'Miguel Gaviola', 'Sofia Dimagiba'
  ];
  const zones: ('Zone A' | 'Zone B' | 'Zone C' | 'Zone D')[] = ['Zone A', 'Zone B', 'Zone C', 'Zone D'];

  collectorNames.forEach((name, idx) => {
    const userId = `u-collector-${idx + 1}`;
    users.push({
      id: userId,
      full_name: name,
      email: `collector${idx + 1}@marketpay.gov`,
      phone: `+63 918 555 020${idx}`,
      password_hash: `collector${idx + 1}`, // simple password: collector1, collector2 etc
      role: 'collector',
      status: 'active',
      created_at: new Date('2026-01-05T09:00:00Z').toISOString()
    });

    collectors.push({
      id: `c-code-${idx + 1}`,
      user_id: userId,
      employee_number: `EMP-2026-00${idx + 1}`,
      assigned_zone: zones[idx % zones.length]
    });
  });

  // 3. 100 Stall Owners (Users)
  const ownerFirstNames = [
    'Pedro', 'Lito', 'Rosa', 'Arthur', 'Clara', 'Nene', 'Vicente', 'Imelda', 'Jose', 'Connie',
    'Tomas', 'Lorna', 'Manny', 'Gina', 'Renato', 'Ador', 'Esther', 'Efren', 'Sonia', 'Mario',
    'Luz', 'Ramon', 'Fe', 'Andres', 'Norma', 'Benny', 'Celia', 'Gerry', 'Minda', 'Ruben',
    'Evelyn', 'Bobby', 'Chona', 'Doy', 'Liza', 'Boy', 'Amalia', 'Jun', 'Baby', 'Rolly',
    'Cynthia', 'Danilo', 'Helen', 'Freddie', 'Myrna', 'Jerry', 'Vilma', 'Rene', 'Cely', 'Nilo',
    'Sylvia', 'Tony', 'Zeny', 'Edgar', 'Lita', 'Willy', 'Nida', 'Alex', 'Letty', 'Gardo',
    'Nelly', 'Boyet', 'Thelma', 'Rudy', 'Fely', 'Nestor', 'Tessie', 'Jaime', 'Alma', 'Lando',
    'Susan', 'Rey', 'Lulu', 'Eddie', 'Belia', 'Nonoy', 'Chito', 'Dahlia', 'Joey', 'Lydia',
    'Cardo', 'Vicky', 'Danny', 'Grace', 'Isagani', 'Sabel', 'Bernardo', 'Zoraida', 'Leonor', 'Ester',
    'Ramil', 'Mercedes', 'Fidel', 'Precy', 'Cris', 'Elisa', 'Poli', 'Vangie', 'Allan', 'Gemma'
  ];

  const ownerLastNames = [
    'Reyes', 'Mendoza', 'Santos', 'Garcia', 'Cruz', 'Bautista', 'Torres', 'Santiago', 'Ramos', 'Aquino',
    'Castro', 'Dela Cruz', 'Flores', 'Gonzales', 'Hernandez', 'Lopez', 'Perez', 'Villanueva', 'Gutierrez', 'Valenzuela',
    'Salvador', 'Mercado', 'Bernardo', 'Abad', 'David', 'Sarmiento', 'Rivera', 'Del Rosario', 'Soriano', 'Gomez',
    'Castillo', 'Espiritu', 'Pascual', 'Guerrero', 'Manalo', 'Alvarez', 'Domingo', 'Jimenez', 'Santos', 'Roque',
    'Lim', 'Tan', 'Uy', 'Sy', 'Chua', 'Go', 'Co', 'Santos', 'Ang', 'Lee'
  ];

  for (let i = 0; i < 100; i++) {
    const fn = ownerFirstNames[i % ownerFirstNames.length];
    const ln = ownerLastNames[i % ownerLastNames.length];
    const id = `u-owner-${i + 1}`;
    users.push({
      id,
      full_name: `${fn} ${ln}`,
      email: `owner${i + 1}@example.com`,
      phone: `+63 920 123 45${String(i).padStart(2, '0')}`,
      password_hash: `owner${i + 1}`, // simple owner password: owner1, owner2 etc
      role: 'owner',
      status: 'active',
      created_at: new Date('2026-01-10T10:00:00Z').toISOString()
    });
  }

  // 4. 100 Stalls
  const stallTypes: ('Wet Market' | 'Dry Goods' | 'Grocery' | 'Food Stall' | 'Fruit & Veg')[] = [
    'Wet Market', 'Dry Goods', 'Grocery', 'Food Stall', 'Fruit & Veg'
  ];

  for (let i = 0; i < 100; i++) {
    const ownerId = `u-owner-${i + 1}`;
    const typeIdx = i % stallTypes.length;
    const type = stallTypes[typeIdx];
    
    // Assign location zones sequentially to match collector distribution cleanly
    let zone: 'Zone A' | 'Zone B' | 'Zone C' | 'Zone D' = 'Zone A';
    if (i < 25) zone = 'Zone A';
    else if (i < 50) zone = 'Zone B';
    else if (i < 75) zone = 'Zone C';
    else zone = 'Zone D';

    // Fees: Wet market or Grocery are higher, Fruit/Veg or Dry Goods are moderate
    let monthly_fee = 3000;
    let daily_fee = 100;
    if (type === 'Wet Market') {
      monthly_fee = 6000;
      daily_fee = 200;
    } else if (type === 'Grocery') {
      monthly_fee = 7500;
      daily_fee = 250;
    } else if (type === 'Food Stall') {
      monthly_fee = 4500;
      daily_fee = 150;
    } else if (type === 'Dry Goods') {
      monthly_fee = 3600;
      daily_fee = 120;
    }

    stalls.push({
      id: `s-${i + 1}`,
      business_permit_number: `BP-2026-${String(1001 + i).padStart(4, '0')}`,
      stall_number: `ST-${String(i + 1).padStart(3, '0')}`,
      stall_type: type,
      owner_id: ownerId,
      location: zone,
      monthly_fee,
      daily_fee,
      status: i === 99 ? 'under-maintenance' : (i === 98 ? 'vacant' : 'occupied')
    });
  }

  // 5. 500 Payment Records
  // Generate payments historically over the last 30 days
  // We want to generate ~5 payments per stall to reach 500 records
  let payIdCounter = 1;
  const paymentDates: string[] = [];
  const baseDate = new Date('2026-05-10T10:00:00Z');

  // Let's populate the 500 records
  // We'll iterate through days or stalls
  for (let paymentIdx = 0; paymentIdx < 500; paymentIdx++) {
    // Pick a stall
    const stallIndex = paymentIdx % 98; // active occupied stalls (0-97)
    const stall = stalls[stallIndex];
    if (!stall || stall.status !== 'occupied') continue;

    // Pick a date in the past 30 days
    const dayOffset = Math.floor(paymentIdx / 17); // spread over ~30 days
    const date = new Date(baseDate.getTime() + dayOffset * 24 * 60 * 60 * 1000 + (stallIndex * 5 * 60 * 1000));
    const formattedDate = date.toISOString();

    // Find the collectors for this stall's zone
    const zoneCollectors = collectors.filter(c => c.assigned_zone === stall.location);
    // Pick one collector
    const collector = zoneCollectors[paymentIdx % zoneCollectors.length] || collectors[0];

    const amount = stall.daily_fee;
    const payment_type: 'cash' | 'gcash' | 'card' = 
      (paymentIdx % 10 < 7) ? 'cash' : ((paymentIdx % 10 < 9) ? 'gcash' : 'card');

    const receiptNum = `OR-2026-${String(50000 + payIdCounter).padStart(5, '0')}`;
    const paymentId = `pay-${payIdCounter}`;

    payments.push({
      id: paymentId,
      stall_id: stall.id,
      collector_id: collector.user_id, // Collector user id
      amount,
      payment_type,
      payment_date: formattedDate,
      receipt_number: receiptNum,
      remarks: `Daily rental fee collection - ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    });

    // Create receipt
    receipts.push({
      id: `rcpt-${payIdCounter}`,
      payment_id: paymentId,
      receipt_number: receiptNum,
      generated_at: formattedDate,
      qr_code: `VERIFY-ID:${paymentId}|OR:${receiptNum}|STALL:${stall.stall_number}|AMT:${amount}`
    });

    payIdCounter++;
  }

  // 6. Generate Notifications
  notifications.push({
    id: 'n-1',
    user_id: 'all',
    title: 'Disinfection Schedule',
    message: 'The public market will hold its monthly disinfection on June 15, 2026, from 6:00 PM onwards. All stalls must secure their lockups.',
    is_read: false,
    created_at: new Date('2026-06-10T08:00:00Z').toISOString()
  });

  notifications.push({
    id: 'n-2',
    user_id: 'all',
    title: 'Annual Permit Renewal Reminder',
    message: 'A friendly reminder to all vendors to submit updated business permit clearances by end of June 2026 to avoid daily fee surcharges.',
    is_read: false,
    created_at: new Date('2026-06-11T09:30:00Z').toISOString()
  });

  // Adding target notifications for stall owners
  for (let i = 0; i < 20; i++) {
    const ownerId = `u-owner-${i + 1}`;
    notifications.push({
      id: `n-owner-pay-${i}`,
      user_id: ownerId,
      title: 'Payment Confirmed',
      message: 'Your rental payment of Php ' + stalls[i].daily_fee + ' has been successfully recorded on ' + new Date().toLocaleDateString() + '.',
      is_read: i % 3 === 0,
      created_at: new Date().toISOString()
    });
  }

  // 7. Generate Audit Logs
  const auditActions = [
    { u: 'u-admin-1', n: 'Director Maria Clara', r: 'admin', a: 'Exported Monthly Revenue Report to PDF' },
    { u: 'u-collector-1', n: 'Dante Cruz', r: 'collector', a: 'Logged in to Field Portal' },
    { u: 'u-collector-2', n: 'Maria Santos', r: 'collector', a: 'Recorded collection for Stall ST-026' },
    { u: 'u-admin-1', n: 'Director Maria Clara', r: 'admin', a: 'Assigned Collector Ronaldo dela Cruz to Zone B' },
    { u: 'u-collector-3', n: 'Ronaldo dela Cruz', r: 'collector', a: 'Generated Digital Receipt OR-2026-50110' },
    { u: 'u-owner-1', n: 'Pedro Reyes', r: 'owner', a: 'Viewed Payment Ledger History' }
  ];

  auditActions.forEach((act, idx) => {
    auditLogs.push({
      id: `log-${idx + 1}`,
      user_id: act.u,
      user_name: act.n,
      role: act.r,
      action: act.a,
      timestamp: new Date(Date.now() - idx * 3 * 3600 * 1000).toISOString()
    });
  });

  return {
    users,
    stalls,
    collectors,
    payments,
    receipts,
    notifications,
    auditLogs
  };
}

// Save database to disk
export function saveDatabase() {
  try {
    ensureDirExists();
    fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), 'utf8');
    // console.log('Database saved to disk successfully.');
  } catch (err) {
    console.error('Error saving database to disk:', err);
  }
}

// Load database from disk, or seed if missing
export function loadDatabase(): DatabaseSchema {
  try {
    ensureDirExists();
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf8');
      if (content.trim()) {
        dbState = JSON.parse(content);
        // Fallback checks for sanity
        if (!dbState.users || dbState.users.length === 0) {
          dbState = generateSeedData();
          saveDatabase();
        }
        return dbState;
      }
    }
    
    dbState = generateSeedData();
    saveDatabase();
    return dbState;
  } catch (err) {
    console.error('Error loading database:', err);
    dbState = generateSeedData();
    saveDatabase();
    return dbState;
  }
}

// Immediate load
dbState = loadDatabase();

// Data helper functions to query/mutate
export const Database = {
  // Get entire state
  getState: (): DatabaseSchema => dbState,

  // Users CRUD
  getUsers: () => dbState.users,
  getUserById: (id: string) => dbState.users.find(u => u.id === id),
  getUserByEmail: (email: string) => dbState.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim()),
  addUser: (user: User) => {
    dbState.users.push(user);
    saveDatabase();
  },
  updateUser: (id: string, updates: Partial<User>) => {
    dbState.users = dbState.users.map(u => u.id === id ? { ...u, ...updates } : u);
    saveDatabase();
  },

  // Stalls CRUD
  getStalls: () => dbState.stalls,
  getStallById: (id: string) => dbState.stalls.find(s => s.id === id),
  getStallByNumber: (num: string) => dbState.stalls.find(s => s.stall_number.toUpperCase() === num.toUpperCase().trim()),
  getStallByPermit: (permit: string) => dbState.stalls.find(s => s.business_permit_number.toUpperCase() === permit.toUpperCase().trim()),
  updateStall: (id: string, updates: Partial<Stall>) => {
    dbState.stalls = dbState.stalls.map(s => s.id === id ? { ...s, ...updates } : s);
    saveDatabase();
  },
  addStall: (stall: Stall) => {
    dbState.stalls.push(stall);
    saveDatabase();
  },

  // Collectors CRUD
  getCollectors: () => dbState.collectors,
  getCollectorById: (id: string) => dbState.collectors.find(c => c.id === id),
  getCollectorByUserId: (userId: string) => dbState.collectors.find(c => c.user_id === userId),
  addCollector: (collector: Collector) => {
    dbState.collectors.push(collector);
    saveDatabase();
  },
  updateCollector: (id: string, updates: Partial<Collector>) => {
    dbState.collectors = dbState.collectors.map(c => c.id === id ? { ...c, ...updates } : c);
    saveDatabase();
  },

  // Payments CRUD
  getPayments: () => dbState.payments,
  getPaymentById: (id: string) => dbState.payments.find(p => p.id === id),
  addPayment: (payment: Payment) => {
    dbState.payments.push(payment);
    saveDatabase();
  },

  // Receipts CRUD
  getReceipts: () => dbState.receipts,
  getReceiptByPaymentId: (payId: string) => dbState.receipts.find(r => r.payment_id === payId),
  addReceipt: (receipt: Receipt) => {
    dbState.receipts.push(receipt);
    saveDatabase();
  },

  // Notifications CRUD
  getNotifications: () => dbState.notifications,
  addNotification: (notification: Notification) => {
    dbState.notifications.push(notification);
    saveDatabase();
  },
  markNotificationAsRead: (id: string) => {
    dbState.notifications = dbState.notifications.map(n => n.id === id ? { ...n, is_read: true } : n);
    saveDatabase();
  },
  markAllNotificationsAsRead: (userId: string) => {
    dbState.notifications = dbState.notifications.map(n => 
      (n.user_id === userId || n.user_id === 'all') ? { ...n, is_read: true } : n
    );
    saveDatabase();
  },

  // Audit Logs CRUD
  getAuditLogs: () => dbState.auditLogs,
  addAuditLog: (log: AuditLog) => {
    dbState.auditLogs.unshift(log); // newest first
    // Limit to 200 logs
    if (dbState.auditLogs.length > 200) {
      dbState.auditLogs = dbState.auditLogs.slice(0, 200);
    }
    saveDatabase();
  }
};
