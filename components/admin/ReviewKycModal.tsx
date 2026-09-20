import { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  FileText, 
  User, 
  Calendar, 
  MapPin, 
  CreditCard, 
  ZoomIn, 
  Download, 
  Send,
  Eye,
  Check,
  ExternalLink,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export interface KycDocument {
  id: string;
  type: 'passport' | 'national_id' | 'drivers_license';
  documentNumber: string;
  issuingCountry: string;
  expiryDate: string;
  frontUrl?: string;
  backUrl?: string;
  selfieUrl?: string;
  proofOfAddressUrl?: string;
}

export interface KycData {
  fullName: string;
  dateOfBirth: string;
  nationality: string;
  residentialAddress: {
    street: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  document: KycDocument;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  adminNotes?: string;
  rejectionReason?: string;
}

interface ReviewKycModalProps {
  user: any;
  onUpdateStatus: (
    userId: string, 
    newStatus: 'verified' | 'pending' | 'rejected', 
    kycUpdate: Partial<KycData>
  ) => void;
  onClose: () => void;
}

const REJECTION_TEMPLATES = [
  'Document photo is blurry or unreadable',
  'ID document has expired',
  'Legal name on ID does not match account name',
  'Selfie photo does not clearly match ID document',
  'Proof of address document is older than 3 months',
  'Document corners are cut off or partially obscured'
];

export default function ReviewKycModal({ user, onUpdateStatus, onClose }: ReviewKycModalProps) {
  const kycData: KycData = user.kyc_data || {
    fullName: user.fullName || user.email?.split('@')[0] || 'Unknown User',
    dateOfBirth: '1994-06-18',
    nationality: 'United States',
    residentialAddress: {
      street: '742 Evergreen Terrace',
      city: 'Springfield',
      state: 'OR',
      postalCode: '97477',
      country: 'United States'
    },
    document: {
      id: 'doc_' + user.id,
      type: 'passport',
      documentNumber: 'P83921049',
      issuingCountry: 'United States',
      expiryDate: '2029-11-20'
    },
    submittedAt: user.created_at || new Date().toISOString()
  };

  const [currentStatus, setCurrentStatus] = useState<'verified' | 'pending' | 'rejected'>(
    user.kyc_status === 'verified' || user.kyc_status === 'rejected' ? user.kyc_status : 'pending'
  );
  const [adminNotes, setAdminNotes] = useState(kycData.adminNotes || '');
  const [rejectionReason, setRejectionReason] = useState(kycData.rejectionReason || '');
  const [selectedAction, setSelectedAction] = useState<'verified' | 'rejected' | 'pending' | null>(null);
  const [previewImage, setPreviewImage] = useState<{ title: string; url: string; subtitle?: string } | null>(null);
  const [notifyUser, setNotifyUser] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fallback high-resolution preview cards if URLs are mock strings
  const frontDocUrl = kycData.document?.frontUrl || 
    'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80';
  const backDocUrl = kycData.document?.backUrl || 
    'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80';
  const selfieUrl = kycData.document?.selfieUrl || 
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80';
  const proofOfAddressUrl = kycData.document?.proofOfAddressUrl || 
    'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80';

  const handleSaveDecision = (decision: 'verified' | 'rejected' | 'pending') => {
    if (decision === 'rejected' && !rejectionReason.trim()) {
      alert('Please select or provide a rejection reason before rejecting KYC.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      onUpdateStatus(user.id, decision, {
        fullName: kycData.fullName,
        dateOfBirth: kycData.dateOfBirth,
        nationality: kycData.nationality,
        residentialAddress: kycData.residentialAddress,
        document: kycData.document,
        submittedAt: kycData.submittedAt,
        reviewedAt: new Date().toISOString(),
        reviewedBy: 'Super Admin',
        adminNotes: adminNotes.trim(),
        rejectionReason: decision === 'rejected' ? rejectionReason.trim() : undefined
      });
      setIsSubmitting(false);
      onClose();
    }, 400);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 z-50 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-semibold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">KYC Verification Review</h2>
                <Badge
                  variant={
                    currentStatus === 'verified'
                      ? 'default'
                      : currentStatus === 'pending'
                      ? 'secondary'
                      : 'destructive'
                  }
                  className="capitalize font-medium"
                >
                  {currentStatus}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                User: <span className="font-mono font-medium text-gray-700 dark:text-gray-300">{user.email}</span> • ID: <span className="font-mono">{user.id}</span>
              </p>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6">
          {/* Status Alert Banner */}
          {currentStatus === 'pending' && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">
                  Pending Verification
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  This user submitted their identity documents for review. Verify the information matches the submitted documents below before updating status.
                </p>
              </div>
            </div>
          )}

          {currentStatus === 'verified' && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">
                  KYC Verified
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                  This user has met identity requirements. Verified on {kycData.reviewedAt ? new Date(kycData.reviewedAt).toLocaleDateString() : 'earlier date'}.
                </p>
              </div>
            </div>
          )}

          {currentStatus === 'rejected' && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 rounded-xl flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-900 dark:text-red-300">
                  Verification Rejected
                </p>
                <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
                  Reason: {kycData.rejectionReason || rejectionReason || 'Documents did not meet criteria.'}
                </p>
              </div>
            </div>
          )}

          {/* Grid of User Details & Document Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Personal Details */}
            <div className="bg-gray-50 dark:bg-gray-800/60 p-4 rounded-xl border border-gray-200/70 dark:border-gray-700/60">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                <User className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Personal Information</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Legal Name</span>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm mt-0.5">{kycData.fullName}</p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Date of Birth</span>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm mt-0.5">{kycData.dateOfBirth}</p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Nationality</span>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm mt-0.5">{kycData.nationality}</p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Submitted Date</span>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm mt-0.5">
                    {new Date(kycData.submittedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500 dark:text-gray-400">Residential Address</span>
                  <p className="font-medium text-gray-900 dark:text-white mt-0.5">
                    {kycData.residentialAddress.street}, {kycData.residentialAddress.city},{' '}
                    {kycData.residentialAddress.state ? `${kycData.residentialAddress.state}, ` : ''}
                    {kycData.residentialAddress.postalCode}, {kycData.residentialAddress.country}
                  </p>
                </div>
              </div>
            </div>

            {/* Document Info */}
            <div className="bg-gray-50 dark:bg-gray-800/60 p-4 rounded-xl border border-gray-200/70 dark:border-gray-700/60">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                <CreditCard className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Document Metadata</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Document Type</span>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm mt-0.5 capitalize">
                    {kycData.document.type.replace('_', ' ')}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Document Number</span>
                  <p className="font-mono font-semibold text-gray-900 dark:text-white text-sm mt-0.5">
                    {kycData.document.documentNumber}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Issuing Country</span>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm mt-0.5">
                    {kycData.document.issuingCountry}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Expiration Date</span>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm mt-0.5">
                    {kycData.document.expiryDate}
                  </p>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500 dark:text-gray-400">Document Status</span>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium">Valid / Not expired</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submitted Document Proofs Gallery */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Submitted Document Proofs (Click to Enlarge)
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">4 documents provided</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Document Front */}
              <div 
                onClick={() => setPreviewImage({ title: 'Front of Document', url: frontDocUrl, subtitle: `${kycData.document.type.replace('_', ' ').toUpperCase()} • ${kycData.document.documentNumber}` })}
                className="group relative cursor-pointer rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 transition-all hover:ring-2 hover:ring-purple-500"
              >
                <div className="h-32 w-full overflow-hidden bg-gray-900 flex items-center justify-center">
                  <img 
                    src={frontDocUrl} 
                    alt="Document Front" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" 
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <ZoomIn className="w-6 h-6 drop-shadow-md" />
                  </div>
                </div>
                <div className="p-2 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 text-center">
                  <p className="text-xs font-semibold text-gray-900 dark:text-white">ID Front</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">Government ID</p>
                </div>
              </div>

              {/* Document Back */}
              <div 
                onClick={() => setPreviewImage({ title: 'Back of Document', url: backDocUrl, subtitle: 'Barcode & Security Elements' })}
                className="group relative cursor-pointer rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 transition-all hover:ring-2 hover:ring-purple-500"
              >
                <div className="h-32 w-full overflow-hidden bg-gray-900 flex items-center justify-center">
                  <img 
                    src={backDocUrl} 
                    alt="Document Back" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" 
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <ZoomIn className="w-6 h-6 drop-shadow-md" />
                  </div>
                </div>
                <div className="p-2 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 text-center">
                  <p className="text-xs font-semibold text-gray-900 dark:text-white">ID Back</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">Barcode & details</p>
                </div>
              </div>

              {/* Selfie */}
              <div 
                onClick={() => setPreviewImage({ title: 'Facial Biometric / Selfie', url: selfieUrl, subtitle: 'User holding identification card' })}
                className="group relative cursor-pointer rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 transition-all hover:ring-2 hover:ring-purple-500"
              >
                <div className="h-32 w-full overflow-hidden bg-gray-900 flex items-center justify-center">
                  <img 
                    src={selfieUrl} 
                    alt="Selfie with ID" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" 
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <ZoomIn className="w-6 h-6 drop-shadow-md" />
                  </div>
                </div>
                <div className="p-2 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 text-center">
                  <p className="text-xs font-semibold text-gray-900 dark:text-white">Selfie with ID</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">Live facial match</p>
                </div>
              </div>

              {/* Proof of Address */}
              <div 
                onClick={() => setPreviewImage({ title: 'Proof of Address', url: proofOfAddressUrl, subtitle: 'Utility Bill / Bank Statement' })}
                className="group relative cursor-pointer rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 transition-all hover:ring-2 hover:ring-purple-500"
              >
                <div className="h-32 w-full overflow-hidden bg-gray-900 flex items-center justify-center">
                  <img 
                    src={proofOfAddressUrl} 
                    alt="Proof of Address" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" 
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <ZoomIn className="w-6 h-6 drop-shadow-md" />
                  </div>
                </div>
                <div className="p-2 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 text-center">
                  <p className="text-xs font-semibold text-gray-900 dark:text-white">Proof of Address</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">Utility / Bank stmt</p>
                </div>
              </div>
            </div>
          </div>

          {/* Admin Decision Section */}
          <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/70 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Admin Verification Decision
            </h3>

            {/* Decision Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button
                type="button"
                variant={selectedAction === 'verified' ? 'default' : 'outline'}
                className={`flex items-center justify-center gap-2 h-11 ${
                  selectedAction === 'verified'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                }`}
                onClick={() => {
                  setSelectedAction('verified');
                  setCurrentStatus('verified');
                }}
              >
                <CheckCircle2 className="w-4 h-4" />
                Approve & Verify
              </Button>

              <Button
                type="button"
                variant={selectedAction === 'rejected' ? 'default' : 'outline'}
                className={`flex items-center justify-center gap-2 h-11 ${
                  selectedAction === 'rejected'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40'
                }`}
                onClick={() => {
                  setSelectedAction('rejected');
                  setCurrentStatus('rejected');
                }}
              >
                <XCircle className="w-4 h-4" />
                Reject Verification
              </Button>

              <Button
                type="button"
                variant={selectedAction === 'pending' ? 'default' : 'outline'}
                className={`flex items-center justify-center gap-2 h-11 ${
                  selectedAction === 'pending'
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                }`}
                onClick={() => {
                  setSelectedAction('pending');
                  setCurrentStatus('pending');
                }}
              >
                <Clock className="w-4 h-4" />
                Request Resubmission
              </Button>
            </div>

            {/* Rejection Reasons Options if Rejected */}
            {(selectedAction === 'rejected' || currentStatus === 'rejected') && (
              <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700 animate-in fade-in">
                <Label className="text-xs font-semibold text-red-700 dark:text-red-400">
                  Select Rejection Reason (Required)
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {REJECTION_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl}
                      type="button"
                      onClick={() => setRejectionReason(tmpl)}
                      className={`text-left p-2 rounded-lg text-xs transition-colors border ${
                        rejectionReason === tmpl
                          ? 'bg-red-100 dark:bg-red-950/60 border-red-400 text-red-900 dark:text-red-200 font-medium'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-red-300'
                      }`}
                    >
                      {tmpl}
                    </button>
                  ))}
                </div>
                <Input
                  placeholder="Or enter custom rejection reason..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="text-xs mt-2"
                />
              </div>
            )}

            {/* Admin Internal Notes */}
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs text-gray-600 dark:text-gray-400">
                Admin Review Notes / Compliance Logs
              </Label>
              <Textarea
                placeholder="Add private compliance notes regarding this verification (e.g. checked sanctions list, matched DOB against official registry)..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={2}
                className="text-xs"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/80 flex items-center justify-between">
          <div className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
            Status will be updated instantly and logged in user activities.
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              disabled={isSubmitting}
              className="bg-purple-600 hover:bg-purple-700 text-white min-w-[140px]"
              onClick={() => handleSaveDecision(currentStatus)}
            >
              {isSubmitting ? (
                'Saving...'
              ) : (
                <>
                  <Send className="w-4 h-4 mr-1.5" />
                  Save Decision
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Image Zoom Lightbox */}
      {previewImage && (
        <div 
          className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center p-4 z-[60] animate-in fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl w-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-full flex items-center justify-between text-white mb-3">
              <div>
                <h3 className="font-semibold text-lg">{previewImage.title}</h3>
                {previewImage.subtitle && (
                  <p className="text-xs text-gray-400">{previewImage.subtitle}</p>
                )}
              </div>
              <button 
                onClick={() => setPreviewImage(null)} 
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden max-h-[75vh] bg-gray-950 flex items-center justify-center shadow-2xl border border-white/10">
              <img 
                src={previewImage.url} 
                alt={previewImage.title} 
                className="max-h-[75vh] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
