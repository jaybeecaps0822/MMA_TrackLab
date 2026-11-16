import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Laboratory, LabItem, BorrowRequest, ItemCategory, ItemCondition, UserProfile } from '../types';
import { format, addHours, addDays, differenceInMinutes, isPast } from 'date-fns';
import { 
  Package, 
  CheckCircle2, 
  X, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  Printer, 
  Download, 
  Sparkles, 
  QrCode, 
  FileText, 
  Tag, 
  MapPin, 
  ShieldCheck, 
  RotateCcw,
  Camera,
  XCircle,
  Trash2
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

// ==========================================
// 1. REQUEST BORROW PERMISSION MODAL
// ==========================================
interface RequestBorrowModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: LabItem | null;
  items: LabItem[];
  laboratories: Laboratory[];
  profile: UserProfile | null;
  onSubmit: (data: {
    itemId: string;
    itemName: string;
    itemAssetTag?: string;
    labId: string;
    labName?: string;
    borrowerUid: string;
    borrowerName: string;
    borrowerEmail: string;
    borrowerIdNumber: string;
    borrowerRole: any;
    purpose: string;
    quantity: number;
    status: 'pending' | 'approved';
    requestedAt: Timestamp;
    expectedReturnDate: Timestamp;
  }) => Promise<void>;
}

