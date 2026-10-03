import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CaseItem, CaseStatus } from '../../types';
import { SeverityBadge } from '../common/SeverityBadge';
import { StatusBadge } from '../common/StatusBadge';
import { Timeline } from '../common/Timeline';
import { EvidenceCard } from '../cards/EvidenceCard';
import { Button } from '../ui/button';
import { Select } from '../ui/select';
import { Input } from '../ui/input';
import { formatTimestamp } from '../../utils/formatters';
import {
  X,
  ExternalLink,
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  ShieldAlert,
  FolderKanban,
} from 'lucide-react';
import { cn } from '../../utils/classNames';

export interface CaseDrawerProps {
  caseItem: CaseItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus?: (id: string, status: CaseStatus, note?: string) => Promise<any>;
  onAssign?: (id: string, assignee: string) => Promise<any>;
  onAddNote?: (id: string, note: string) => Promise<any>;
}

export function CaseDrawer({
  caseItem,
  isOpen,
  onClose,
  onUpdateStatus,
  onAssign,
  onAddNote,
}: CaseDrawerProps) {
  const navigate = useNavigate();
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !caseItem) return null;

  const handleStatusChange = async (newStatus: CaseStatus) => {
    if (!onUpdateStatus) return;
    setIsSubmitting(true);
    try {
      await onUpdateStatus(
        caseItem.id,
        newStatus,
        `Status transitioned to ${newStatus}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignChange = async (newAssignee: string) => {
    if (!onAssign) return;
    setIsSubmitting(true);
    try {
      await onAssign(caseItem.id, newAssignee);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !onAddNote) return;
    setIsSubmitting(true);
    try {
      await onAddNote(caseItem.id, newNote.trim());
      setNewNote('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-white border-l border-slate-200 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded bg-blue-100 text-[#0F52BA] flex items-center justify-center shrink-0">
                <FolderKanban className="w-4 h-4" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 font-mono">
                    Case #{caseItem.id}
                  </h3>
                  <SeverityBadge severity={caseItem.severity} size="sm" />
                  <StatusBadge status={caseItem.status} size="sm" />
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {caseItem.consumerName} ({caseItem.consumerId}) • Meter {caseItem.meterId}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                icon={<ExternalLink className="w-3.5 h-3.5" />}
                onClick={() => {
                  navigate(`/consumers/${caseItem.consumerId}`);
                  onClose();
                }}
              >
                Consumer Profile
              </Button>
              <button
                onClick={onClose}
                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Quick Status and Priority Card */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Investigation Actions
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      variant={caseItem.status === 'Confirmed' ? 'primary' : 'outline'}
                      size="sm"
                      disabled={isSubmitting || caseItem.status === 'Confirmed'}
                      onClick={() => handleStatusChange('Confirmed')}
                    >
                      Confirmed
                    </Button>
                    <Button
                      variant={caseItem.status === 'Under Review' ? 'secondary' : 'outline'}
                      size="sm"
                      disabled={isSubmitting || caseItem.status === 'Under Review'}
                      onClick={() => handleStatusChange('Under Review')}
                    >
                      Under Review
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isSubmitting || caseItem.status === 'False Positive'}
                      onClick={() => handleStatusChange('False Positive')}
                    >
                      False Positive
                    </Button>
                    <Button
                      variant={caseItem.status === 'Resolved' ? 'secondary' : 'outline'}
                      size="sm"
                      disabled={isSubmitting || caseItem.status === 'Resolved'}
                      onClick={() => handleStatusChange('Resolved')}
                    >
                      Resolved
                    </Button>
                  </div>
                </div>

                <div className="text-right sm:border-l sm:border-slate-200 sm:pl-4">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Risk Score
                  </span>
                  <span className="font-mono font-bold text-lg text-slate-900">
                    {caseItem.riskScore}/100
                  </span>
                </div>
              </div>

              {/* Assignee & Timestamp */}
              <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-slate-500" />
                  <span className="font-medium text-slate-700">Assignee:</span>
                  <Select
                    value={caseItem.assignee}
                    onChange={(e) => handleAssignChange(e.target.value)}
                    disabled={isSubmitting}
                    className="h-8 text-xs font-medium"
                  >
                    <option value="Ayush Sharma (Lead Analyst)">Ayush Sharma (Lead)</option>
                    <option value="Sarah Jenkins (Field Ops)">Sarah Jenkins (Field Ops)</option>
                    <option value="David K. (Revenue Protection)">David K. (Revenue Prot.)</option>
                    <option value="Field Inspection Team Alpha">Field Team Alpha</option>
                    <option value="Telecom Support">Telecom Support</option>
                    <option value="Unassigned">Unassigned</option>
                  </Select>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">
                  Opened {formatTimestamp(caseItem.createdAt)}
                </span>
              </div>
            </div>

            {/* Evidence Summary */}
            {caseItem.evidence && caseItem.evidence.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                  Flagged Detection Evidence
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {caseItem.evidence.map((ev) => (
                    <EvidenceCard key={ev.id} item={ev} />
                  ))}
                </div>
              </div>
            )}

            {/* Timeline */}
            <div>
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2.5">
                Audit Trail & Timeline
              </h4>
              <Timeline items={caseItem.timeline} />
            </div>

            {/* Add Note Form */}
            <form onSubmit={handleAddNote} className="space-y-2 pt-3 border-t border-slate-200">
              <label className="text-xs font-semibold text-slate-700 block">
                Add Investigation Log Entry
              </label>
              <div className="flex gap-2">
                <Input
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Record dispatch findings, physical test results, or notes..."
                  disabled={isSubmitting}
                  className="text-xs"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting || !newNote.trim()}
                  icon={<Send className="w-3.5 h-3.5" />}
                >
                  Save Note
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
