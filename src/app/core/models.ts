export type UserRole = 'SUPER_ADMIN' | 'HOTEL_ADMIN' | 'CHEF' | 'CUSTOMER';
export type OrderStatus = 'ORDERED' | 'ACCEPTED' | 'COOKING' | 'READY' | 'SERVED' | 'CANCELLED';
export type SessionStatus = 'OPEN' | 'BILL_GENERATED' | 'PAYMENT_PENDING' | 'PAID' | 'CLOSED';
export type BillStatus = 'UNPAID' | 'PAYMENT_PENDING' | 'PAID';
export type PaymentMethod = 'CASH' | 'UPI';
export type PaymentStatus = 'PENDING' | 'PAID';
export type FoodType = 'VEG' | 'NON_VEG' | 'EGG' | 'VEGAN';
export type HotelSubscriptionStatus = 'PENDING' | 'ACTIVE' | 'EXPIRED';
export type SubscriptionStatus = 'PENDING_APPROVAL' | 'ACTIVE' | 'EXPIRED' | 'REJECTED';
export type ReportType = 'SALES' | 'ITEMS' | 'CATEGORY' | 'TABLE' | 'TAX' | 'TIPS' | 'PAYMENTS';
export type ReportPeriod = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
export type ExportFormat = 'xlsx' | 'pdf';

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface AuthSession {
  accessToken: string;
  expiresIn: number;
  username: string;
  displayName: string;
  role: UserRole;
  hotelId?: number;
}

export interface HotelProfile {
  id: number;
  hotelName: string;
  ownerName: string;
  mobileNumber: string;
  email: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  gstNumber?: string;
  upiId: string;
  logoUrl?: string;
  qrImageUrl?: string;
  subscriptionStatus: HotelSubscriptionStatus;
  enabled: boolean;
}

export interface HotelDetailsUpdate {
  hotelName: string;
  ownerName: string;
  mobileNumber: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  gstNumber: string;
  upiId: string;
}

export interface HotelRegistration extends HotelDetailsUpdate {
  email: string;
  password: string;
}

export interface MenuCategory {
  id: number;
  name: string;
  displayPriority: number;
  enabled: boolean;
  itemCount: number;
}

export interface MenuCategoryRequest {
  name: string;
  displayPriority: number;
  enabled: boolean;
}

export interface MenuItem {
  id: number;
  categoryId: number;
  categoryName?: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  preparationMinutes: number;
  foodType: FoodType;
  available: boolean;
  visible: boolean;
  displayPriority: number;
}

export interface MenuItemRequest {
  categoryId: number;
  name: string;
  description: string;
  price: number;
  preparationMinutes: number;
  foodType: FoodType;
  displayPriority: number;
  available: boolean;
  visible: boolean;
}

export interface DiningTable {
  id: number;
  tableNumber: string;
  tableName?: string;
  capacity: number;
  enabled: boolean;
  qrToken?: string;
  qrUrl?: string;
  occupied: boolean;
  activeSessionToken?: string;
}

export interface TableRequest {
  tableNumber: string;
  tableName: string;
  capacity: number;
  enabled: boolean;
}

export interface OrderLine {
  menuItemId: number;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  specialInstructions?: string;
}

export interface Order {
  id: number;
  orderNumber: string;
  tableNumber?: string;
  sessionToken: string;
  status: OrderStatus;
  notes?: string;
  createdAt: string;
  subtotal: number;
  sgst: number;
  cgst: number;
  grandTotal: number;
  items: OrderLine[];
}

export interface SessionSummary {
  sessionId: number;
  sessionToken: string;
  sessionNumber: string;
  status: SessionStatus;
  tableNumber?: string;
  customerName?: string;
  orderCount: number;
  grandTotal: number;
  openedAt: string;
}

export interface Bill {
  id: number;
  billNumber: string;
  sessionId: number;
  sessionNumber: string;
  tableNumber?: string;
  status: BillStatus;
  subtotal: number;
  sgst: number;
  cgst: number;
  tipAmount: number;
  grandTotal: number;
  generatedAt: string;
  paidAt?: string;
}

export interface PaymentRecord {
  id: number;
  billId: number;
  billNumber: string;
  paymentMethod: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  paidAt?: string;
  createdAt: string;
}

