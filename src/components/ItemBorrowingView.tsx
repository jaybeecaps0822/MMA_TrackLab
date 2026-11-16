import React, { useState, useMemo } from 'react';
import { Laboratory, LabItem, BorrowRequest, UserProfile, ItemCategory } from '../types';
import { format, isPast, differenceInHours, differenceInDays } from 'date-fns';
import { 
  Package, 
  Search, 
  Plus, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  QrCode, 
  RotateCcw, 
  XCircle, 
  ShieldCheck, 
  Sparkles, 
  Tag, 
  MapPin, 
  User, 
  Layers, 
  SlidersHorizontal,
  ChevronRight,
  ExternalLink,
  Edit2,
  Trash2,
  AlertCircle,
  X
} from 'lucide-react';
import { 
  RequestBorrowModal, 
  ManageItemModal, 
  ReviewBorrowModal, 
  ItemQrCodeModal 
} from './ItemBorrowModal';
import { Timestamp } from 'firebase/firestore';

interface ItemBorrowingViewProps {
  laboratories: Laboratory[];
  items: LabItem[];
  borrowRequests: BorrowRequest[];
  profile: UserProfile | null;
  currentUserId?: string;
  onAddItem: (data: Partial<LabItem>) => Promise<void>;
  onUpdateItem: (itemId: string, data: Partial<LabItem>) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  onRequestBorrow: (data: any) => Promise<void>;
  onApproveRequest: (requestId: string, notes?: string) => Promise<void>;
  onRejectRequest: (requestId: string, reason: string) => Promise<void>;
  onReturnRequest: (requestId: string, condition: 'good' | 'fair' | 'damaged' | 'missing_parts', notes?: string) => Promise<void>;
  onDeleteBorrowRequest?: (requestId: string) => Promise<void>;
  onSeedSampleItems?: () => Promise<void>;
  initialSelectedItemId?: string | null;
}

