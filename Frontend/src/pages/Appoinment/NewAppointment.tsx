import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { X, } from 'lucide-react';

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewAppointmentModal({ isOpen, onClose }: NewAppointmentModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="bg-white w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-xl">
        <CardHeader className="pb-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-bold text-gray-900">
              New Appointment
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="hover:bg-gray-100 rounded-full p-2"
            >
              <X className="w-5 h-5 text-gray-600" />
            </Button>
          </div>
        </CardHeader>
        
<CardContent className="pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Form */}
            <div className="space-y-4">
              {/* Client Search */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Client
                </label>
                <div className="relative">
                  <Input
                    placeholder="Search..."
                    className="bg-gray-50 border-0 rounded py-2 text-sm text-gray-700 pr-8"
                  />
                  <button className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    +
                  </button>
                </div>
              </div>

              {/* Service */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Service
                </label>
                <div className="relative">
                  <Input
                    value="Basic Cut"
                    className="bg-gray-50 border-0 rounded py-2 text-sm text-gray-900 font-medium pr-8"
                    readOnly
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">▼</span>
                </div>
              </div>

              {/* Stylist */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Stylist
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      value="C, Anita"
                      className="bg-gray-50 border-0 rounded py-2 text-sm text-gray-900 font-medium pr-8"
                      readOnly
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">▼</span>
                  </div>
                  <div className="text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded min-w-[60px] text-center">
                    30min
                  </div>
                </div>
              </div>

              {/* When */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  When
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    value="Thu,Nov 2"
                    className="bg-gray-50 border-0 rounded py-2 text-sm text-gray-900 font-medium flex-1"
                    readOnly
                  />
                  <Input
                    value="10:00"
                    className="bg-gray-50 border-0 rounded py-2 text-sm text-gray-900 font-medium w-20"
                    readOnly
                  />
                </div>
              </div>

              {/* Schedule Button */}
              <Button className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-2.5 rounded text-sm font-medium transition-all duration-200">
                Schedule
              </Button>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Notes
                </label>
                <textarea
                  className="w-full h-16 p-2.5 bg-gray-50 border-0 rounded resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-700"
                  placeholder=""
                />
              </div>
            </div>

            {/* Right Column - Calendar */}
            <div className="bg-gray-50 rounded-lg p-4">
              {/* Calendar Header */}
              <div className="grid grid-cols-6 gap-2 mb-3">
                {['Mon\nOct', 'Wed\nNov 1', 'Thu\nNov', 'Fri\nNov', 'Sat\nNov', 'Sun\nNov'].map((day, i) => (
                  <div key={i} className="text-center">
                    <div className="text-[10px] font-medium text-gray-600 leading-tight whitespace-pre-line">
                      {day}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Time Slots */}
              <div className="space-y-2">
                {['09:00', '10:00', '11:00', '12:00', '11:00', '12:00'].map((time, timeIdx) => (
                  <div key={timeIdx} className="flex items-start gap-2">
                    <div className="w-10 text-[10px] font-medium text-gray-600 pt-1">{time}</div>
                    <div className="flex-1 grid grid-cols-6 gap-2">
                      {[0, 1, 2, 3, 4, 5].map((dayIdx) => {
                        // Mostrar el bloque de "Basic Cut" en la posición correcta
                        const isAppointmentStart = timeIdx === 2 && dayIdx === 1;
                        const isAppointmentMiddle = timeIdx === 3 && dayIdx === 1;
                        const isAppointmentEnd = timeIdx === 4 && dayIdx === 1;
                        
                        if (isAppointmentStart) {
                          return (
                            <div
                              key={dayIdx}
                              className="row-span-3 bg-indigo-500 rounded p-1.5 text-white"
                              style={{ gridRow: 'span 3' }}
                            >
                              <div className="text-[10px] font-medium leading-tight">Basic Cut</div>
                              <div className="text-[9px] opacity-90">Anita</div>
                            </div>
                          );
                        }
                        
                        if (isAppointmentMiddle || isAppointmentEnd) {
                          return null;
                        }
                        
                        return (
                          <div
                            key={dayIdx}
                            className="h-8 rounded bg-white border border-gray-200 hover:bg-gray-100 cursor-pointer"
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}