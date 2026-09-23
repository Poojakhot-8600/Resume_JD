'use client';

import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, UserCheck, Plus, Check, AlertCircle, X, ChevronLeft, ChevronRight, User, Trash, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { TimeSlot } from '@/types';

export default function CalendarPage() {
  // Mock initial slots
  const [slots, setSlots] = useState<TimeSlot[]>([
    {
      id: 'slot-1',
      date: '2026-07-16',
      startTime: '10:00',
      endTime: '11:00',
      type: 'Technical Interview',
      status: 'BOOKED',
      candidateName: 'Jane Doe',
      candidateEmail: 'jane.doe@example.com'
    },
    {
      id: 'slot-2',
      date: '2026-07-16',
      startTime: '14:00',
      endTime: '15:00',
      type: 'System Design',
      status: 'AVAILABLE'
    },
    {
      id: 'slot-3',
      date: '2026-07-17',
      startTime: '11:00',
      endTime: '12:00',
      type: 'HR Screening',
      status: 'AVAILABLE'
    },
    {
      id: 'slot-4',
      date: '2026-07-17',
      startTime: '15:30',
      endTime: '16:30',
      type: 'Technical Interview',
      status: 'BLOCKED'
    },
    {
      id: 'slot-5',
      date: '2026-07-18',
      startTime: '09:00',
      endTime: '10:00',
      type: 'Technical Interview',
      status: 'AVAILABLE'
    }
  ]);

  const [activeView, setActiveView] = useState<'admin' | 'candidate'>('admin');
  
  // Date states
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 6, 16)); // July 16, 2026
  const [selectedDateStr, setSelectedDateStr] = useState<string>('2026-07-16');

  // Form states (Admin)
  const [isAddingSlot, setIsAddingSlot] = useState(false);
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('10:00');
  const [newType, setNewType] = useState('Technical Interview');

  // Booking states (Candidate)
  const [selectedCandidate, setSelectedCandidate] = useState({ name: 'Alex Rivera', email: 'alex.rivera@example.com' });
  const [bookingSlotId, setBookingSlotId] = useState<string | null>(null);

  // Month navigation helpers
  const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstDayIndex = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // Slot Management handlers
  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    const newSlot: TimeSlot = {
      id: `slot-${Date.now()}`,
      date: selectedDateStr,
      startTime: newStartTime,
      endTime: newEndTime,
      type: newType,
      status: 'AVAILABLE'
    };
    setSlots([...slots, newSlot]);
    setIsAddingSlot(false);
  };

  const handleDeleteSlot = (id: string) => {
    setSlots(slots.filter(s => s.id !== id));
  };

  const handleBlockSlot = (id: string) => {
    setSlots(slots.map(s => s.id === id ? { ...s, status: s.status === 'BLOCKED' ? 'AVAILABLE' : 'BLOCKED' } : s));
  };

  const handleBookSlotConfirm = () => {
    if (!bookingSlotId) return;
    setSlots(slots.map(s => s.id === bookingSlotId ? {
      ...s,
      status: 'BOOKED',
      candidateName: selectedCandidate.name,
      candidateEmail: selectedCandidate.email
    } : s));
    setBookingSlotId(null);
  };

  // Get slots for currently selected date
  const selectedSlots = slots.filter(s => s.date === selectedDateStr).sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Render calendar grid helper
  const renderCalendarDays = () => {
    const totalDays = daysInMonth(currentDate);
    const startIdx = firstDayIndex(currentDate);
    const cells = [];

    // Fill preceding empty slots
    for (let i = 0; i < startIdx; i++) {
      cells.push(<div key={`empty-${i}`} className="h-24 bg-neutral-50/50 border border-neutral-100" />);
    }

    // Fill days of the month
    for (let day = 1; day <= totalDays; day++) {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dateKey = `${year}-${month}-${dayStr}`;
      
      const daySlots = slots.filter(s => s.date === dateKey);
      const isSelected = dateKey === selectedDateStr;

      const availableCount = daySlots.filter(s => s.status === 'AVAILABLE').length;
      const bookedCount = daySlots.filter(s => s.status === 'BOOKED').length;

      cells.push(
        <button
          key={`day-${day}`}
          onClick={() => setSelectedDateStr(dateKey)}
          className={`h-24 p-2 border border-neutral-100 flex flex-col justify-between items-start cursor-pointer hover:bg-neutral-50/50 transition-colors relative ${
            isSelected ? 'bg-indigo-50/30 border-indigo-200' : 'bg-white'
          }`}
        >
          <span className={`text-xs font-bold ${
            isSelected ? 'h-6 w-6 flex items-center justify-center bg-indigo-600 text-white rounded-full' : 'text-neutral-700'
          }`}>
            {day}
          </span>

          {daySlots.length > 0 && (
            <div className="space-y-1 w-full text-left">
              {availableCount > 0 && (
                <div className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded-sm truncate">
                  {availableCount} Open
                </div>
              )}
              {bookedCount > 0 && (
                <div className="text-[9px] font-bold text-indigo-800 bg-indigo-50 px-1.5 py-0.5 rounded-sm truncate">
                  {bookedCount} Booked
                </div>
              )}
            </div>
          )}
        </button>
      );
    }

    return cells;
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-4 py-8">
      {/* Top Banner and Toggle View */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-xs">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-neutral-900">Custom Interview Scheduler</h2>
          <p className="text-sm text-neutral-500 font-medium">Manage corporate availability and simulate candidate slot bookings.</p>
        </div>
        <div className="flex bg-neutral-100 p-1.5 rounded-lg border border-neutral-200 shrink-0">
          <button
            onClick={() => { setActiveView('admin'); setBookingSlotId(null); }}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeView === 'admin' ? 'bg-white text-neutral-950 font-bold shadow-xs' : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            Admin View
          </button>
          <button
            onClick={() => { setActiveView('candidate'); setBookingSlotId(null); }}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeView === 'candidate' ? 'bg-white text-neutral-950 font-bold shadow-xs' : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            Candidate Booking View
          </button>
        </div>
      </div>

      {activeView === 'candidate' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-900 text-xs">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="space-y-1">
            <span className="font-bold">Simulating Candidate Booking Experience:</span>
            <p className="font-normal text-amber-800/90 leading-relaxed">
              Below, select a mock candidate profile to test the booking page. Click any **AVAILABLE (Open)** slot on the calendar side-panel to assign that slot to the candidate.
            </p>
            <div className="flex items-center gap-4 mt-2 bg-white/60 p-2 rounded-lg border border-amber-200/50 max-w-md">
              <span className="font-semibold">Mock Candidate:</span>
              <select
                value={selectedCandidate.name}
                onChange={(e) => {
                  const name = e.target.value;
                  const email = name.includes('Jane') ? 'jane.doe@example.com' : 'alex.rivera@example.com';
                  setSelectedCandidate({ name, email });
                }}
                className="bg-transparent font-bold focus:outline-none border-b border-amber-400 pb-0.5 text-neutral-900"
              >
                <option value="Alex Rivera">Alex Rivera (alex.rivera@example.com)</option>
                <option value="Jane Doe">Jane Doe (jane.doe@example.com)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Calendar left, slots details right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Calendar Grid (Col Span 2) */}
        <div className="lg:col-span-2 bg-white border border-neutral-200/80 rounded-2xl overflow-hidden shadow-xs">
          {/* Calendar Header */}
          <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-indigo-600" />
              <h3 className="font-bold text-neutral-800 text-base">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h3>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-neutral-100 rounded-lg border border-neutral-200 text-neutral-600 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-neutral-100 rounded-lg border border-neutral-200 text-neutral-600 cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 border-b border-neutral-100 bg-neutral-50/50 text-center py-2 text-xs font-bold text-neutral-500">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Days Cell Grid */}
          <div className="grid grid-cols-7">
            {renderCalendarDays()}
          </div>
        </div>

        {/* Slots Side-Panel (Col Span 1) */}
        <div className="space-y-6">
          
          {/* Day Details Card */}
          <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-neutral-400">Selected Date</span>
                <h4 className="text-sm font-bold text-neutral-900">{selectedDateStr}</h4>
              </div>
              
              {activeView === 'admin' && (
                <Button
                  onClick={() => setIsAddingSlot(true)}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 font-bold h-8 py-1.5"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Slot
                </Button>
              )}
            </div>

            {/* Time Slot Add Form (Modal inline) */}
            {isAddingSlot && activeView === 'admin' && (
              <form onSubmit={handleAddSlot} className="p-4 border border-indigo-100 bg-indigo-50/20 rounded-xl space-y-4 animate-fade-in">
                <div className="flex justify-between items-center pb-2 border-b border-neutral-200/50">
                  <span className="text-xs font-bold text-neutral-800">New Available Block</span>
                  <button type="button" onClick={() => setIsAddingSlot(false)} className="text-neutral-400 hover:text-neutral-800">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="font-semibold text-neutral-500 block mb-1">Start Time</label>
                    <input
                      type="time"
                      value={newStartTime}
                      onChange={(e) => setNewStartTime(e.target.value)}
                      className="w-full p-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-neutral-500 block mb-1">End Time</label>
                    <input
                      type="time"
                      value={newEndTime}
                      onChange={(e) => setNewEndTime(e.target.value)}
                      className="w-full p-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-500 block mb-1">Interview Round Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full p-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                  >
                    <option value="Technical Interview">Technical Interview</option>
                    <option value="System Design">System Design</option>
                    <option value="HR Screening">HR Screening</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 font-bold flex-1 h-8 py-1.5">
                    Save Slot
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsAddingSlot(false)} className="flex-1 h-8 py-1.5">
                    Cancel
                  </Button>
                </div>
              </form>
            )}

            {/* Slots List */}
            <div className="space-y-4">
              {selectedSlots.length === 0 ? (
                <div className="py-10 text-center border border-dashed border-neutral-200 rounded-xl">
                  <Clock className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
                  <p className="text-xs text-neutral-400 font-medium">No slots created for this date.</p>
                </div>
              ) : (
                selectedSlots.map((slot) => {
                  const isSlotBooked = slot.status === 'BOOKED';
                  const isSlotBlocked = slot.status === 'BLOCKED';
                  const isSlotAvailable = slot.status === 'AVAILABLE';

                  return (
                    <div
                      key={slot.id}
                      className={`border rounded-xl p-4 space-y-3 relative overflow-hidden ${
                        isSlotBooked
                          ? 'border-indigo-100 bg-indigo-50/20'
                          : isSlotBlocked
                          ? 'border-neutral-200 bg-neutral-50/50'
                          : 'border-emerald-100 bg-emerald-50/10'
                      }`}
                    >
                      {/* Top Row: Time & Pill */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                          <Clock className="h-3.5 w-3.5 text-neutral-400" />
                          <span>{slot.startTime} - {slot.endTime}</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            isSlotBooked
                              ? 'bg-indigo-100 border-indigo-200 text-indigo-800'
                              : isSlotBlocked
                              ? 'bg-neutral-100 border-neutral-200 text-neutral-600'
                              : 'bg-emerald-100 border-emerald-200 text-emerald-800'
                          }`}
                        >
                          {slot.status}
                        </span>
                      </div>

                      {/* Middle: Details */}
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-neutral-900">{slot.type}</div>
                        {isSlotBooked && slot.candidateName && (
                          <div className="flex items-center gap-1.5 text-xs text-neutral-600 bg-white/80 p-2 rounded-lg border border-indigo-100/50">
                            <User className="h-3.5 w-3.5 text-indigo-500" />
                            <div className="font-sans leading-none">
                              <span className="font-bold block">{slot.candidateName}</span>
                              <span className="text-[10px] text-neutral-400">{slot.candidateEmail}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Admin Actions */}
                      {activeView === 'admin' && (
                        <div className="flex gap-2 pt-2 border-t border-neutral-100/60 text-xs">
                          <button
                            type="button"
                            onClick={() => handleBlockSlot(slot.id)}
                            className="text-neutral-500 hover:text-neutral-800 font-semibold cursor-pointer"
                          >
                            {isSlotBlocked ? 'Unblock' : 'Block Slot'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSlot(slot.id)}
                            className="text-red-500 hover:text-red-800 font-semibold ml-auto flex items-center gap-0.5 cursor-pointer"
                          >
                            <Trash className="h-3 w-3" /> Remove
                          </button>
                        </div>
                      )}

                      {/* Candidate Actions */}
                      {activeView === 'candidate' && isSlotAvailable && (
                        <div className="pt-1">
                          <Button
                            onClick={() => setBookingSlotId(slot.id)}
                            size="sm"
                            className="w-full bg-emerald-600 hover:bg-emerald-700 font-bold h-8 py-1.5"
                          >
                            Book This Slot
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Booking Confirmation Dialog (Modal) */}
      {bookingSlotId && (
        <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 max-w-md w-full mx-4 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-emerald-600">
              <div className="h-8 w-8 bg-emerald-100 rounded-full flex items-center justify-center">
                <Check className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-neutral-900 text-lg">Confirm Slot Booking</h3>
            </div>
            
            <p className="text-xs text-neutral-500 leading-relaxed font-medium">
              You are about to book this interview slot. A confirmation email and Calendar Invite containing the Video link will be dispatched.
            </p>

            <div className="p-3.5 bg-neutral-50 border border-neutral-200/80 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-400 font-semibold">Candidate Name:</span>
                <span className="font-bold text-neutral-800">{selectedCandidate.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400 font-semibold">Email:</span>
                <span className="font-bold text-neutral-800">{selectedCandidate.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400 font-semibold">Date & Time:</span>
                <span className="font-bold text-neutral-800">{selectedDateStr}</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-indigo-600 font-bold pt-1.5 border-t border-neutral-200/60">
                <Video className="h-3.5 w-3.5" /> Google Meet Link Generated
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleBookSlotConfirm}
                className="bg-emerald-600 hover:bg-emerald-700 font-bold flex-1"
              >
                Confirm & Book
              </Button>
              <Button
                variant="outline"
                onClick={() => setBookingSlotId(null)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