export interface StaffMember {
  id: number;
  displayName: string;
  username: string;
  mobileNumber?: string;
  enabled: boolean;
  lastLoginAt?: string;
}

export interface StaffRequest {
  displayName: string;
  username: string;
  mobileNumber?: string;
  password: string;
}

export interface ReportTable {
  title: string;
  headers: string[];
  rows: unknown[][];
}

export interface DateRange {
  from: string;
  to: string;
  period: ReportPeriod;
}

export interface HotelDashboard {
  todayRevenue: number;
  todayBills: number;
  unsettledBills: number;
  openSessions: number;
  occupiedTables: number;
  activeTables: number;
  ordersInProgress: number;
  pendingPayments: number;
  averageRating?: number;
  menuItems: number;
  chefs: number;
  last7Days: { day: string; total: number }[];
}

export interface PlatformDashboard {
  totalHotels: number;
  enabledHotels: number;
  activeSubscriptions: number;
  pendingApprovals: number;
  expiringWithin30Days: number;
  subscriptionRevenueThisMonth: number;
  tenantRevenueToday: number;
  tenantBillsToday: number;
  totalStaff: number;
}

export interface FeedbackView {
  id: number;
  sessionNumber: string;
  tableNumber?: string;
  rating: number;
  comments?: string;
  createdAt: string;
}

export interface NotificationView {
  id: number;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface Plan {
  id: number;
  planCode: string;
  planName: string;
  price: number;
  durationMonths: number;
}

export interface Subscription {
  id: number;
  hotelId: number;
  hotelName?: string;
  planName?: string;
  amount?: number;
  status: SubscriptionStatus;
  paymentDate?: string;
  paymentReference?: string;
  paymentProofKey?: string;
  startDate?: string;
  endDate?: string;
}

export interface CurrentSubscription {
  hotelStatus: HotelSubscriptionStatus;
  active: boolean;
  remainingDays: number;
  activeSubscription?: Subscription;
  pendingRequest?: Subscription;
  history: Subscription[];
  platformUpiId: string;
}

export interface PlatformSetting {
  key: string;
  description: string;
  value: string;
}

export interface TableMenuItem {
  id: number;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  preparationMinutes: number;
  foodType: FoodType;
  available: boolean;
}

export interface TableMenuCategory {
  id: number;
  name: string;
  items: TableMenuItem[];
}

export interface TableMenu {
  hotelName: string;
  logoUrl?: string;
  ordersAccepting: boolean;
  tableNumber: string;
  tableName?: string;
  categories: TableMenuCategory[];
}

export interface SessionStart {
  sessionToken: string;
  tableNumber: string;
  status: SessionStatus;
}

export interface GuestSession {
  sessionToken: string;
  sessionNumber: string;
  status: SessionStatus;
  tableNumber?: string;
  hotelName: string;
  logoUrl?: string;
  upiId: string;
  qrImageUrl?: string;
  customerName?: string;
  customerMobile?: string;
  orders: Order[];
  subtotal: number;
  sgst: number;
  cgst: number;
  tipAmount: number;
  grandTotal: number;
  billId?: number;
  billStatus?: BillStatus;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  feedbackSubmitted: boolean;
}

export interface RealtimeEvent {
  type: string;
  payload: unknown;
}

export type SupportStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface SupportTicket {
  id: number;
  hotelId: number;
  hotelName: string | null;
  subject: string;
  message: string;
  status: SupportStatus;
  resolution: string | null;
  createdBy: string | null;
  createdDate: string;
  updatedDate: string;
  resolvedDate: string | null;
}

export interface SupportTicketRequest {
  subject: string;
  message: string;
}

export interface SupportStatusUpdate {
  status: SupportStatus;
  resolution?: string;
}

export interface AuditEntry {
  id: number;
  hotelId: number | null;
  hotelName: string | null;
  username: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: string | null;
  createdDate: string;
}

export interface AuditFilter {
  hotelId?: number;
  action?: string;
  from?: string;
  to?: string;
}

export interface MenuQrInfo {
  generated: boolean;
  url: string | null;
}

export interface PublicMenu {
  hotelName: string;
  logoUrl: string | null;
  tableNumbers: string[];
}

export interface MenuQrSession {
  sessionToken: string;
  tableNumber: string;
  status: SessionStatus;
  tableQrToken: string;
}