export const RequestBorrowModal: React.FC<RequestBorrowModalProps> = ({
  isOpen,
  onClose,
  item,
  items,
  laboratories,
  profile,
  onSubmit,
}) => {
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [borrowerIdNumber, setBorrowerIdNumber] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [returnOption, setReturnOption] = useState<'today_5pm' | 'tomorrow_5pm' | '3days' | '1week' | 'custom'>('today_5pm');
  const [customReturnDate, setCustomReturnDate] = useState<string>('');
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setSelectedItemId(item.id);
    } else if (items.length > 0 && !selectedItemId) {
      const available = items.find(i => i.availableQuantity > 0) || items[0];
      setSelectedItemId(available.id);
    }
    // Default custom return date to tomorrow at 5pm
    const defaultDate = addDays(new Date(), 1);
    defaultDate.setHours(17, 0, 0, 0);
    setCustomReturnDate(format(defaultDate, "yyyy-MM-dd'T'HH:mm"));
  }, [item, items]);

  if (!isOpen) return null;

  const currentItem = items.find(i => i.id === selectedItemId) || item;
  const lab = laboratories.find(l => l.id === currentItem?.labId);

  const calculateReturnDate = (): Date => {
    const now = new Date();
    if (returnOption === 'today_5pm') {
      const d = new Date();
      d.setHours(17, 0, 0, 0);
      if (d <= now) {
        // If already past 5pm, set to 3 hours from now
        return addHours(now, 3);
      }
      return d;
    } else if (returnOption === 'tomorrow_5pm') {
      const d = addDays(now, 1);
      d.setHours(17, 0, 0, 0);
      return d;
    } else if (returnOption === '3days') {
      return addDays(now, 3);
    } else if (returnOption === '1week') {
      return addDays(now, 7);
    } else {
      return customReturnDate ? new Date(customReturnDate) : addDays(now, 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentItem) {
      setError('Please select an item to borrow.');
      return;
    }
    if (currentItem.availableQuantity <= 0) {
      setError('This item is currently out of stock / already borrowed.');
      return;
    }
    if (quantity > currentItem.availableQuantity) {
      setError(`Cannot borrow more than available stock (${currentItem.availableQuantity}).`);
      return;
    }
    if (!purpose.trim()) {
      setError('Please state the purpose for borrowing this equipment.');
      return;
    }
    if (!termsAccepted) {
      setError('Please confirm the laboratory equipment accountability terms.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const returnDate = calculateReturnDate();
      // If user is admin/teacher and item doesn't require strict approval, can auto-approve,
      // otherwise it goes into 'pending' approval queue
      const initialStatus = (profile?.role === 'admin' || profile?.role === 'teacher') && !currentItem.requiresApproval
        ? 'approved' 
        : 'pending';

      await onSubmit({
        itemId: currentItem.id,
        itemName: currentItem.name,
        itemAssetTag: currentItem.assetTag,
        labId: currentItem.labId,
        labName: lab?.name || currentItem.labName || 'Laboratory Equipment',
        borrowerUid: profile?.uid || 'anonymous',
        borrowerName: profile?.displayName || 'User',
        borrowerEmail: profile?.email || '',
        borrowerIdNumber: borrowerIdNumber.trim() || 'N/A',
        borrowerRole: profile?.role || 'student',
        purpose: purpose.trim(),
        quantity,
        status: initialStatus,
        requestedAt: Timestamp.now(),
        expectedReturnDate: Timestamp.fromDate(returnDate),
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to submit borrow request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200/60 shadow-xs">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900">Request to Borrow Equipment</h3>
              <p className="text-xs text-zinc-500">Laboratory item tracking & permission record</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Item Selector or Preview */}
          {!item ? (
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Select Equipment / Item *
              </label>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full text-xs font-medium bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-zinc-900 focus:outline-none"
              >
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.name} ({it.assetTag}) - Available: {it.availableQuantity}/{it.totalQuantity}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-3.5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-200 text-zinc-700 font-mono mb-1">
                    <Tag className="w-3 h-3" />
                    {currentItem?.assetTag}
                  </span>
                  <h4 className="text-sm font-bold text-zinc-900">{currentItem?.name}</h4>
                  <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-zinc-400" />
                    {lab?.name || currentItem?.labName} • {currentItem?.category}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-bold ${
                    (currentItem?.availableQuantity || 0) > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {currentItem?.availableQuantity} in stock
                  </span>
                  {currentItem?.location && (
                    <p className="text-[10px] text-zinc-400 mt-1 font-mono">{currentItem.location}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Borrower Identification */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Borrower Name
              </label>
              <input
                type="text"
                value={profile?.displayName || ''}
                readOnly
                className="w-full text-xs bg-zinc-100 border border-zinc-200 rounded-lg px-3 py-2 text-zinc-600 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Student / Employee ID
              </label>
              <input
                type="text"
                placeholder="e.g. 2024-08221"
                value={borrowerIdNumber}
                onChange={(e) => setBorrowerIdNumber(e.target.value)}
                className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-zinc-900 focus:outline-none"
              />
            </div>
          </div>

          {/* Quantity & Purpose */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Quantity *
              </label>
              <input
                type="number"
                min={1}
                max={Math.max(1, currentItem?.availableQuantity || 1)}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-zinc-900 focus:outline-none"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Purpose / Project Subject *
              </label>
              <input
                type="text"
                placeholder="e.g. CS401 Robotics Lab exercise"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Expected Return Schedule */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Expected Return Time *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
              <button
                type="button"
                onClick={() => setReturnOption('today_5pm')}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border text-center transition-colors ${
                  returnOption === 'today_5pm'
                    ? 'bg-zinc-900 text-white border-zinc-900 font-bold'
                    : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                Today 5:00 PM
              </button>
              <button
                type="button"
                onClick={() => setReturnOption('tomorrow_5pm')}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border text-center transition-colors ${
                  returnOption === 'tomorrow_5pm'
                    ? 'bg-zinc-900 text-white border-zinc-900 font-bold'
                    : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                Tomorrow 5 PM
              </button>
              <button
                type="button"
                onClick={() => setReturnOption('3days')}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border text-center transition-colors ${
                  returnOption === '3days'
                    ? 'bg-zinc-900 text-white border-zinc-900 font-bold'
                    : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                3 Days
              </button>
              <button
                type="button"
                onClick={() => setReturnOption('custom')}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border text-center transition-colors ${
                  returnOption === 'custom'
                    ? 'bg-zinc-900 text-white border-zinc-900 font-bold'
                    : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                Custom Date
              </button>
            </div>

            {returnOption === 'custom' && (
              <input
                type="datetime-local"
                value={customReturnDate}
                onChange={(e) => setCustomReturnDate(e.target.value)}
                className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                required
              />
            )}
          </div>

          {/* Terms checkbox */}
          <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 rounded text-zinc-900 focus:ring-zinc-900"
              />
              <span className="text-[11px] text-zinc-700 leading-relaxed">
                I acknowledge responsibility for this laboratory equipment. I promise to handle it carefully, report any damage immediately, and return it on or before the agreed return schedule.
              </span>
            </label>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !currentItem || currentItem.availableQuantity <= 0}
              className="px-5 py-2 text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              {loading ? (
                <span>Submitting...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Submit Borrow Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// 2. MANAGE ITEM MODAL (ADD / EDIT INVENTORY)
// ==========================================
interface ManageItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: LabItem | null;
  laboratories: Laboratory[];
  onSave: (data: Partial<LabItem>) => Promise<void>;
  onDelete?: (itemId: string) => Promise<void>;
}

export const ManageItemModal: React.FC<ManageItemModalProps> = ({
  isOpen,
  onClose,
  item,
  laboratories,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [labId, setLabId] = useState('');
  const [category, setCategory] = useState<ItemCategory>('Electronics & IoT');
  const [assetTag, setAssetTag] = useState('');
  const [totalQuantity, setTotalQuantity] = useState<number>(1);
  const [availableQuantity, setAvailableQuantity] = useState<number>(1);
  const [condition, setCondition] = useState<ItemCondition>('excellent');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setConfirmDelete(false);
    setDeleting(false);
    if (item) {
      setName(item.name);
      setLabId(item.labId);
      setCategory(item.category);
      setAssetTag(item.assetTag);
      setTotalQuantity(item.totalQuantity);
      setAvailableQuantity(item.availableQuantity);
      setCondition(item.condition);
      setLocation(item.location || '');
      setDescription(item.description || '');
      setRequiresApproval(item.requiresApproval ?? true);
    } else {
      setName('');
      setLabId(laboratories[0]?.id || '');
      setCategory('Electronics & IoT');
      generateTag(laboratories[0]?.id || 'LAB');
      setTotalQuantity(1);
      setAvailableQuantity(1);
      setCondition('excellent');
      setLocation('Cabinet A, Shelf 1');
      setDescription('');
      setRequiresApproval(true);
    }
  }, [item, laboratories, isOpen]);

  const generateTag = (labPrefix: string) => {
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const prefix = labPrefix.substring(0, 4).toUpperCase();
    setAssetTag(`MMA-${prefix}-${randomCode}`);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Item name is required.');
      return;
    }
    if (!assetTag.trim()) {
      setError('Asset tag is required.');
      return;
    }
    if (totalQuantity < 1) {
      setError('Total quantity must be at least 1.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const selectedLab = laboratories.find(l => l.id === labId);
      await onSave({
        name: name.trim(),
        labId,
        labName: selectedLab?.name || 'Laboratory',
        category,
        assetTag: assetTag.trim(),
        totalQuantity,
        availableQuantity: Math.min(availableQuantity, totalQuantity),
        condition,
        location: location.trim(),
        description: description.trim(),
        requiresApproval,
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to save equipment item.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-xs">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900">
                {item ? 'Edit Laboratory Item' : 'Add New Laboratory Item'}
              </h3>
              <p className="text-xs text-zinc-500">Trackable equipment inventory & asset control</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Item Name */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Item Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Arduino Uno R3 Starter Kit"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-zinc-900 focus:outline-none"
              required
            />
          </div>

          {/* Laboratory & Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Laboratory Location *
              </label>
              <select
                value={labId}
                onChange={(e) => {
                  setLabId(e.target.value);
                  if (!item) generateTag(e.target.value);
                }}
                className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-zinc-900 focus:outline-none"
              >
                {laboratories.map((lab) => (
                  <option key={lab.id} value={lab.id}>
                    {lab.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ItemCategory)}
                className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-zinc-900 focus:outline-none"
              >
                <option value="Electronics & IoT">Electronics & IoT</option>
                <option value="Computing & Peripherals">Computing & Peripherals</option>
                <option value="Networking">Networking</option>
                <option value="Audio/Visual">Audio/Visual</option>
                <option value="Tools & Testers">Tools & Testers</option>
                <option value="Cables & Adapters">Cables & Adapters</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Asset Tag & Auto Generator */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-zinc-700">
                Asset Tag / Barcode *
              </label>
              <button
                type="button"
                onClick={() => generateTag(labId)}
                className="text-[11px] text-zinc-600 hover:text-zinc-900 font-medium flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
                Generate Tag
              </button>
            </div>
            <input
              type="text"
              placeholder="e.g. MMA-LAB1-4921"
              value={assetTag}
              onChange={(e) => setAssetTag(e.target.value)}
              className="w-full text-xs font-mono bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-zinc-900 focus:outline-none uppercase"
              required
            />
          </div>

          {/* Quantities & Condition */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Total Units *
              </label>
              <input
                type="number"
                min={1}
                value={totalQuantity}
                onChange={(e) => {
                  const val = Math.max(1, parseInt(e.target.value) || 1);
                  setTotalQuantity(val);
                  if (availableQuantity > val) setAvailableQuantity(val);
                }}
                className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Available Now *
              </label>
              <input
                type="number"
                min={0}
                max={totalQuantity}
                value={availableQuantity}
                onChange={(e) => setAvailableQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Condition *
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as ItemCondition)}
                className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-zinc-900 focus:outline-none"
              >
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="maintenance">Under Repair</option>
              </select>
            </div>
          </div>

          {/* Storage Location */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Storage Cabinet / Shelf
            </label>
            <input
              type="text"
              placeholder="e.g. Cabinet B, Shelf 2 or Tool Cart #1"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-zinc-900 focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Specifications / Notes
            </label>
            <textarea
              placeholder="Details about accessories included (e.g. power brick, USB-C cable included)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-zinc-900 focus:outline-none"
            />
          </div>

          {/* Requires Approval */}
          <div className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
            <div>
              <span className="text-xs font-semibold text-zinc-900">Requires Staff Permission</span>
              <p className="text-[11px] text-zinc-500">Require instructor or admin review before loaning out</p>
            </div>
            <input
              type="checkbox"
              checked={requiresApproval}
              onChange={(e) => setRequiresApproval(e.target.checked)}
              className="h-4 w-4 rounded text-zinc-900 focus:ring-zinc-900"
            />
          </div>

          {/* Delete confirmation banner inside modal */}
          {item && onDelete && confirmDelete && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-bold text-red-900">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>Confirm Permanent Removal</span>
              </div>
              <p className="text-[11px] text-red-700 leading-normal">
                Are you sure you want to delete <strong>"{item.name}"</strong>? This will remove this item from the laboratory catalog.
              </p>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  className="px-3 py-1.5 text-[11px] font-semibold text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setDeleting(true);
                    setError(null);
                    try {
                      await onDelete(item.id);
                      onClose();
                    } catch (err: any) {
                      console.error('Failed to delete item from modal:', err);
                      setError(err.message || 'Failed to remove equipment item. Verify administrative permissions.');
                      setConfirmDelete(false);
                    } finally {
                      setDeleting(false);
                    }
                  }}
                  disabled={deleting}
                  className="px-3.5 py-1.5 text-[11px] font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{deleting ? 'Removing...' : 'Yes, Delete Item'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2.5 pt-2 border-t border-zinc-100">
            <div>
              {item && onDelete && !confirmDelete && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={loading || deleting}
                  className="px-3 py-2 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Remove this item from inventory"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Item</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading || deleting}
                className="px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || deleting}
                className="px-5 py-2 text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {loading ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{item ? 'Save Changes' : 'Create Equipment Item'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// 3. REVIEW BORROW PERMISSION MODAL (APPROVE / REJECT / RETURN)
// ==========================================
interface ReviewBorrowModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: BorrowRequest | null;
  item: LabItem | null;
  profile: UserProfile | null;
  onApprove: (requestId: string, notes?: string) => Promise<void>;
  onReject: (requestId: string, reason: string) => Promise<void>;
  onReturn: (requestId: string, condition: 'good' | 'fair' | 'damaged' | 'missing_parts', notes?: string) => Promise<void>;
}

export const ReviewBorrowModal: React.FC<ReviewBorrowModalProps> = ({
  isOpen,
  onClose,
  request,
  item,
  profile,
  onApprove,
  onReject,
  onReturn,
}) => {
  const [actionType, setActionType] = useState<'review' | 'return'>('review');
  const [reviewNotes, setReviewNotes] = useState('');
  const [returnCondition, setReturnCondition] = useState<'good' | 'fair' | 'damaged' | 'missing_parts'>('good');
  const [returnNotes, setReturnNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (request?.status === 'approved') {
      setActionType('return');
    } else {
      setActionType('review');
    }
    setReviewNotes('');
    setReturnNotes('');
  }, [request, isOpen]);

  if (!isOpen || !request) return null;

  const isOverdue = request.status === 'approved' && isPast(request.expectedReturnDate.toDate());

  const handleApprove = async () => {
    setLoading(true);
    setError(null);
    try {
      await onApprove(request.id, reviewNotes.trim() || undefined);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to approve borrow request.');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!reviewNotes.trim()) {
      setError('Please provide a brief reason for rejecting this request.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onReject(request.id, reviewNotes.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to reject borrow request.');
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async () => {
    setLoading(true);
    setError(null);
    try {
      await onReturn(request.id, returnCondition, returnNotes.trim() || undefined);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to process item return.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs ${
              request.status === 'approved' 
                ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {request.status === 'approved' ? <RotateCcw className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900">
                {request.status === 'approved' ? 'Process Item Return & Check-In' : 'Review Borrow Permission'}
              </h3>
              <p className="text-xs text-zinc-500">Tracking Request #{request.id.slice(-6).toUpperCase()}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Item & Borrower Card */}
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 mb-4 space-y-2.5">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-200 text-zinc-700">
                {request.itemAssetTag || 'ASSET-TAG'}
              </span>
              <h4 className="text-sm font-bold text-zinc-900 mt-1">{request.itemName}</h4>
              <p className="text-xs text-zinc-500 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-zinc-400" />
                {request.labName || 'Laboratory'} • Qty: {request.quantity} unit(s)
              </p>
            </div>
            <div className="text-right">
              <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold capitalize ${
                request.status === 'approved' ? (isOverdue ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800') :
                request.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                request.status === 'returned' ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-200 text-zinc-700'
              }`}>
                {isOverdue ? 'Overdue' : request.status}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-200/70 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-zinc-400 text-[10px] uppercase font-bold tracking-wider">Borrower</span>
              <p className="font-semibold text-zinc-800">{request.borrowerName}</p>
              <p className="text-zinc-500 text-[11px]">{request.borrowerEmail} ({request.borrowerRole})</p>
            </div>
            <div>
              <span className="text-zinc-400 text-[10px] uppercase font-bold tracking-wider">Expected Return</span>
              <p className={`font-semibold ${isOverdue ? 'text-red-700 font-bold' : 'text-zinc-800'}`}>
                {format(request.expectedReturnDate.toDate(), 'MMM d, yyyy h:mm a')}
              </p>
              <p className="text-zinc-500 text-[11px]">
                ID: {request.borrowerIdNumber || 'Not specified'}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-200/70">
            <span className="text-zinc-400 text-[10px] uppercase font-bold tracking-wider">Purpose of Loan</span>
            <p className="text-xs text-zinc-700 mt-0.5 italic bg-white p-2 rounded-lg border border-zinc-200/60">
              "{request.purpose}"
            </p>
          </div>
        </div>

        {/* If Request is Pending: Permission Review Form */}
        {request.status === 'pending' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Staff Review / Approval Remarks
              </label>
              <textarea
                placeholder="Optional notes: e.g. 'Approved for classroom demo only', or specify required return condition..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={2}
                className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-zinc-900 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleReject}
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors flex items-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject Request</span>
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={loading}
                className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Approve & Release Item</span>
              </button>
            </div>
          </div>
        )}

        {/* If Request is Approved: Return & Check-In Form */}
        {request.status === 'approved' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Equipment Condition Upon Return *
              </label>
              <select
                value={returnCondition}
                onChange={(e) => setReturnCondition(e.target.value as any)}
                className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-zinc-900 focus:outline-none"
              >
                <option value="good">Good / Complete - Ready for Next Borrower</option>
                <option value="fair">Fair - Normal minor wear</option>
                <option value="damaged">Damaged - Requires Maintenance</option>
                <option value="missing_parts">Missing Parts / Incomplete Accessories</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Return Inspection Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Returned with all cables in good working order"
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-zinc-900 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReturn}
                disabled={loading}
                className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Confirm Item Return & Restock</span>
              </button>
            </div>
          </div>
        )}

        {/* If Request is already Returned / Rejected: Close */}
        {(request.status === 'returned' || request.status === 'rejected') && (
          <div className="pt-2 text-right">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 rounded-lg"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 4. ITEM QR CODE MODAL (PRINTABLE ASSET LABEL)
// ==========================================
interface ItemQrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: LabItem | null;
  laboratory: Laboratory | null;
}

export const ItemQrCodeModal: React.FC<ItemQrCodeModalProps> = ({
  isOpen,
  onClose,
  item,
  laboratory,
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!item) return;
    const url = `${window.location.origin}${window.location.pathname}?borrowItemId=${item.id}&tag=${encodeURIComponent(item.assetTag)}`;
    QRCode.toDataURL(url, {
      width: 320,
      margin: 2,
      color: {
        dark: '#18181b',
        light: '#ffffff',
      },
    }).then(setDataUrl).catch(console.error);
  }, [item]);

  if (!isOpen || !item) return null;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=600,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Asset Label - ${item.assetTag}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 20px; text-align: center; color: #18181b; }
            .card { border: 2px solid #18181b; border-radius: 12px; padding: 24px; max-width: 380px; margin: 0 auto; box-sizing: border-box; }
            .header { font-size: 11px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.1em; color: #71717a; margin-bottom: 4px; }
            .title { font-size: 18px; font-weight: 800; margin: 0 0 6px 0; }
            .meta { font-size: 12px; color: #52525b; margin-bottom: 12px; }
            .tag { display: inline-block; background: #18181b; color: #ffffff; padding: 4px 10px; border-radius: 6px; font-family: monospace; font-size: 13px; font-weight: bold; margin-bottom: 14px; }
            .qr-code { width: 220px; height: 220px; margin: 0 auto; display: block; }
            .footer { font-size: 10px; color: #a1a1aa; margin-top: 12px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">MMA ICT TrackLab • Equipment Asset</div>
            <h1 class="title">${item.name}</h1>
            <div class="meta">${laboratory?.name || item.labName || 'Laboratory'} • ${item.category}</div>
            <div class="tag">${item.assetTag}</div>
            <img class="qr-code" src="${dataUrl}" alt="QR Code" />
            <div class="footer">Scan to check availability or request permission to borrow</div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-zinc-200">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-4">
          <div className="flex items-center gap-2 text-zinc-900">
            <QrCode className="w-5 h-5 text-zinc-900" />
            <h3 className="text-sm font-bold">Equipment Asset QR Sticker</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Card Preview */}
        <div ref={printRef} className="border-2 border-zinc-900 rounded-xl p-4 text-center bg-white shadow-xs">
          <span className="text-[9px] uppercase tracking-wider font-extrabold text-zinc-400 block mb-1">
            MMA ICT TrackLab • Asset Tag
          </span>
          <h4 className="text-sm font-black text-zinc-900 leading-tight mb-1">{item.name}</h4>
          <p className="text-[11px] text-zinc-500 mb-2">
            {laboratory?.name || item.labName} • {item.category}
          </p>
          <span className="inline-block px-2.5 py-1 rounded-md bg-zinc-900 text-white font-mono text-xs font-bold mb-3">
            {item.assetTag}
          </span>

          <div className="flex justify-center my-2">
            {dataUrl ? (
              <img src={dataUrl} alt="QR Code" className="w-48 h-48 rounded-lg border border-zinc-100 shadow-xs" />
            ) : (
              <div className="w-48 h-48 bg-zinc-100 animate-pulse rounded-lg flex items-center justify-center text-xs text-zinc-400">
                Generating QR...
              </div>
            )}
          </div>
          <p className="text-[10px] text-zinc-400 mt-2">
            Scan with smartphone camera to request permission to borrow
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2 mt-5">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-2 px-3 bg-zinc-900 text-white rounded-lg text-xs font-semibold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Sticker</span>
          </button>
          {dataUrl && (
            <a
              href={dataUrl}
              download={`Asset-QR-${item.assetTag}.png`}
              className="py-2 px-3 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PNG</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
