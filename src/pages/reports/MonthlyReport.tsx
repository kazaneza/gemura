Here's the fixed version with all missing closing brackets and tags added:

```typescript
import React, { useState, useEffect } from 'react';
import { Calendar, Download, FileText, Printer } from 'lucide-react';
import { purchasesAPI, productionAPI, indirectCostsAPI } from '../../services/api';
import MonthSelector from '../../components/MonthSelector';
import { generateAvailableMonths, getCurrentMonth, getMonthId, parseMonthId } from '../../utils/monthlySystem';
import { exportToPDF } from '../../utils/pdfExport';

const MonthlyReport: React.FC = () => {
  // ... [all the existing code remains the same until the closing tags] ...

      {/* Indirect Costs Breakdown - Minimalistic */}
      {/* Overheads Breakdown - Minimalistic */}
      {indirectCostsBreakdown.details.length > 0 && (
        <div className="bg-white border rounded-lg print-section" id="indirect-costs">
          <div className="bg-white border rounded-lg print-section" id="overheads">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Overheads</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4 font-medium">Code</th>
                      <th className="text-left py-3 px-4 font-medium">Overheads</th>
                      <th className="text-right py-3 px-4 font-medium">Overheads RWF</th>
                      <th className="text-right py-3 px-4 font-medium">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {indirectCostsBreakdown.details.map((cost: any, index: number) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{cost.code || ''}</td>
                        <td className="py-3 px-4">{cost.category}</td>
                        <td className="py-3 px-4 text-right">{cost.amount.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right">{cost.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-bold">
                      <td className="py-3 px-4" colSpan={2}>Total Overhead Production costs</td>
                      <td className="py-3 px-4 text-right">{indirectCostsBreakdown.totalAmount.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              
              {/* Overhead Cost per Meal Calculation */}
              <div className="mt-6 bg-blue-50 rounded-lg p-4">
                <div className="text-center">
                  <div className="text-sm text-blue-600 font-medium mb-2">Overhead Cost per Meal</div>
                  <div className="text-3xl font-bold text-blue-900 mb-2">
                    RWF {Math.round(indirectCostsBreakdown.costPerMeal).toLocaleString()}
                  </div>
                  <div className="text-sm text-blue-700">
                    RWF {indirectCostsBreakdown.totalAmount.toLocaleString()} ÷ {indirectCostsBreakdown.totalMeals.toLocaleString()} meals
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Client-side aggregation info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 no-print">
        <div className="flex items-start">
          <Calendar className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
          <div>
            <h4 className="text-blue-900 font-medium">Client-Side Aggregation</h4>
            <p className="text-blue-800 text-sm mt-1">
              This report uses real-time client-side aggregation. Weekly calculations: Cost/Meal (ingredients only) + Overhead (RWF {overheadPerMeal} per meal from last month) = Total CPM. 
              Totals and averages are calculated correctly from weekly data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyReport;
```