import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { 
  Database, 
  User, 
  Stall, 
  Collector, 
  Payment, 
  Receipt, 
  Notification, 
  AuditLog 
} from './src/db/database';

const app = express();
const PORT = 3000;

// Enable JSON parse body
app.use(express.json());

// Token Sign/Verify helper (using standard crypto nodes to avoid node-gyp issues)
const JWT_SECRET = process.env.JWT_SECRET || 'marketpay-super-secret-key-2026';

function signToken(payload: any): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const sHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const sPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${sHeader}.${sPayload}`)
    .digest('base64url');
  return `${sHeader}.${sPayload}.${signature}`;
}

function verifyToken(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [sHeader, sPayload, signature] = parts;
    const expected = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${sHeader}.${sPayload}`)
      .digest('base64url');
    if (signature !== expected) return null;
    return JSON.parse(Buffer.from(sPayload, 'base64url').toString('utf8'));
  } catch (err) {
    return null;
  }
}

// Authentication Middlewares
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Access token required' });
  
  const decoded = verifyToken(token);
  if (!decoded) return res.status(403).json({ error: 'Invalid or expired token' });
  
  req.user = decoded;
  next();
}

function requireRole(roles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permission denied for this operation' });
    }
    next();
  };
}

// Ensure database is initialized
Database.getState();

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

// Login Route
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Please enter registered email and password' });
  }

  const user = Database.getUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credential. User does not exist.' });
  }

  if (user.status === 'inactive') {
    return res.status(403).json({ error: 'Your account is deactivated. Contact Administrator.' });
  }

  // Simplified password verify (password matching hash directly or startsWith for demo)
  const isMatch = user.password_hash === password;
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid email or password combination' });
  }

  // Add search check for role binding (e.g. employee number)
  let employeeNumber = '';
  let assignedZone = '';
  if (user.role === 'collector') {
    const coll = Database.getCollectorByUserId(user.id);
    if (coll) {
      employeeNumber = coll.employee_number;
      assignedZone = coll.assigned_zone;
    }
  }

  // Sign Payload
  const token = signToken({
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    employeeNumber,
    assignedZone
  });

  // Track AuditLog
  Database.addAuditLog({
    id: `log-${Date.now()}`,
    user_id: user.id,
    user_name: user.full_name,
    role: user.role,
    action: 'Logged in successfully',
    timestamp: new Date().toISOString()
  });

  return res.json({
    token,
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      employeeNumber,
      assignedZone
    }
  });
});

// Profile update route
app.post('/api/profile/update', authenticateToken, (req: any, res) => {
  const { full_name, email, phone, password } = req.body;
  const userId = req.user.id;

  const user = Database.getUserById(userId);
  if (!user) return res.status(404).json({ error: 'User profile not found' });

  // Update check
  if (full_name) user.full_name = full_name;
  if (phone) user.phone = phone;
  if (password && password.trim().length > 0) user.password_hash = password;

  if (email && email.toLowerCase() !== user.email.toLowerCase()) {
    const existing = Database.getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'Email address already in use by another account' });
    }
    user.email = email;
  }

  Database.updateUser(userId, user);

  Database.addAuditLog({
    id: `log-${Date.now()}`,
    user_id: user.id,
    user_name: user.full_name,
    role: user.role,
    action: 'Updated profile details',
    timestamp: new Date().toISOString()
  });

  return res.json({
    message: 'Profile updated successfully',
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role
    }
  });
});

// Get profile from token
app.get('/api/auth/me', authenticateToken, (req: any, res) => {
  const user = Database.getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User does not exist' });

  let employeeNumber = '';
  let assignedZone = '';
  if (user.role === 'collector') {
    const coll = Database.getCollectorByUserId(user.id);
    if (coll) {
      employeeNumber = coll.employee_number;
      assignedZone = coll.assigned_zone;
    }
  }

  return res.json({
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      employeeNumber,
      assignedZone
    }
  });
});

// ==========================================
// ADMIN: STALL MANAGEMENT & USERS
// ==========================================

// Get all stalls
app.get('/api/stalls', authenticateToken, (req, res) => {
  const stalls = Database.getStalls();
  const users = Database.getUsers();

  // Map owners names
  const enrichedStalls = stalls.map(s => {
    const owner = users.find(u => u.id === s.owner_id);
    return {
      ...s,
      owner_name: owner ? owner.full_name : 'No Owner',
      owner_phone: owner ? owner.phone : '',
      owner_email: owner ? owner.email : ''
    };
  });

  return res.json(enrichedStalls);
});

