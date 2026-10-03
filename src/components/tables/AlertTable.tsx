import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertItem, AlertStatus } from '../../types';
import { SeverityBadge } from '../common/SeverityBadge';
import { StatusBadge } from '../common/StatusBadge';
import { RiskIndicator } from '../common/RiskIndicator';
import { formatTimestamp } from '../../utils/formatters';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { Select } from '../ui/select';
import { Input } from '../ui/input';
import { Timeline } from '../common/Timeline';
import { EvidenceCard } from '../cards/EvidenceCard';
import {
  ExternalLink,
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '../../utils/classNames';

export interface AlertTableProps {
  alerts: AlertItem[];
  isLoading?: boolean;
  onUpdateStatus?: (id: string, status: AlertStatus, note?: string) => Promise<any>;
  onAssign?: (id: string, assignee: string) => Promise<any>;
  onAddNote?: (id: string, note: string) => Promise<any>;
  className?: string;
  initialSelectedId?: string;
}

export function AlertTable({
  alerts,
  isLoading,
  onUpdateStatus,
  onAssign,
  onAddNote,
  className,
  initialSelectedId,
}: AlertTableProps) {
  const navigate = useNavigate();
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(() => {
    if (initialSelectedId) {
      return alerts.find((a) => a.id === initialSelectedId) || null;
    }
    return null;
  });

  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assigneeSelect, setAssigneeSelect] = useState('');

  const handleOpenCase = (alert: AlertItem) => {
    setSelectedAlert(alert);
    setAssigneeSelect(alert.assignee);
  };

  const handleStatusChange = async (newStatus: AlertStatus) => {
    if (!selectedAlert || !onUpdateStatus) return;
    setIsSubmitting(true);
    try {
      const updated = await onUpdateStatus(
        selectedAlert.id,
        newStatus,
        `Status transitioned to ${newStatus}`
      );
      setSelectedAlert(updated);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignChange = async (newAssignee: string) => {
    if (!selectedAlert || !onAssign) return;
    setAssigneeSelect(newAssignee);
    setIsSubmitting(true);
    try {
      const updated = await onAssign(selectedAlert.id, newAssignee);
      setSelectedAlert(updated);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlert || !newNote.trim() || !onAddNote) return;
    setIsSubmitting(true);
    try {
      const updated = await onAddNote(selectedAlert.id, newNote.trim());
      setSelectedAlert(updated);
      setNewNote('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className={cn('bg-white border border-slate-200 rounded-md overflow-hidden', className)}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3.5">Alert ID</th>
                <th className="py-3 px-3.5">Consumer & Facility</th>
                <th className="py-3 px-3.5">Meter ID</th>
                <th className="py-3 px-3.5">Severity</th>
                <th className="py-3 px-3.5">Likely Cause</th>
                <th className="py-3 px-3.5">Risk Score</th>
                <th className="py-3 px-3.5">Created At</th>
                <th className="py-3 px-3.5">Assignee</th>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                      Loading operational alerts...
                    </div>
                  </td>
                </tr>
              ) : alerts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500">
                    No matching alerts found in current view.
                  </td>
                </tr>
              ) : (
                alerts.map((al) => (
                  <tr
                    key={al.id}
                    onClick={() => handleOpenCase(al)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                  >
                    <td className="py-3 px-3.5">
                      <span className="font-mono font-bold text-slate-900 group-hover:text-[#0F52BA]">
                        {al.id}
                      </span>
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="font-semibold text-slate-900">{al.consumerName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{al.consumerId}</div>
                    </td>
                    <td className="py-3 px-3.5 font-mono text-slate-700">{al.meterId}</td>
                    <td className="py-3 px-3.5">
                      <SeverityBadge severity={al.severity} size="sm" />
                    </td>
                    <td className="py-3 px-3.5 font-medium text-slate-800">{al.cause}</td>
                    <td className="py-3 px-3.5">
                      <RiskIndicator score={al.riskScore} severity={al.severity} size="sm" />
                    </td>
                    <td className="py-3 px-3.5 text-slate-500 font-mono text-[11px]">
                      {formatTimestamp(al.createdAt)}
                    </td>
                    <td className="py-3 px-3.5 text-slate-700 font-medium">
                      {al.assignee}
                    </td>
                    <td className="py-3 px-3.5">
                      <StatusBadge status={al.status} size="sm" />
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenCase(al);
                        }}
                      >
                        Review Case
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Case Review Modal with Interactive Local Actions */}
      {selectedAlert && (
        <Modal
          isOpen={Boolean(selectedAlert)}
          onClose={() => setSelectedAlert(null)}
          title={`Case Investigation: ${selectedAlert.id}`}
          description={`Consumer: ${selectedAlert.consumerName} (${selectedAlert.consumerId}) • Meter: ${selectedAlert.meterId}`}
          size="xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant="ghost"
                size="sm"
                icon={<ExternalLink className="w-3.5 h-3.5" />}
                onClick={() => {
                  navigate(`/consumers/${selectedAlert.consumerId}`);
                  setSelectedAlert(null);
                }}
              >
                Go to Consumer Detail
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setSelectedAlert(null)}>
                Close
              </Button>
            </div>
          }
        >
          <div className="space-y-6">
            {/* Quick Status Control Bar */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                      Current Case Status
                    </span>
                    <StatusBadge status={selectedAlert.status} size="md" />
                  </div>
                  <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block" />
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                      Severity & Risk
                    </span>
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={selectedAlert.severity} size="sm" />
                      <span className="font-mono font-bold text-xs">
                        Risk {selectedAlert.riskScore}/100
                      </span>
                    </div>
                  </div>
                </div>

                {/* Operator Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isSubmitting || selectedAlert.status === 'Confirmed'}
                    icon={<CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />}
                    onClick={() => handleStatusChange('Confirmed')}
                  >
                    Confirm Anomaly
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isSubmitting || selectedAlert.status === 'Under Review'}
                    icon={<Clock className="w-3.5 h-3.5 text-amber-600" />}
                    onClick={() => handleStatusChange('Under Review')}
                  >
                    Under Review
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isSubmitting || selectedAlert.status === 'False Positive'}
                    icon={<XCircle className="w-3.5 h-3.5 text-slate-500" />}
                    onClick={() => handleStatusChange('False Positive')}
                  >
                    Mark False Positive
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isSubmitting || selectedAlert.status === 'Resolved'}
                    icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    onClick={() => handleStatusChange('Resolved')}
                  >
                    Resolve Case
                  </Button>
                </div>
              </div>

              {/* Assignee Selection */}
              <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-slate-500" />
                  <span className="font-medium text-slate-700">Assigned Investigator:</span>
                  <Select
                    value={assigneeSelect}
                    onChange={(e) => handleAssignChange(e.target.value)}
                    disabled={isSubmitting}
                    className="h-8 text-xs font-medium"
                  >
                    <option value="Ayush Sharma (Lead Analyst)">Ayush Sharma (Lead Analyst)</option>
                    <option value="Sarah Jenkins (Field Ops)">Sarah Jenkins (Field Ops)</option>
                    <option value="David K. (Revenue Protection)">David K. (Revenue Protection)</option>
                    <option value="Field Inspection Team Alpha">Field Inspection Team Alpha</option>
                    <option value="Telecom Support">Telecom Support</option>
                    <option value="Unassigned">Unassigned</option>
                  </Select>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">
                  Reported: {formatTimestamp(selectedAlert.createdAt)}
                </span>
              </div>
            </div>

            {/* Evidence Summary Cards */}
            {selectedAlert.evidence && selectedAlert.evidence.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                  Model Evidence Records
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedAlert.evidence.map((ev) => (
                    <EvidenceCard key={ev.id} item={ev} />
                  ))}
                </div>
              </div>
            )}

            {/* Case Audit Timeline */}
            <div>
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2.5">
                Investigation Audit Trail & Timeline
              </h4>
              <Timeline items={selectedAlert.timeline} />
            </div>

            {/* Add Note Form */}
            <form onSubmit={handleAddNote} className="space-y-2 pt-2 border-t border-slate-200">
              <label className="text-xs font-semibold text-slate-700 block">
                Add Operational Investigation Note
              </label>
              <div className="flex gap-2">
                <Input
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Enter field inspection notes, physical meter seal test result, or remarks..."
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
                  Post Note
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </>
  );
}
