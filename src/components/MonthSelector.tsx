import React from 'react';
import { Calendar, CheckCircle, Clock, Edit } from 'lucide-react';
import { MonthInfo, getMonthStatus } from '../utils/monthlySystem';

interface MonthSelectorProps {
  availableMonths: MonthInfo[];
  selectedMonth: string;
  onMonthChange: (monthId: string) => void;
  showStatus?: boolean;
}

const MonthSelector: React.FC<MonthSelectorProps> = ({
  availableMonths,
  selectedMonth,
  onMonthChange,
  showStatus = true
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'past':
        return <Edit className="h-4 w-4" />; // Changed from Lock to Edit
      case 'current':
        return <CheckCircle className="h-4 w-4" />;
      case 'future':
        return <Clock className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-red-600" />
          Select Month
        </h3>
      </div>
      <div className="p-6">
        <div className="max-w-md">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Month & Year
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
          >
            {availableMonths.map((month) => {
              const monthId = `${month.year}-${month.month.toString().padStart(2, '0')}`;
              const status = getMonthStatus(month);
              
              return (
                <option key={monthId} value={monthId}>
                  {month.monthName} {showStatus ? `(${status.statusText})` : ''}
                </option>
              );
            })}
          </select>
          
          {showStatus && (
            <div className="mt-3 space-y-2">
              <div className="text-sm text-gray-600">
                <strong>Month Status:</strong>
              </div>
              <div className="flex items-center space-x-4 text-xs">
                <div className="flex items-center">
                  <Edit className="h-3 w-3 text-blue-600 mr-1" />
                  <span className="text-gray-600">Past (Editable)</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-3 w-3 text-green-600 mr-1" />
                  <span className="text-gray-600">Current (Active)</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-3 w-3 text-purple-600 mr-1" />
                  <span className="text-gray-600">Future (Planning)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MonthSelector;