// Add new stall
app.post('/api/stalls', authenticateToken, requireRole(['admin']), (req: any, res) => {
  const { stall_number, stall_type, location, owner_name, owner_email, owner_phone, monthly_fee, daily_fee } = req.body;
  
  if (!stall_number || !stall_type || !location || !owner_name || !owner_email) {
    return res.status(400).json({ error: 'Stall number, type, location, owner email, and owner name are required' });
  }

  const existingStall = Database.getStallByNumber(stall_number);
  if (existingStall) {
    return res.status(400).json({ error: `Stall number ${stall_number} already exists` });
  }

  // Create or retrieve Owner User
  let owner = Database.getUserByEmail(owner_email);
  if (!owner) {
    // Generate new owner account
    const ownerId = `u-owner-${Date.now()}`;
    owner = {
      id: ownerId,
      full_name: owner_name,
      email: owner_email,
      phone: owner_phone || '',
      password_hash: `owner123`, // default
      role: 'owner',
      status: 'active',
      created_at: new Date().toISOString()
    };
    Database.addUser(owner);
  }

  const stallId = `s-${Date.now()}`;
  const permitNum = `BP-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  const newStall: Stall = {
    id: stallId,
    business_permit_number: permitNum,
    stall_number,
    stall_type,
    owner_id: owner.id,
    location,
    monthly_fee: Number(monthly_fee) || 4000,
    daily_fee: Number(daily_fee) || 120,
    status: 'occupied'
  };

  Database.addStall(newStall);

  Database.addAuditLog({
    id: `log-${Date.now()}`,
    user_id: req.user.id,
    user_name: req.user.full_name,
    role: req.user.role,
    action: `Provisioned Stall ${stall_number} for owner ${owner_name}`,
    timestamp: new Date().toISOString()
  });

  return res.json({ message: 'Stall added successfully', stall: newStall });
});

// Update Stall
app.put('/api/stalls/:id', authenticateToken, requireRole(['admin']), (req: any, res) => {
  const { id } = req.params;
  const { stall_type, location, status, monthly_fee, daily_fee, business_permit_number } = req.body;

  const stall = Database.getStallById(id);
  if (!stall) return res.status(404).json({ error: 'Stall not found' });

  const updates: Partial<Stall> = {};
  if (stall_type) updates.stall_type = stall_type;
  if (location) updates.location = location;
  if (status) updates.status = status;
  if (business_permit_number) updates.business_permit_number = business_permit_number;
  if (monthly_fee !== undefined) updates.monthly_fee = Number(monthly_fee);
  if (daily_fee !== undefined) updates.daily_fee = Number(daily_fee);

  Database.updateStall(id, updates);

  Database.addAuditLog({
    id: `log-${Date.now()}`,
    user_id: req.user.id,
    user_name: req.user.full_name,
    role: req.user.role,
    action: `Updated Stall information for ${stall.stall_number}`,
    timestamp: new Date().toISOString()
  });

  return res.json({ message: 'Stall details updated successfully', stall: { ...stall, ...updates } });
});

// ==========================================
// ADMIN: COLLECTORS & TRACKING
// ==========================================

// Get all collectors
app.get('/api/collectors', authenticateToken, (req, res) => {
  const collectors = Database.getCollectors();
  const users = Database.getUsers();
  const payments = Database.getPayments();

  const enriched = collectors.map(c => {
    const user = users.find(u => u.id === c.user_id);
    const collectorPayments = payments.filter(p => p.collector_id === c.user_id);
    const totalCollected = collectorPayments.reduce((acc, curr) => acc + curr.amount, 0);

    return {
      ...c,
      full_name: user ? user.full_name : 'Unknown',
      email: user ? user.email : '',
      phone: user ? user.phone : '',
      status: user ? user.status : 'inactive',
      total_transactions: collectorPayments.length,
      total_collected: totalCollected
    };
  });

  return res.json(enriched);
});

// Update Collector Assignment
app.put('/api/collectors/:id', authenticateToken, requireRole(['admin']), (req: any, res) => {
  const { id } = req.params; // collector id
  const { assigned_zone, status } = req.body;

  const collector = Database.getCollectorById(id);
  if (!collector) return res.status(404).json({ error: 'Collector registry entry not found' });

  if (assigned_zone) {
    collector.assigned_zone = assigned_zone;
    Database.updateCollector(id, { assigned_zone });
  }

  if (status) {
    Database.updateUser(collector.user_id, { status });
  }

  const userObj = Database.getUserById(collector.user_id);

  Database.addAuditLog({
    id: `log-${Date.now()}`,
    user_id: req.user.id,
    user_name: req.user.full_name,
    role: req.user.role,
    action: `Modified collector parameters for ${userObj ? userObj.full_name : 'Collector'}`,
    timestamp: new Date().toISOString()
  });

  return res.json({ message: 'Collector updated successfully', collector });
});

// Add new collector
app.post('/api/collectors', authenticateToken, requireRole(['admin']), (req: any, res) => {
  const { full_name, email, phone, password, assigned_zone } = req.body;

  if (!full_name || !email || !password || !assigned_zone) {
    return res.status(400).json({ error: 'Full name, email, password, and assigned zone are required' });
  }

  const existingUser = Database.getUserByEmail(email);
  if (existingUser) {
    return res.status(400).json({ error: 'Email address is already registered' });
  }

  const userId = `u-collector-${Date.now()}`;
  const collectorId = `c-code-${Date.now()}`;
  const empIdx = Database.getCollectors().length + 1;
  const employee_number = `EMP-2026-00${empIdx}`;

  const newUser: User = {
    id: userId,
    full_name,
    email,
    phone: phone || '',
    password_hash: password,
    role: 'collector',
    status: 'active',
    created_at: new Date().toISOString()
  };

  const newCollector: Collector = {
    id: collectorId,
    user_id: userId,
    employee_number,
    assigned_zone
  };

  Database.addUser(newUser);
  Database.addCollector(newCollector);

  Database.addAuditLog({
    id: `log-${Date.now()}`,
    user_id: req.user.id,
    user_name: req.user.full_name,
    role: req.user.role,
    action: `Registered new field collector ${full_name} (${employee_number})`,
    timestamp: new Date().toISOString()
  });

  return res.json({ message: 'Collector registered successfully', collector: newCollector });
});

// ==========================================
// PORTAL & PAYMENTS SYSTEM
// ==========================================

// Get payment logs
app.get('/api/payments', authenticateToken, (req, res) => {
  const payments = Database.getPayments();
  const stalls = Database.getStalls();
  const users = Database.getUsers();

  const enriched = payments.map(p => {
    const stall = stalls.find(s => s.id === p.stall_id);
    const collectorUser = users.find(u => u.id === p.collector_id);
    const ownerUser = stall ? users.find(u => u.id === stall.owner_id) : null;

    return {
      ...p,
      stall_number: stall ? stall.stall_number : 'Unknown ST',
      stall_type: stall ? stall.stall_type : 'Unknown',
      location: stall ? stall.location : 'Unknown',
      owner_name: ownerUser ? ownerUser.full_name : 'Unknown Owner',
      collector_name: collectorUser ? collectorUser.full_name : 'Default Collector'
    };
  });

  return res.json(enriched);
});

// Enter Payment Collection
app.post('/api/payments/create', authenticateToken, requireRole(['admin', 'collector']), (req: any, res) => {
  const { stall_id, amount, payment_type, remarks } = req.body;
  const collectorUserId = req.user.id; // User ID recording

  if (!stall_id || !amount || !payment_type) {
    return res.status(400).json({ error: 'Stall ID, payment amount, and payment type are required' });
  }

  const stall = Database.getStallById(stall_id);
  if (!stall) return res.status(404).json({ error: 'Stall not found' });

  const paySeq = Database.getPayments().length + 1;
  const receipt_number = `OR-2026-${String(50000 + paySeq).padStart(5, '0')}`;
  const paymentId = `pay-${Date.now()}`;
  const paymentDate = new Date().toISOString();

  // Create payment record
  const newPayment: Payment = {
    id: paymentId,
    stall_id,
    collector_id: collectorUserId,
    amount: Number(amount),
    payment_type,
    payment_date: paymentDate,
    receipt_number,
    remarks: remarks || 'Daily rental fee collection'
  };

  Database.addPayment(newPayment);

  // Generate corresponding receipt
  const receiptId = `rcpt-${Date.now()}`;
  const newReceipt: Receipt = {
    id: receiptId,
    payment_id: paymentId,
    receipt_number,
    generated_at: paymentDate,
    qr_code: `VERIFY-ID:${paymentId}|OR:${receipt_number}|STALL:${stall.stall_number}|AMT:${amount}`
  };
  Database.addReceipt(newReceipt);

  // Send Notification to Owner
  const notifyId = `n-${Date.now()}`;
  const notification: Notification = {
    id: notifyId,
    user_id: stall.owner_id,
    title: 'Payment Confirmation Received',
    message: `Your payment of ${Number(amount).toLocaleString('en-US', { style: 'currency', currency: 'PHP' })} for Stall ${stall.stall_number} under Official Receipt ${receipt_number} has been recorded by collector ${req.user.full_name}.`,
    is_read: false,
    created_at: paymentDate
  };
  Database.addNotification(notification);

  // Audit Log
  Database.addAuditLog({
    id: `log-${Date.now()}`,
    user_id: req.user.id,
    user_name: req.user.full_name,
    role: req.user.role,
    action: `Collected payment of Php ${amount} from Stall ${stall.stall_number} (Receipt: ${receipt_number})`,
    timestamp: paymentDate
  });

  return res.json({
    message: 'Payment collection recorded and digital receipt generated',
    payment: newPayment,
    receipt: newReceipt
  });
});

// ==========================================
// NOTIFICATION SYSTEM API
// ==========================================

// Get logs for active user
app.get('/api/notifications', authenticateToken, (req: any, res) => {
  const userId = req.user.id;
  const list = Database.getNotifications()
    .filter(n => n.user_id === userId || n.user_id === 'all')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return res.json(list);
});

// Mark all as read
app.post('/api/notifications/mark-read', authenticateToken, (req: any, res) => {
  Database.markAllNotificationsAsRead(req.user.id);
  return res.json({ success: true, message: 'All notifications marked as read' });
});

// Mark single notification as read
app.post('/api/notifications/mark-read/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  Database.markNotificationAsRead(id);
  return res.json({ success: true, message: 'Notification marked as read' });
});

// Create Global Announcement
app.post('/api/notifications/announce', authenticateToken, requireRole(['admin']), (req: any, res) => {
  const { title, message } = req.body;
  if (!title || !message) {
    return res.status(400).json({ error: 'Announcement title and message are required' });
  }

  const notification: Notification = {
    id: `ann-${Date.now()}`,
    user_id: 'all',
    title,
    message,
    is_read: false,
    created_at: new Date().toISOString()
  };

  Database.addNotification(notification);

  // Audit log
  Database.addAuditLog({
    id: `log-${Date.now()}`,
    user_id: req.user.id,
    user_name: req.user.full_name,
    role: req.user.role,
    action: `Published market announcement: "${title}"`,
    timestamp: new Date().toISOString()
  });

  return res.json({ message: 'Announcement published to all vendors successfully', notification });
});

// ==========================================
// STALL OWNER SPECIFIC ENDPOINTS
// ==========================================

// Get owner dashboard summary
app.get('/api/owners/dashboard', authenticateToken, requireRole(['owner']), (req: any, res) => {
  const userId = req.user.id;
  const stalls = Database.getStalls().filter(s => s.owner_id === userId);
  const payments = Database.getPayments();
  const receipts = Database.getReceipts();
  const allUsers = Database.getUsers();

  // Find all payments related to the owner's stalls
  const stallIds = stalls.map(s => s.id);
  const ownerPayments = payments.filter(p => stallIds.includes(p.stall_id))
    .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());

  // Aggregate stats
  const totalPaid = ownerPayments.reduce((sum, p) => sum + p.amount, 0);
  const lastPayment = ownerPayments[0] || null;

  // Compute mock balance (every occupied stall is billed monthly, let's say. We compute outstanding as sum of daily fees over the billing cycle, minus amount collected)
  // Let's assume daily billing cycle. Active dues = Monthly fees / 30 * days in month (say, 30 days) = Monthly Fee
  // Let's compute outstanding balance: We assume total billings since June 1 is 30 days * daily fee.
  // Balance = cumulative expected daily fees for June (assume 12 days since current time is June 12) minus total payments for June.
  let outstandingBalance = 0;
  const currentDay = 12; // June 12, 2026

  stalls.forEach(st => {
    if (st.status === 'occupied') {
      const expectedPayment = currentDay * st.daily_fee;
      const actualPaid = ownerPayments
        .filter(p => p.stall_id === st.id && new Date(p.payment_date).getMonth() === 5) // June is index 5
        .reduce((sum, p) => sum + p.amount, 0);
      
      const balance = Math.max(0, expectedPayment - actualPaid);
      outstandingBalance += balance;
    }
  });

  const nextDueDate = new Date('2026-06-13T17:00:00Z').toISOString(); // Next day 5 PM

  // Format payment ledger
  const paymentHistory = ownerPayments.map(p => {
    const st = stalls.find(s => s.id === p.stall_id);
    const collector = allUsers.find(u => u.id === p.collector_id);
    return {
      id: p.id,
      date: p.payment_date,
      amount: p.amount,
      receipt_number: p.receipt_number,
      collector_name: collector ? collector.full_name : 'System Direct',
      stall_number: st ? st.stall_number : 'ST-000'
    };
  });

  return res.json({
    stalls: stalls.map(s => ({
      id: s.id,
      stall_number: s.stall_number,
      stall_type: s.stall_type,
      location: s.location,
      daily_fee: s.daily_fee,
      monthly_fee: s.monthly_fee
    })),
    stats: {
      currentBalance: outstandingBalance,
      lastPayment: lastPayment ? lastPayment.amount : 0,
      lastPaymentDate: lastPayment ? lastPayment.payment_date : null,
      totalPaid,
      nextDueDate
    },
    paymentHistory
  });
});

// ==========================================
// REPORTING & ANALYTICS
// ==========================================

// Get dashboard statistics
app.get('/api/analytics/dashboard', authenticateToken, (req, res) => {
  const stalls = Database.getStalls();
  const users = Database.getUsers();
  const payments = Database.getPayments();
  const collectors = Database.getCollectors();

  // Basic Card Metrics
  const totalStallsCount = stalls.length;
  const activeVendorsCount = users.filter(u => u.role === 'owner' && u.status === 'active').length;

  // Collections Today (June 12, 2026)
  const todayStart = new Date('2026-06-12T00:00:00Z').getTime();
  const todayEnd = new Date('2026-06-12T23:59:59Z').getTime();
  const todayPayments = payments.filter(p => {
    const t = new Date(p.payment_date).getTime();
    return t >= todayStart && t <= todayEnd;
  });
  const todayCollection = todayPayments.reduce((sum, p) => sum + p.amount, 0);

  // Collections Monthly (June 2026)
  const juneStart = new Date('2026-06-01T00:00:00Z').getTime();
  const juneEnd = new Date('2026-06-30T23:59:59Z').getTime();
  const monthlyPayments = payments.filter(p => {
    const t = new Date(p.payment_date).getTime();
    return t >= juneStart && t <= juneEnd;
  });
  const monthlyCollection = monthlyPayments.reduce((sum, p) => sum + p.amount, 0);

  // Outstanding Balances Calculation
  // All occupied stalls owe daily fees. Since June 1st to June 12th (12 days)
  let outstandingBalances = 0;
  const billingDays = 12;

  stalls.forEach(st => {
    if (st.status === 'occupied') {
      const expected = billingDays * st.daily_fee;
      const actualPaid = payments
        .filter(p => p.stall_id === st.id && new Date(p.payment_date).getTime() >= juneStart)
        .reduce((sum, p) => sum + p.amount, 0);

      const bal = expected - actualPaid;
      if (bal > 0) outstandingBalances += bal;
    }
  });

  // Chart data 1: Collection Trend (Last 7 Days, ending June 12)
  const collectionTrend: any[] = [];
  for (let i = 6; i >= 0; i--) {
    const targetDate = new Date('2026-06-12T00:00:00Z');
    targetDate.setDate(targetDate.getDate() - i);
    const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'short' });
    const dayStr = targetDate.toISOString().slice(0, 10);

    const dayPayments = payments.filter(p => p.payment_date.startsWith(dayStr));
    const totalCollected = dayPayments.reduce((sum, p) => sum + p.amount, 0);
    const txCount = dayPayments.length;

    collectionTrend.push({
      date: dayStr,
      day: dayName,
      revenue: totalCollected,
      transactions: txCount
    });
  }

  // Chart data 2: Revenue distribution by Stall Type (Monthly Share)
  const stallTypeShareMap = new Map();
  stalls.forEach(st => {
    const type = st.stall_type;
    const paidForType = payments
      .filter(p => p.stall_id === st.id && new Date(p.payment_date).getTime() >= juneStart)
      .reduce((sum, p) => sum + p.amount, 0);
    
    stallTypeShareMap.set(type, (stallTypeShareMap.get(type) || 0) + paidForType);
  });

  const revenueByType = Array.from(stallTypeShareMap.entries()).map(([type, value]) => ({
    name: type,
    value
  }));

  // Chart data 3: Collector Efficiency / Performance (Total payments recorded in June)
  const collectorPerformance = collectors.map(col => {
    const user = users.find(u => u.id === col.user_id);
    const colPayments = payments.filter(p => p.collector_id === col.user_id && new Date(p.payment_date).getTime() >= juneStart);
    const collected = colPayments.reduce((sum, p) => sum + p.amount, 0);

    return {
      name: user ? user.full_name : 'Collector',
      zone: col.assigned_zone,
      collected,
      transactions: colPayments.length
    };
  }).sort((a, b) => b.collected - a.collected);

  // Table lists
  // Recent payments
  const recentPaymentsList = payments
    .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
    .slice(0, 10)
    .map(p => {
      const stall = stalls.find(s => s.id === p.stall_id);
      const collectorUser = users.find(u => u.id === p.collector_id);
      const ownerUser = stall ? users.find(u => u.id === stall.owner_id) : null;
      return {
        id: p.id,
        stall_number: stall ? stall.stall_number : 'ST-000',
        owner_name: ownerUser ? ownerUser.full_name : 'Standard Vendor',
        collector_name: collectorUser ? collectorUser.full_name : 'Field Team',
        amount: p.amount,
        payment_type: p.payment_type,
        payment_date: p.payment_date,
        receipt_number: p.receipt_number
      };
    });

  // Pending Payments (Stalls that are occupied but haven't paid today, June 12)
  const paidTodayStallIds = new Set(
    todayPayments.map(p => p.stall_id)
  );
  
  const pendingPaymentsList = stalls
    .filter(s => s.status === 'occupied' && !paidTodayStallIds.has(s.id))
    .slice(0, 8)
    .map(s => {
      const owner = users.find(u => u.id === s.owner_id);
      return {
        id: s.id,
        stall_number: s.stall_number,
        owner_name: owner ? owner.full_name : 'No Owner',
        location: s.location,
        daily_fee: s.daily_fee,
        due_date: 'Today, 5:00 PM'
      };
    });

  // Top Collector Leaderboard
  const topCollectors = collectorPerformance.slice(0, 3);

  return res.json({
    cards: {
      totalStalls: totalStallsCount,
      activeVendors: activeVendorsCount,
      todayCollection,
      monthlyCollection,
      outstandingBalances
    },
    charts: {
      collectionTrend,
      revenueByType,
      collectorPerformance
    },
    tables: {
      recentPayments: recentPaymentsList,
      pendingPayments: pendingPaymentsList,
      topCollectors
    }
  });
});

// PDF / Excel Reporting Engine (Return highly structured format to render table easily for printing)
app.get('/api/reports/generate', authenticateToken, (req, res) => {
  const { timeframe, collectorId, zone, startDate, endDate } = req.query;
  
  const payments = Database.getPayments();
  const stalls = Database.getStalls();
  const users = Database.getUsers();

  let filtered = [...payments];

  // Apply Date and Time filters
  const now = new Date();
  let startLimit = new Date('2026-01-01T00:00:00Z').getTime();
  let endLimit = now.getTime();

  if (timeframe === 'daily') {
    // Current active day (June 12, 2026)
    startLimit = new Date('2026-06-12T00:00:00Z').getTime();
    endLimit = new Date('2026-06-12T23:59:59Z').getTime();
  } else if (timeframe === 'weekly') {
    // Current active week (June 06 to June 12, 2026)
    startLimit = new Date('2026-06-06T00:00:00Z').getTime();
    endLimit = new Date('2026-06-12T23:59:59Z').getTime();
  } else if (timeframe === 'monthly') {
    // June 2026
    startLimit = new Date('2026-06-01T00:00:00Z').getTime();
    endLimit = new Date('2026-06-30T23:59:59Z').getTime();
  } else if (startDate && endDate) {
    startLimit = new Date(startDate as string).getTime();
    endLimit = new Date(endDate as string).setHours(23, 59, 59, 999);
  }

  filtered = filtered.filter(p => {
    const time = new Date(p.payment_date).getTime();
    return time >= startLimit && time <= endLimit;
  });

  // Filter by Collector
  if (collectorId) {
    filtered = filtered.filter(p => p.collector_id === collectorId);
  }

  // Filter by Zone
  if (zone) {
    filtered = filtered.filter(p => {
      const stall = stalls.find(s => s.id === p.stall_id);
      return stall && stall.location === zone;
    });
  }

  // Map into highly readable report format
  const reportRows = filtered.map((p, idx) => {
    const stall = stalls.find(s => s.id === p.stall_id);
    const collectorUser = users.find(u => u.id === p.collector_id);
    const ownerUser = stall ? users.find(u => u.id === stall.owner_id) : null;

    return {
      index: idx + 1,
      payment_id: p.id,
      date: new Date(p.payment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      receipt_number: p.receipt_number,
      stall_number: stall ? stall.stall_number : 'ST-000',
      owner_name: ownerUser ? ownerUser.full_name : 'Unknown Vendor',
      collector_name: collectorUser ? collectorUser.full_name : 'Assigned Staff',
      amount: p.amount,
      payment_type: p.payment_type.toUpperCase(),
      zone: stall ? stall.location : '-'
    };
  });

  const totalAmount = reportRows.reduce((sum, row) => sum + row.amount, 0);
  const transactionCount = reportRows.length;

  return res.json({
    metadata: {
      timeframe: timeframe || 'custom',
      generatedAt: new Date().toISOString(),
      startDate: new Date(startLimit).toLocaleDateString(),
      endDate: new Date(endLimit).toLocaleDateString(),
      totalAmount,
      transactionCount
    },
    rows: reportRows
  });
});

// ==========================================
// AUDIT LOGS & BACKUP API
// ==========================================

// Audit logs list
app.get('/api/audit-logs', authenticateToken, requireRole(['admin']), (req, res) => {
  return res.json(Database.getAuditLogs());
});

// Export backup
app.get('/api/backup/export', authenticateToken, requireRole(['admin']), (req: any, res) => {
  const data = Database.getState();
  
  // Track backup audit log
  Database.addAuditLog({
    id: `log-${Date.now()}`,
    user_id: req.user.id,
    user_name: req.user.full_name,
    role: req.user.role,
    action: 'Downloaded application database backup file',
    timestamp: new Date().toISOString()
  });

  // Force file download header
  res.setHeader('Content-disposition', 'attachment; filename=marketpay_backup_' + Date.now() + '.json');
  res.setHeader('Content-type', 'application/json');
  return res.send(JSON.stringify(data, null, 2));
});

// Import backup
app.post('/api/backup/import', authenticateToken, requireRole(['admin']), (req: any, res) => {
  const uploadedSchema = req.body;
  if (!uploadedSchema || !uploadedSchema.users || !uploadedSchema.stalls || !uploadedSchema.payments) {
    return res.status(400).json({ error: 'Invalid database backup structure' });
  }

  // Restore state
  const state = Database.getState();
  state.users = uploadedSchema.users;
  state.stalls = uploadedSchema.stalls;
  state.collectors = uploadedSchema.collectors || [];
  state.payments = uploadedSchema.payments;
  state.receipts = uploadedSchema.receipts || [];
  state.notifications = uploadedSchema.notifications || [];
  state.auditLogs = uploadedSchema.auditLogs || [];

  import('fs').then(fs => {
    fs.writeFileSync(
      path.join(process.cwd(), 'src', 'db', 'db_store.json'),
      JSON.stringify(state, null, 2),
      'utf8'
    );
  });

  Database.addAuditLog({
    id: `log-${Date.now()}`,
    user_id: req.user.id,
    user_name: req.user.full_name,
    role: req.user.role,
    action: 'Restored application database from backup',
    timestamp: new Date().toISOString()
  });

  return res.json({ message: 'Database successfully restored from backup' });
});


// ==========================================
// VITE CLIENT INTEGRATION
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Bind to host 0.0.0.0 and port 3000
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MarketPay Collector backend active and listening on http://localhost:${PORT}`);
  });
}

startServer();