export const ItemBorrowingView: React.FC<ItemBorrowingViewProps> = ({
  laboratories,
  items,
  borrowRequests,
  profile,
  currentUserId,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onRequestBorrow,
  onApproveRequest,
  onRejectRequest,
  onReturnRequest,
  onDeleteBorrowRequest,
  onSeedSampleItems,
  initialSelectedItemId,
}) => {
  // Navigation sub-tabs: 'catalog' | 'requests' | 'my_loans'
  const [subTab, setSubTab] = useState<'catalog' | 'requests' | 'my_loans'>('catalog');

  // Filtering states
  const [selectedLabId, setSelectedLabId] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [borrowModal, setBorrowModal] = useState<{ isOpen: boolean; item: LabItem | null }>({
    isOpen: false,
    item: null,
  });
  const [itemModal, setItemModal] = useState<{ isOpen: boolean; item: LabItem | null }>({
    isOpen: false,
    item: null,
  });
  const [reviewModal, setReviewModal] = useState<{ isOpen: boolean; request: BorrowRequest | null }>({
    isOpen: false,
    request: null,
  });
  const [qrModal, setQrModal] = useState<{ isOpen: boolean; item: LabItem | null }>({
    isOpen: false,
    item: null,
  });
  const [seeding, setSeeding] = useState(false);

  // In-app Delete & Cancel Confirmation State
  const [deleteItemTarget, setDeleteItemTarget] = useState<LabItem | null>(null);
  const [deleteRequestTarget, setDeleteRequestTarget] = useState<BorrowRequest | null>(null);
  const [cancelRequestTarget, setCancelRequestTarget] = useState<BorrowRequest | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Auto-open borrow modal if initialSelectedItemId is provided via URL
  React.useEffect(() => {
    if (initialSelectedItemId && items.length > 0) {
      const targetItem = items.find(i => i.id === initialSelectedItemId);
      if (targetItem) {
        setBorrowModal({ isOpen: true, item: targetItem });
      }
    }
  }, [initialSelectedItemId, items]);

  const isStaff = profile?.role === 'admin' || profile?.role === 'teacher' || profile?.email === 'jaybeecapoy0822@gmail.com';

  // Derived statistics
  const stats = useMemo(() => {
    const totalItems = items.reduce((acc, i) => acc + (i.totalQuantity || 0), 0);
    const availableItems = items.reduce((acc, i) => acc + (i.availableQuantity || 0), 0);
    const borrowedItems = totalItems - availableItems;
    
    const pendingRequests = borrowRequests.filter(r => r.status === 'pending').length;
    const activeBorrowed = borrowRequests.filter(r => r.status === 'approved').length;
    const overdueRequests = borrowRequests.filter(r => {
      if (r.status !== 'approved') return false;
      return isPast(r.expectedReturnDate.toDate());
    }).length;

    const myActiveLoans = borrowRequests.filter(r => 
      r.borrowerUid === currentUserId && (r.status === 'approved' || r.status === 'pending')
    ).length;

    return {
      totalItems,
      availableItems,
      borrowedItems: Math.max(0, borrowedItems),
      pendingRequests,
      activeBorrowed,
      overdueRequests,
      myActiveLoans,
    };
  }, [items, borrowRequests, currentUserId]);

  // Filtered Catalog Items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (selectedLabId !== 'all' && item.labId !== selectedLabId) return false;
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (selectedStatus === 'available' && item.availableQuantity <= 0) return false;
      if (selectedStatus === 'borrowed' && item.availableQuantity >= item.totalQuantity) return false;
      if (selectedStatus === 'repair' && item.condition !== 'maintenance') return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesTag = item.assetTag?.toLowerCase().includes(query);
        const matchesLoc = item.location?.toLowerCase().includes(query);
        const matchesDesc = item.description?.toLowerCase().includes(query);
        if (!matchesName && !matchesTag && !matchesLoc && !matchesDesc) return false;
      }
      return true;
    });
  }, [items, selectedLabId, selectedCategory, selectedStatus, searchQuery]);

  // Filtered Requests
  const filteredRequests = useMemo(() => {
    return borrowRequests.filter(req => {
      if (selectedLabId !== 'all' && req.labId !== selectedLabId) return false;
      if (selectedStatus === 'pending' && req.status !== 'pending') return false;
      if (selectedStatus === 'approved' && req.status !== 'approved') return false;
      if (selectedStatus === 'returned' && req.status !== 'returned') return false;
      if (selectedStatus === 'overdue') {
        if (req.status !== 'approved' || !isPast(req.expectedReturnDate.toDate())) return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesBorrower = req.borrowerName.toLowerCase().includes(query);
        const matchesItem = req.itemName.toLowerCase().includes(query);
        const matchesTag = req.itemAssetTag?.toLowerCase().includes(query);
        const matchesPurpose = req.purpose.toLowerCase().includes(query);
        if (!matchesBorrower && !matchesItem && !matchesTag && !matchesPurpose) return false;
      }
      return true;
    });
  }, [borrowRequests, selectedLabId, selectedStatus, searchQuery]);

  // User's own loans
  const myRequests = useMemo(() => {
    return borrowRequests.filter(r => r.borrowerUid === currentUserId);
  }, [borrowRequests, currentUserId]);

  const categories: ItemCategory[] = [
    'Electronics & IoT',
    'Computing & Peripherals',
    'Networking',
    'Audio/Visual',
    'Tools & Testers',
    'Cables & Adapters',
    'Other',
  ];

  const handleSeed = async () => {
    if (!onSeedSampleItems) return;
    setSeeding(true);
    try {
      await onSeedSampleItems();
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Headline */}
      <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-200 shadow-xs">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
                  Equipment Borrowing & Permission Tracking
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  Inventory & Loans
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Manage laboratory equipment permissions, track out-on-loan items, and scan asset QR stickers
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {isStaff && (
              <button
                onClick={() => setItemModal({ isOpen: true, item: null })}
                className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item</span>
              </button>
            )}

            <button
              onClick={() => {
                setSubTab('catalog');
                setBorrowModal({ isOpen: true, item: null });
              }}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Package className="w-4 h-4" />
              <span>Borrow Equipment</span>
            </button>

            {items.length === 0 && onSeedSampleItems && isStaff && (
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>{seeding ? 'Seeding Items...' : 'Seed Sample Items'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Real-time KPI Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6 pt-6 border-t border-zinc-100">
          <div className="bg-zinc-50/80 rounded-xl p-3 border border-zinc-200/70">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
              Total Inventory
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-bold font-mono text-zinc-900">{stats.totalItems}</span>
              <span className="text-xs text-zinc-500">units</span>
            </div>
            <span className="text-[11px] text-zinc-400">{items.length} distinct item types</span>
          </div>

          <div className="bg-emerald-50/60 rounded-xl p-3 border border-emerald-200/60">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
              Available to Borrow
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-bold font-mono text-emerald-800">{stats.availableItems}</span>
              <span className="text-xs text-emerald-600">ready</span>
            </div>
            <span className="text-[11px] text-emerald-600">In stock on lab shelves</span>
          </div>

          <div className="bg-blue-50/60 rounded-xl p-3 border border-blue-200/60">
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
              Currently On Loan
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-bold font-mono text-blue-800">{stats.activeBorrowed}</span>
              <span className="text-xs text-blue-600">borrowed</span>
            </div>
            <span className="text-[11px] text-blue-600">Active student & faculty loans</span>
          </div>

          <div className={`rounded-xl p-3 border transition-colors ${
            stats.pendingRequests > 0 
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/30' 
              : 'bg-zinc-50/80 border-zinc-200/70'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                stats.pendingRequests > 0 ? 'text-amber-800 font-extrabold' : 'text-zinc-400'
              }`}>
                Pending Approval
              </span>
              {stats.pendingRequests > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              )}
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className={`text-xl font-bold font-mono ${stats.pendingRequests > 0 ? 'text-amber-800' : 'text-zinc-900'}`}>
                {stats.pendingRequests}
              </span>
              <span className="text-xs text-zinc-500">requests</span>
            </div>
            <span className="text-[11px] text-zinc-500">
              {stats.pendingRequests > 0 ? 'Requires staff action' : 'All requests reviewed'}
            </span>
          </div>

          <div className={`rounded-xl p-3 border col-span-2 sm:col-span-1 ${
            stats.overdueRequests > 0 
              ? 'bg-red-50 border-red-300 ring-2 ring-red-400/30' 
              : 'bg-zinc-50/80 border-zinc-200/70'
          }`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider block ${
              stats.overdueRequests > 0 ? 'text-red-800 font-extrabold' : 'text-zinc-400'
            }`}>
              Overdue Returns
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className={`text-xl font-bold font-mono ${stats.overdueRequests > 0 ? 'text-red-700' : 'text-zinc-900'}`}>
                {stats.overdueRequests}
              </span>
              <span className="text-xs text-zinc-500">past due</span>
            </div>
            <span className="text-[11px] text-zinc-500">
              {stats.overdueRequests > 0 ? 'Alert: Equipment not returned' : 'No overdue equipment'}
            </span>
          </div>
        </div>
      </div>

      {/* Primary Sub-Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab('catalog')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
              subTab === 'catalog'
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Equipment Catalog</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-zinc-200 text-zinc-700 font-mono">
              {items.length}
            </span>
          </button>

          <button
            onClick={() => setSubTab('requests')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
              subTab === 'requests'
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Borrow Permissions & Queue</span>
            {stats.pendingRequests > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-mono font-bold animate-pulse">
                {stats.pendingRequests}
              </span>
            )}
          </button>

          <button
            onClick={() => setSubTab('my_loans')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
              subTab === 'my_loans'
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>My Borrowed Items</span>
            {myRequests.filter(r => r.status === 'approved' || r.status === 'pending').length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-500 text-white font-mono font-bold">
                {myRequests.filter(r => r.status === 'approved' || r.status === 'pending').length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filters & Search Control Bar */}
      <div className="bg-white rounded-xl p-3.5 border border-zinc-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              subTab === 'catalog'
                ? "Search by item name, asset tag (MMA-...), cabinet location..."
                : "Search requests by borrower name, ID number, item name, purpose..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg pl-9 pr-3 py-2 focus:ring-2 focus:ring-zinc-900 focus:outline-none"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Laboratory Selector */}
          <select
            value={selectedLabId}
            onChange={(e) => setSelectedLabId(e.target.value)}
            className="text-xs bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-2 font-medium text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900"
          >
            <option value="all">All Laboratories</option>
            {laboratories.map(lab => (
              <option key={lab.id} value={lab.id}>{lab.name}</option>
            ))}
          </select>

          {/* Category Selector (Catalog only) */}
          {subTab === 'catalog' && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-2 font-medium text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          )}

          {/* Status Selector */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-2 font-medium text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900"
          >
            {subTab === 'catalog' ? (
              <>
                <option value="all">All Availability</option>
                <option value="available">Available in Stock</option>
                <option value="borrowed">Currently Loaned Out</option>
                <option value="repair">Under Repair</option>
              </>
            ) : (
              <>
                <option value="all">All Statuses</option>
                <option value="pending">Pending Approval</option>
                <option value="approved">Active / Borrowed</option>
                <option value="returned">Returned</option>
                <option value="overdue">Overdue Returns</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. EQUIPMENT CATALOG TAB                                  */}
      {/* ========================================================= */}
      {subTab === 'catalog' && (
        <div>
          {filteredItems.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-zinc-200">
              <Package className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-zinc-800">No equipment items found</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
                {items.length === 0 
                  ? "Your laboratory equipment catalog is currently empty. Add items or click 'Seed Sample Items' to populate standard hardware."
                  : "No items match your active filters or search terms."}
              </p>
              {items.length === 0 && onSeedSampleItems && isStaff && (
                <button
                  onClick={handleSeed}
                  disabled={seeding}
                  className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Seed Standard Lab Equipment</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map(item => {
                const lab = laboratories.find(l => l.id === item.labId);
                const isOutOfStock = item.availableQuantity <= 0;
                const isUnderRepair = item.condition === 'maintenance';

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl p-5 border border-zinc-200/90 shadow-xs hover:border-zinc-300 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Bar: Tag & Condition */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-800 border border-zinc-200">
                          {item.assetTag}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            item.condition === 'excellent' ? 'bg-emerald-100 text-emerald-800' :
                            item.condition === 'good' ? 'bg-blue-100 text-blue-800' :
                            item.condition === 'fair' ? 'bg-amber-100 text-amber-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {item.condition}
                          </span>
                        </div>
                      </div>

                      {/* Title & Category */}
                      <h3 className="text-base font-bold text-zinc-900 leading-snug">
                        {item.name}
                      </h3>
                      <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
                        <Layers className="w-3 h-3 text-zinc-400" />
                        <span>{item.category}</span>
                      </p>

                      {/* Location & Details */}
                      <div className="mt-3 py-2 px-3 bg-zinc-50 rounded-xl border border-zinc-100 text-xs space-y-1">
                        <div className="flex items-center justify-between text-zinc-600">
                          <span className="flex items-center gap-1 text-zinc-500">
                            <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                            {lab?.name || item.labName || 'Laboratory'}
                          </span>
                          <span className="font-mono text-[11px] text-zinc-700">
                            {item.location || 'Shelf A'}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-zinc-500 pt-1 border-t border-zinc-200/50 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </div>

                      {/* Stock Bar Meter */}
                      <div className="mt-3.5">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-zinc-500">Stock Availability</span>
                          <span className="font-mono font-bold text-zinc-800">
                            {item.availableQuantity} / {item.totalQuantity} available
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-zinc-100 overflow-hidden">
                          <div
                            className={`h-full transition-all rounded-full ${
                              isOutOfStock ? 'bg-red-500' :
                              item.availableQuantity < item.totalQuantity ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{
                              width: `${Math.round((item.availableQuantity / item.totalQuantity) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setQrModal({ isOpen: true, item })}
                          title="Generate printable Asset QR label"
                          className="p-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>
                        {isStaff && (
                          <>
                            <button
                              onClick={() => setItemModal({ isOpen: true, item })}
                              title="Edit item information"
                              className="p-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setDeleteItemTarget(item);
                                setDeleteError(null);
                              }}
                              title="Remove item from inventory"
                              className="p-2 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-600 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>

                      <button
                        onClick={() => setBorrowModal({ isOpen: true, item })}
                        disabled={isOutOfStock || isUnderRepair}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 ${
                          isOutOfStock || isUnderRepair
                            ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                            : 'bg-zinc-900 hover:bg-zinc-800 text-white'
                        }`}
                      >
                        <Package className="w-3.5 h-3.5" />
                        <span>{isOutOfStock ? 'Out of Stock' : isUnderRepair ? 'Under Repair' : 'Borrow Item'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. BORROW PERMISSIONS & TRACKING QUEUE                     */}
      {/* ========================================================= */}
      {subTab === 'requests' && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-zinc-50/70 border-b border-zinc-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-zinc-900">Equipment Borrow Permission Requests</h3>
              <p className="text-xs text-zinc-500">Live tracker of active loans, approvals, and returns</p>
            </div>
            <span className="text-xs font-mono text-zinc-500 bg-white px-2 py-1 rounded-md border border-zinc-200">
              {filteredRequests.length} record(s)
            </span>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="p-12 text-center">
              <ShieldCheck className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-zinc-800">No borrow requests in this view</h4>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                No borrowing requests match the selected status or filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase tracking-wider text-[10px] font-bold">
                  <tr>
                    <th className="py-3 px-4">Equipment / Item</th>
                    <th className="py-3 px-4">Borrower Details</th>
                    <th className="py-3 px-4">Purpose / Project</th>
                    <th className="py-3 px-4">Expected Return</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {filteredRequests.map(req => {
                    const isOverdue = req.status === 'approved' && isPast(req.expectedReturnDate.toDate());
                    const targetItem = items.find(i => i.id === req.itemId);

                    return (
                      <tr key={req.id} className="hover:bg-zinc-50/80 transition-colors">
                        {/* Equipment Info */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-start gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center shrink-0">
                              <Package className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-bold text-zinc-900 block leading-snug">{req.itemName}</span>
                              <span className="font-mono text-[10px] text-zinc-500">
                                {req.itemAssetTag || 'ASSET'} • Qty: {req.quantity}
                              </span>
                              <p className="text-[10px] text-zinc-400 mt-0.5">{req.labName}</p>
                            </div>
                          </div>
                        </td>

                        {/* Borrower */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-zinc-900">{req.borrowerName}</div>
                          <div className="text-[11px] text-zinc-500">{req.borrowerEmail}</div>
                          <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                            ID: {req.borrowerIdNumber || 'N/A'} • <span className="capitalize">{req.borrowerRole}</span>
                          </div>
                        </td>

                        {/* Purpose */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="text-zinc-700 line-clamp-2 italic">
                            "{req.purpose}"
                          </p>
                          <span className="text-[10px] text-zinc-400 mt-1 block">
                            Requested: {format(req.requestedAt.toDate(), 'MMM d, h:mm a')}
                          </span>
                        </td>

                        {/* Expected Return */}
                        <td className="py-3.5 px-4">
                          <div className={`font-semibold ${isOverdue ? 'text-red-700 font-bold' : 'text-zinc-800'}`}>
                            {format(req.expectedReturnDate.toDate(), 'MMM d, yyyy')}
                          </div>
                          <div className="text-[11px] text-zinc-500">
                            {format(req.expectedReturnDate.toDate(), 'h:mm a')}
                          </div>
                          {req.status === 'approved' && (
                            <span className={`inline-block text-[10px] font-bold mt-1 px-1.5 py-0.2 rounded ${
                              isOverdue ? 'bg-red-100 text-red-800' : 'bg-zinc-100 text-zinc-600'
                            }`}>
                              {isOverdue ? '⚠️ Overdue' : 'Active Loan'}
                            </span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                            req.status === 'approved' ? (isOverdue ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800') :
                            req.status === 'pending' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                            req.status === 'returned' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-zinc-100 text-zinc-600'
                          }`}>
                            {req.status === 'approved' ? (isOverdue ? 'Overdue' : 'On Loan') :
                             req.status === 'pending' ? 'Pending Permission' :
                             req.status === 'returned' ? 'Returned' : 'Rejected'}
                          </span>
                          {req.reviewNotes && (
                            <p className="text-[10px] text-zinc-400 mt-1 max-w-xs truncate" title={req.reviewNotes}>
                              Note: {req.reviewNotes}
                            </p>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* If staff: Approve / Reject / Return */}
                            {isStaff && (
                              <button
                                onClick={() => setReviewModal({ isOpen: true, request: req })}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1 ${
                                  req.status === 'pending'
                                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                    : req.status === 'approved'
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                                }`}
                              >
                                {req.status === 'pending' ? (
                                  <>
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    <span>Review Permission</span>
                                  </>
                                ) : req.status === 'approved' ? (
                                  <>
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Check-In Return</span>
                                  </>
                                ) : (
                                  <span>View Details</span>
                                )}
                              </button>
                            )}

                            {/* If student borrower: cancel pending */}
                            {!isStaff && req.status === 'pending' && req.borrowerUid === currentUserId && (
                              <button
                                onClick={() => setCancelRequestTarget(req)}
                                className="px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                            )}

                            {/* If staff: Delete record (for returned or rejected requests) */}
                            {isStaff && (req.status === 'returned' || req.status === 'rejected') && onDeleteBorrowRequest && (
                              <button
                                onClick={() => setDeleteRequestTarget(req)}
                                title="Delete old borrow record"
                                className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. MY BORROWED ITEMS & LOANS (PERSONAL PASS)             */}
      {/* ========================================================= */}
      {subTab === 'my_loans' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  {profile?.displayName}'s Equipment Loans
                </h3>
                <p className="text-xs text-zinc-500">
                  Track your borrowed laboratory items and show your digital loan pass for return check-in
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setSubTab('catalog');
                setBorrowModal({ isOpen: true, item: null });
              }}
              className="px-3.5 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
            >
              <Package className="w-3.5 h-3.5" />
              <span>Borrow Another Item</span>
            </button>
          </div>

          {myRequests.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-zinc-200">
              <Package className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-zinc-800">You haven't borrowed any laboratory equipment yet</h4>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                Need an Arduino kit, multimeter, VR headset, or cables for your laboratory session? Browse the catalog to request permission.
              </p>
              <button
                onClick={() => setSubTab('catalog')}
                className="mt-4 px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 transition-colors"
              >
                Browse Equipment Catalog
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myRequests.map(loan => {
                const isOverdue = loan.status === 'approved' && isPast(loan.expectedReturnDate.toDate());
                return (
                  <div
                    key={loan.id}
                    className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-xs hover:border-zinc-300 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-100 text-zinc-700">
                          {loan.itemAssetTag || 'ASSET-TAG'}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize ${
                          loan.status === 'approved' ? (isOverdue ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800') :
                          loan.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                          loan.status === 'returned' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-zinc-100 text-zinc-600'
                        }`}>
                          {isOverdue ? 'Overdue!' : loan.status}
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-zinc-900">{loan.itemName}</h4>
                      <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-zinc-400" />
                        {loan.labName} • Qty: {loan.quantity}
                      </p>

                      <div className="mt-3 p-3 bg-zinc-50 rounded-xl border border-zinc-100 text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-zinc-600">
                          <span className="text-zinc-500">Purpose:</span>
                          <span className="font-medium text-zinc-800 truncate max-w-[200px]">
                            {loan.purpose}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-zinc-600">
                          <span className="text-zinc-500">Return Deadline:</span>
                          <span className={`font-mono font-bold ${isOverdue ? 'text-red-700' : 'text-zinc-800'}`}>
                            {format(loan.expectedReturnDate.toDate(), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>
                        {loan.reviewNotes && (
                          <div className="pt-1 border-t border-zinc-200/50 text-[11px] text-zinc-500">
                            Staff Remark: {loan.reviewNotes}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
                      <span className="text-[11px] text-zinc-400">
                        Loan ID: #{loan.id.slice(-6).toUpperCase()}
                      </span>
                      {loan.status === 'approved' && (
                        <span className="text-xs font-semibold text-blue-700 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Return to Lab Desk when done</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODALS                                                    */}
      {/* ========================================================= */}
      <RequestBorrowModal
        isOpen={borrowModal.isOpen}
        onClose={() => setBorrowModal({ isOpen: false, item: null })}
        item={borrowModal.item}
        items={items}
        laboratories={laboratories}
        profile={profile}
        onSubmit={onRequestBorrow}
      />

      <ManageItemModal
        isOpen={itemModal.isOpen}
        onClose={() => setItemModal({ isOpen: false, item: null })}
        item={itemModal.item}
        laboratories={laboratories}
        onSave={async (data) => {
          if (itemModal.item) {
            await onUpdateItem(itemModal.item.id, data);
          } else {
            await onAddItem(data);
          }
        }}
        onDelete={async (itemId) => {
          await onDeleteItem(itemId);
          setItemModal({ isOpen: false, item: null });
        }}
      />

      <ReviewBorrowModal
        isOpen={reviewModal.isOpen}
        onClose={() => setReviewModal({ isOpen: false, request: null })}
        request={reviewModal.request}
        item={items.find(i => i.id === reviewModal.request?.itemId) || null}
        profile={profile}
        onApprove={onApproveRequest}
        onReject={onRejectRequest}
        onReturn={onReturnRequest}
      />

      <ItemQrCodeModal
        isOpen={qrModal.isOpen}
        onClose={() => setQrModal({ isOpen: false, item: null })}
        item={qrModal.item}
        laboratory={laboratories.find(l => l.id === qrModal.item?.labId) || null}
      />

      {/* 5. In-App Confirmation Modal: Delete Equipment Item */}
      {deleteItemTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-red-200 overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-red-100 flex items-center justify-between bg-red-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-red-950">Remove Laboratory Item</h3>
                  <p className="text-xs text-red-700">Permanent inventory deletion</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setDeleteItemTarget(null);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-white/80 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-200 text-zinc-700">
                    {deleteItemTarget.assetTag}
                  </span>
                  <span className="text-xs font-semibold text-zinc-600">
                    {deleteItemTarget.category}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-zinc-900">{deleteItemTarget.name}</h4>
                <p className="text-xs text-zinc-500">
                  Location: {deleteItemTarget.labName || 'Laboratory'} • {deleteItemTarget.location || 'Shelf A'}
                </p>
                <div className="pt-2 border-t border-zinc-200 flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-500">Total Units: {deleteItemTarget.totalQuantity}</span>
                  <span className="text-zinc-700 font-bold">Available: {deleteItemTarget.availableQuantity}</span>
                </div>
              </div>

              {deleteItemTarget.totalQuantity > deleteItemTarget.availableQuantity && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Active Loans In Progress</span>
                    <span>
                      {deleteItemTarget.totalQuantity - deleteItemTarget.availableQuantity} unit(s) of this item are currently borrowed by students or faculty.
                    </span>
                  </div>
                </div>
              )}

              <p className="text-xs text-zinc-600 leading-relaxed">
                Are you sure you want to remove <strong className="text-zinc-900">"{deleteItemTarget.name}"</strong> from the laboratory inventory? This action cannot be undone.
              </p>

              {deleteError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteItemTarget(null);
                    setDeleteError(null);
                  }}
                  disabled={isDeleting}
                  className="px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setIsDeleting(true);
                    setDeleteError(null);
                    try {
                      await onDeleteItem(deleteItemTarget.id);
                      setDeleteItemTarget(null);
                    } catch (err: any) {
                      console.error('Failed to delete item:', err);
                      setDeleteError(err.message || 'Failed to remove item. Please verify administrative permissions.');
                    } finally {
                      setIsDeleting(false);
                    }
                  }}
                  disabled={isDeleting}
                  className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? 'Removing...' : 'Confirm Remove Item'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. In-App Confirmation Modal: Cancel Borrow Request (Student) */}
      {cancelRequestTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-zinc-200 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">Cancel Borrow Request</h3>
                <p className="text-xs text-zinc-500">Withdraw pending permission application</p>
              </div>
            </div>

            <p className="text-xs text-zinc-600">
              Are you sure you want to cancel your borrow request for <strong className="text-zinc-900">"{cancelRequestTarget.itemName}"</strong>?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelRequestTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 rounded-lg cursor-pointer"
              >
                Keep Request
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await onRejectRequest(cancelRequestTarget.id, 'Cancelled by student');
                    setCancelRequestTarget(null);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm cursor-pointer"
              >
                {isDeleting ? 'Cancelling...' : 'Yes, Cancel Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. In-App Confirmation Modal: Delete Borrow Record (Staff) */}
      {deleteRequestTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-red-200 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-red-950">Delete Borrow Record</h3>
                <p className="text-xs text-red-700">Permanent record removal from audit trail</p>
              </div>
            </div>

            <p className="text-xs text-zinc-600">
              Remove the borrow record for <strong className="text-zinc-900">"{deleteRequestTarget.itemName}"</strong> (Borrower: {deleteRequestTarget.borrowerName})?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteRequestTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!onDeleteBorrowRequest) return;
                  setIsDeleting(true);
                  try {
                    await onDeleteBorrowRequest(deleteRequestTarget.id);
                    setDeleteRequestTarget(null);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Delete Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
